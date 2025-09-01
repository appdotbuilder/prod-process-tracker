import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { getProductionOrdersByPhase, getProductionOrdersByBuffer } from '../handlers/get_production_orders_by_location';

describe('getProductionOrdersByLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  describe('getProductionOrdersByPhase', () => {
    it('should return production orders in charging phase with related data', async () => {
      // Create a workcenter
      const [workcenter] = await db.insert(workcentersTable)
        .values({
          name: 'Charging Station 1',
          phase: 'charging',
          capacity: 5
        })
        .returning()
        .execute();

      // Create a pan
      const [pan] = await db.insert(pansTable)
        .values({
          name: 'Pan A1',
          is_available: false
        })
        .returning()
        .execute();

      // Create production orders in charging phase
      const [order1] = await db.insert(productionOrdersTable)
        .values({
          order_number: 'PO-001',
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: workcenter.id,
          pan_id: pan.id,
          quantity: '100.50',
          status: 'active'
        })
        .returning()
        .execute();

      const [order2] = await db.insert(productionOrdersTable)
        .values({
          order_number: 'PO-002',
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: workcenter.id,
          pan_id: null, // No pan assigned yet
          quantity: '75.25',
          status: 'active'
        })
        .returning()
        .execute();

      // Create an order in different phase (should not be returned)
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'PO-003',
          location_type: 'phase',
          phase: 'mixing',
          buffer_name: null,
          workcenter_id: null,
          pan_id: null,
          quantity: '50.00',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByPhase('charging');

      expect(results).toHaveLength(2);

      // Check first order with all related data
      const result1 = results.find(r => r.order_number === 'PO-001');
      expect(result1).toBeDefined();
      expect(result1!.id).toEqual(order1.id);
      expect(result1!.location_type).toEqual('phase');
      expect(result1!.phase).toEqual('charging');
      expect(result1!.buffer_name).toBeNull();
      expect(result1!.quantity).toEqual(100.50);
      expect(typeof result1!.quantity).toEqual('number');
      expect(result1!.status).toEqual('active');

      // Check workcenter data
      expect(result1!.workcenter).toBeDefined();
      expect(result1!.workcenter!.id).toEqual(workcenter.id);
      expect(result1!.workcenter!.name).toEqual('Charging Station 1');
      expect(result1!.workcenter!.phase).toEqual('charging');
      expect(result1!.workcenter!.capacity).toEqual(5);

      // Check pan data
      expect(result1!.pan).toBeDefined();
      expect(result1!.pan!.id).toEqual(pan.id);
      expect(result1!.pan!.name).toEqual('Pan A1');
      expect(result1!.pan!.is_available).toEqual(false);

      // Check second order without pan
      const result2 = results.find(r => r.order_number === 'PO-002');
      expect(result2).toBeDefined();
      expect(result2!.id).toEqual(order2.id);
      expect(result2!.quantity).toEqual(75.25);
      expect(result2!.workcenter).toBeDefined();
      expect(result2!.pan).toBeNull(); // No pan assigned
    });

    it('should return production orders in mixing phase', async () => {
      // Create workcenter for mixing
      const [workcenter] = await db.insert(workcentersTable)
        .values({
          name: 'Mixing Unit 1',
          phase: 'mixing',
          capacity: 3
        })
        .returning()
        .execute();

      // Create production order in mixing phase
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'MX-001',
          location_type: 'phase',
          phase: 'mixing',
          buffer_name: null,
          workcenter_id: workcenter.id,
          pan_id: null,
          quantity: '200.75',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByPhase('mixing');

      expect(results).toHaveLength(1);
      expect(results[0].phase).toEqual('mixing');
      expect(results[0].quantity).toEqual(200.75);
      expect(results[0].workcenter!.name).toEqual('Mixing Unit 1');
    });

    it('should return production orders in extrusion phase', async () => {
      // Create workcenter for extrusion
      const [workcenter] = await db.insert(workcentersTable)
        .values({
          name: 'Extruder 1',
          phase: 'extrusion',
          capacity: 2
        })
        .returning()
        .execute();

      // Create production order in extrusion phase
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'EX-001',
          location_type: 'phase',
          phase: 'extrusion',
          buffer_name: null,
          workcenter_id: workcenter.id,
          pan_id: null,
          quantity: '150.00',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByPhase('extrusion');

      expect(results).toHaveLength(1);
      expect(results[0].phase).toEqual('extrusion');
      expect(results[0].quantity).toEqual(150.00);
      expect(results[0].workcenter!.name).toEqual('Extruder 1');
    });

    it('should return empty array when no orders in specified phase', async () => {
      // Create an order in buffer instead of phase
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'BUF-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '100.00',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByPhase('charging');

      expect(results).toHaveLength(0);
    });

    it('should handle orders without workcenter or pan assignments', async () => {
      // Create production order without workcenter/pan assignments
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'NO-WC-001',
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: null,
          pan_id: null,
          quantity: '99.99',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByPhase('charging');

      expect(results).toHaveLength(1);
      expect(results[0].workcenter).toBeNull();
      expect(results[0].pan).toBeNull();
      expect(results[0].quantity).toEqual(99.99);
    });
  });

  describe('getProductionOrdersByBuffer', () => {
    it('should return production orders in charging_mixing_buffer', async () => {
      // Create production orders in charging_mixing_buffer
      const [order1] = await db.insert(productionOrdersTable)
        .values({
          order_number: 'BUF-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '120.50',
          status: 'active'
        })
        .returning()
        .execute();

      const [order2] = await db.insert(productionOrdersTable)
        .values({
          order_number: 'BUF-002',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '85.25',
          status: 'active'
        })
        .returning()
        .execute();

      // Create an order in different buffer (should not be returned)
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'BUF-003',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'mixing_extrusion_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '60.00',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByBuffer('charging_mixing_buffer');

      expect(results).toHaveLength(2);

      // Check first order
      const result1 = results.find(r => r.order_number === 'BUF-001');
      expect(result1).toBeDefined();
      expect(result1!.id).toEqual(order1.id);
      expect(result1!.location_type).toEqual('buffer');
      expect(result1!.phase).toBeNull();
      expect(result1!.buffer_name).toEqual('charging_mixing_buffer');
      expect(result1!.workcenter).toBeNull();
      expect(result1!.pan).toBeNull();
      expect(result1!.quantity).toEqual(120.50);
      expect(typeof result1!.quantity).toEqual('number');
      expect(result1!.status).toEqual('active');

      // Check second order
      const result2 = results.find(r => r.order_number === 'BUF-002');
      expect(result2).toBeDefined();
      expect(result2!.id).toEqual(order2.id);
      expect(result2!.quantity).toEqual(85.25);
    });

    it('should return production orders in mixing_extrusion_buffer', async () => {
      // Create production order in mixing_extrusion_buffer
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'MX-BUF-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'mixing_extrusion_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '95.75',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByBuffer('mixing_extrusion_buffer');

      expect(results).toHaveLength(1);
      expect(results[0].buffer_name).toEqual('mixing_extrusion_buffer');
      expect(results[0].quantity).toEqual(95.75);
      expect(results[0].workcenter).toBeNull();
      expect(results[0].pan).toBeNull();
    });

    it('should return empty array when no orders in specified buffer', async () => {
      // Create an order in phase instead of buffer
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'PHASE-001',
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: null,
          pan_id: null,
          quantity: '100.00',
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByBuffer('charging_mixing_buffer');

      expect(results).toHaveLength(0);
    });

    it('should handle orders with different statuses', async () => {
      // Create orders with different statuses
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'COMPLETED-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '100.00',
          status: 'completed'
        })
        .execute();

      await db.insert(productionOrdersTable)
        .values({
          order_number: 'CANCELLED-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '50.00',
          status: 'cancelled'
        })
        .execute();

      const results = await getProductionOrdersByBuffer('charging_mixing_buffer');

      expect(results).toHaveLength(2);
      expect(results.map(r => r.status)).toContain('completed');
      expect(results.map(r => r.status)).toContain('cancelled');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle numeric precision correctly', async () => {
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'PRECISION-001',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'charging_mixing_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '123.45', // Value within precision 10, scale 2
          status: 'active'
        })
        .execute();

      const results = await getProductionOrdersByBuffer('charging_mixing_buffer');

      expect(results).toHaveLength(1);
      expect(results[0].quantity).toEqual(123.45);
      expect(typeof results[0].quantity).toEqual('number');
    });

    it('should preserve timestamps correctly', async () => {
      const beforeInsert = new Date();
      
      await db.insert(productionOrdersTable)
        .values({
          order_number: 'TIME-001',
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: null,
          pan_id: null,
          quantity: '100.00',
          status: 'active'
        })
        .execute();

      const afterInsert = new Date();
      
      const results = await getProductionOrdersByPhase('charging');

      expect(results).toHaveLength(1);
      expect(results[0].created_at).toBeInstanceOf(Date);
      expect(results[0].updated_at).toBeInstanceOf(Date);
      expect(results[0].created_at.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime());
      expect(results[0].created_at.getTime()).toBeLessThanOrEqual(afterInsert.getTime());
    });
  });
});