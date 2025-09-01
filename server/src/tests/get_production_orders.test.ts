import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { getProductionOrders } from '../handlers/get_production_orders';

describe('getProductionOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no production orders exist', async () => {
    const result = await getProductionOrders();
    
    expect(result).toEqual([]);
  });

  it('should return production order without workcenter and pan', async () => {
    // Create a production order in buffer (no workcenter or pan)
    const insertResult = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-001',
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: null,
        pan_id: null,
        quantity: '100.50',
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getProductionOrders();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: insertResult[0].id,
      order_number: 'PO-001',
      location_type: 'buffer',
      phase: null,
      buffer_name: 'charging_mixing_buffer',
      workcenter: null,
      pan: null,
      quantity: 100.50, // Should be converted to number
      status: 'active',
      created_at: insertResult[0].created_at,
      updated_at: insertResult[0].updated_at
    });
    expect(typeof result[0].quantity).toBe('number');
  });

  it('should return production order with workcenter but no pan', async () => {
    // Create a workcenter first
    const workcenterResult = await db.insert(workcentersTable)
      .values({
        name: 'Charging Station 1',
        phase: 'charging',
        capacity: 5
      })
      .returning()
      .execute();

    // Create a production order in charging phase with workcenter
    const orderResult = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-002',
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenterResult[0].id,
        pan_id: null,
        quantity: '250.75',
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getProductionOrders();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: orderResult[0].id,
      order_number: 'PO-002',
      location_type: 'phase',
      phase: 'charging',
      buffer_name: null,
      workcenter: {
        id: workcenterResult[0].id,
        name: 'Charging Station 1',
        phase: 'charging',
        capacity: 5,
        created_at: workcenterResult[0].created_at
      },
      pan: null,
      quantity: 250.75, // Should be converted to number
      status: 'active',
      created_at: orderResult[0].created_at,
      updated_at: orderResult[0].updated_at
    });
  });

  it('should return production order with both workcenter and pan', async () => {
    // Create workcenter and pan first
    const workcenterResult = await db.insert(workcentersTable)
      .values({
        name: 'Mixing Station 1',
        phase: 'mixing',
        capacity: 3
      })
      .returning()
      .execute();

    const panResult = await db.insert(pansTable)
      .values({
        name: 'Pan-A1',
        is_available: false
      })
      .returning()
      .execute();

    // Create a production order with both workcenter and pan
    const orderResult = await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-003',
        location_type: 'phase',
        phase: 'mixing',
        buffer_name: null,
        workcenter_id: workcenterResult[0].id,
        pan_id: panResult[0].id,
        quantity: '500.00',
        status: 'active'
      })
      .returning()
      .execute();

    const result = await getProductionOrders();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: orderResult[0].id,
      order_number: 'PO-003',
      location_type: 'phase',
      phase: 'mixing',
      buffer_name: null,
      workcenter: {
        id: workcenterResult[0].id,
        name: 'Mixing Station 1',
        phase: 'mixing',
        capacity: 3,
        created_at: workcenterResult[0].created_at
      },
      pan: {
        id: panResult[0].id,
        name: 'Pan-A1',
        is_available: false,
        created_at: panResult[0].created_at
      },
      quantity: 500.00, // Should be converted to number
      status: 'active',
      created_at: orderResult[0].created_at,
      updated_at: orderResult[0].updated_at
    });
  });

  it('should return multiple production orders with mixed configurations', async () => {
    // Create prerequisite data
    const workcenterResult = await db.insert(workcentersTable)
      .values({
        name: 'Extrusion Line 1',
        phase: 'extrusion',
        capacity: 2
      })
      .returning()
      .execute();

    const panResult = await db.insert(pansTable)
      .values({
        name: 'Pan-B2',
        is_available: true
      })
      .returning()
      .execute();

    // Create multiple production orders with different configurations
    await db.insert(productionOrdersTable)
      .values([
        {
          order_number: 'PO-004',
          location_type: 'buffer',
          phase: null,
          buffer_name: 'mixing_extrusion_buffer',
          workcenter_id: null,
          pan_id: null,
          quantity: '75.25',
          status: 'active'
        },
        {
          order_number: 'PO-005',
          location_type: 'phase',
          phase: 'extrusion',
          buffer_name: null,
          workcenter_id: workcenterResult[0].id,
          pan_id: panResult[0].id,
          quantity: '150.50',
          status: 'completed'
        },
        {
          order_number: 'PO-006',
          location_type: 'phase',
          phase: 'extrusion',
          buffer_name: null,
          workcenter_id: workcenterResult[0].id,
          pan_id: null,
          quantity: '300.00',
          status: 'cancelled'
        }
      ])
      .execute();

    const result = await getProductionOrders();

    expect(result).toHaveLength(3);
    
    // Check first order (buffer - no workcenter or pan)
    const bufferOrder = result.find(order => order.order_number === 'PO-004');
    expect(bufferOrder).toBeDefined();
    expect(bufferOrder!.location_type).toBe('buffer');
    expect(bufferOrder!.workcenter).toBeNull();
    expect(bufferOrder!.pan).toBeNull();
    expect(bufferOrder!.quantity).toBe(75.25);

    // Check second order (phase with both workcenter and pan)
    const completedOrder = result.find(order => order.order_number === 'PO-005');
    expect(completedOrder).toBeDefined();
    expect(completedOrder!.location_type).toBe('phase');
    expect(completedOrder!.workcenter).toBeDefined();
    expect(completedOrder!.pan).toBeDefined();
    expect(completedOrder!.status).toBe('completed');
    expect(completedOrder!.quantity).toBe(150.50);

    // Check third order (phase with workcenter but no pan)
    const cancelledOrder = result.find(order => order.order_number === 'PO-006');
    expect(cancelledOrder).toBeDefined();
    expect(cancelledOrder!.location_type).toBe('phase');
    expect(cancelledOrder!.workcenter).toBeDefined();
    expect(cancelledOrder!.pan).toBeNull();
    expect(cancelledOrder!.status).toBe('cancelled');
    expect(cancelledOrder!.quantity).toBe(300.00);
  });

  it('should handle decimal quantities correctly', async () => {
    // Create production order with precise decimal quantity
    await db.insert(productionOrdersTable)
      .values({
        order_number: 'PO-007',
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: null,
        pan_id: null,
        quantity: '123.45', // Precise decimal
        status: 'active'
      })
      .execute();

    const result = await getProductionOrders();

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(123.45);
    expect(typeof result[0].quantity).toBe('number');
  });
});