import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productionOrdersTable, pansTable, workcentersTable } from '../db/schema';
import { type AssignPanInput } from '../schema';
import { assignPan } from '../handlers/assign_pan';
import { eq } from 'drizzle-orm';

describe('assignPan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testPanId: number;
  let testProductionOrderId: number;
  let testWorkcenter: { id: number; name: string; phase: 'charging' | 'mixing' | 'extrusion'; capacity: number; created_at: Date };

  beforeEach(async () => {
    // Create test workcenter
    const workcenters = await db.insert(workcentersTable)
      .values({
        name: 'Test Charging Workcenter',
        phase: 'charging',
        capacity: 5
      })
      .returning()
      .execute();
    testWorkcenter = workcenters[0];

    // Create test pan
    const pans = await db.insert(pansTable)
      .values({
        name: 'Test Pan 001',
        is_available: true
      })
      .returning()
      .execute();
    testPanId = pans[0].id;

    // Create test production order
    const productionOrders = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-TEST-001',
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: testWorkcenter.id,
        pan_id: null,
        quantity: '100.50',
        status: 'active'
      })
      .returning()
      .execute();
    testProductionOrderId = productionOrders[0].id;
  });

  const testInput: AssignPanInput = {
    production_order_id: 0, // Will be set in beforeEach
    pan_id: 0 // Will be set in beforeEach
  };

  it('should assign an available pan to a production order', async () => {
    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = testPanId;

    const result = await assignPan(testInput);

    // Verify result structure
    expect(result.id).toEqual(testProductionOrderId);
    expect(result.order_number).toEqual('PO-TEST-001');
    expect(result.location_type).toEqual('phase');
    expect(result.phase).toEqual('charging');
    expect(result.buffer_name).toBeNull();
    expect(result.quantity).toEqual(100.50);
    expect(result.status).toEqual('active');
    expect(typeof result.quantity).toBe('number'); // Verify numeric conversion

    // Verify pan assignment
    expect(result.pan).not.toBeNull();
    expect(result.pan!.id).toEqual(testPanId);
    expect(result.pan!.name).toEqual('Test Pan 001');
    expect(result.pan!.is_available).toBe(false); // Should be marked as unavailable

    // Verify workcenter data
    expect(result.workcenter).not.toBeNull();
    expect(result.workcenter!.id).toEqual(testWorkcenter.id);
    expect(result.workcenter!.name).toEqual('Test Charging Workcenter');

    // Verify timestamps
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update production order in database', async () => {
    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = testPanId;

    await assignPan(testInput);

    // Query database to verify production order was updated
    const productionOrders = await db.select()
      .from(productionOrdersTable)
      .where(eq(productionOrdersTable.id, testProductionOrderId))
      .execute();

    expect(productionOrders).toHaveLength(1);
    expect(productionOrders[0].pan_id).toEqual(testPanId);
    expect(productionOrders[0].updated_at).toBeInstanceOf(Date);
  });

  it('should mark pan as unavailable in database', async () => {
    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = testPanId;

    await assignPan(testInput);

    // Query database to verify pan was marked as unavailable
    const pans = await db.select()
      .from(pansTable)
      .where(eq(pansTable.id, testPanId))
      .execute();

    expect(pans).toHaveLength(1);
    expect(pans[0].is_available).toBe(false);
  });

  it('should throw error when production order does not exist', async () => {
    testInput.production_order_id = 99999; // Non-existent ID
    testInput.pan_id = testPanId;

    await expect(assignPan(testInput)).rejects.toThrow(/production order with id 99999 not found/i);
  });

  it('should throw error when pan does not exist', async () => {
    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = 99999; // Non-existent ID

    await expect(assignPan(testInput)).rejects.toThrow(/pan with id 99999 not found or not available/i);
  });

  it('should throw error when pan is not available', async () => {
    // Create an unavailable pan
    const unavailablePans = await db.insert(pansTable)
      .values({
        name: 'Unavailable Pan',
        is_available: false
      })
      .returning()
      .execute();

    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = unavailablePans[0].id;

    await expect(assignPan(testInput)).rejects.toThrow(/pan with id .+ not found or not available/i);
  });

  it('should handle production order without workcenter', async () => {
    // Create production order without workcenter (in buffer)
    const bufferOrders = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-BUFFER-001',
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: null,
        pan_id: null,
        quantity: '75.25',
        status: 'active'
      })
      .returning()
      .execute();

    testInput.production_order_id = bufferOrders[0].id;
    testInput.pan_id = testPanId;

    const result = await assignPan(testInput);

    expect(result.id).toEqual(bufferOrders[0].id);
    expect(result.location_type).toEqual('buffer');
    expect(result.buffer_name).toEqual('charging_mixing_buffer');
    expect(result.workcenter).toBeNull(); // No workcenter assigned
    expect(result.pan).not.toBeNull();
    expect(result.pan!.id).toEqual(testPanId);
    expect(result.quantity).toEqual(75.25);
  });

  it('should handle concurrent pan assignment attempts gracefully', async () => {
    testInput.production_order_id = testProductionOrderId;
    testInput.pan_id = testPanId;

    // Create second production order for concurrent test
    const secondOrders = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-TEST-002',
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: testWorkcenter.id,
        pan_id: null,
        quantity: '200.00',
        status: 'active'
      })
      .returning()
      .execute();

    const secondInput: AssignPanInput = {
      production_order_id: secondOrders[0].id,
      pan_id: testPanId
    };

    // First assignment should succeed
    const firstResult = await assignPan(testInput);
    expect(firstResult.pan!.id).toEqual(testPanId);

    // Second assignment to same pan should fail
    await expect(assignPan(secondInput)).rejects.toThrow(/pan with id .+ not found or not available/i);
  });
});