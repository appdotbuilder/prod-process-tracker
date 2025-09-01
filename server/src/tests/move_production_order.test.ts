import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { type MoveProductionOrderInput } from '../schema';
import { moveProductionOrder } from '../handlers/move_production_order';
import { eq } from 'drizzle-orm';

describe('moveProductionOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create test workcenter
    const workcenterResult = await db.insert(workcentersTable)
      .values({
        name: 'Test Workcenter',
        phase: 'charging',
        capacity: 10
      })
      .returning()
      .execute();

    // Create test pan
    const panResult = await db.insert(pansTable)
      .values({
        name: 'Test Pan',
        is_available: true
      })
      .returning()
      .execute();

    // Create test production order in charging_mixing_buffer
    const orderResult = await db.insert(productionOrdersTable)
      .values({
        order_number: 'TEST-001',
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: null,
        pan_id: null,
        quantity: '100.00',
        status: 'active'
      })
      .returning()
      .execute();

    return {
      workcenter: workcenterResult[0],
      pan: panResult[0],
      order: orderResult[0]
    };
  }

  describe('successful movements', () => {
    it('should move production order from buffer to charging phase', async () => {
      const { workcenter, pan, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: pan.id
      };

      const result = await moveProductionOrder(input);

      expect(result.id).toEqual(order.id);
      expect(result.location_type).toEqual('phase');
      expect(result.phase).toEqual('charging');
      expect(result.buffer_name).toBeNull();
      expect(result.workcenter?.id).toEqual(workcenter.id);
      expect(result.pan?.id).toEqual(pan.id);
      expect(result.quantity).toEqual(100);
      expect(typeof result.quantity).toBe('number');
      expect(result.workcenter?.name).toEqual('Test Workcenter');
      expect(result.pan?.name).toEqual('Test Pan');
      expect(result.updated_at).toBeInstanceOf(Date);
    });

    it('should move production order from phase to buffer', async () => {
      const { workcenter, pan, order } = await createTestData();

      // First move to charging phase
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'charging',
          buffer_name: null,
          workcenter_id: workcenter.id,
          pan_id: pan.id
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer', // Use correct buffer for charging phase
        workcenter_id: null,
        pan_id: null
      };

      const result = await moveProductionOrder(input);

      expect(result.location_type).toEqual('buffer');
      expect(result.phase).toBeNull();
      expect(result.buffer_name).toEqual('charging_mixing_buffer');
      expect(result.workcenter).toBeNull();
      expect(result.pan).toBeNull();
      expect(result.workcenter).toBeNull();
      expect(result.pan).toBeNull();
    });

    it('should allow forward movement one step at a time', async () => {
      const { workcenter, pan, order } = await createTestData();

      // Move to charging phase first
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'charging',
          workcenter_id: workcenter.id,
          pan_id: pan.id
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      // Create mixing workcenter
      const mixingWorkcenterResult = await db.insert(workcentersTable)
        .values({
          name: 'Mixing Workcenter',
          phase: 'mixing',
          capacity: 5
        })
        .returning()
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'mixing',
        buffer_name: null,
        workcenter_id: mixingWorkcenterResult[0].id,
        pan_id: null // Pan not required for mixing phase
      };

      const result = await moveProductionOrder(input);

      expect(result.phase).toEqual('mixing');
      expect(result.workcenter?.phase).toEqual('mixing');
      expect(result.pan).toBeNull();
    });

    it('should allow backward movement multiple steps', async () => {
      const { workcenter, pan, order } = await createTestData();

      // Set up order in extrusion phase
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'extrusion',
          workcenter_id: workcenter.id
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: pan.id
      };

      const result = await moveProductionOrder(input);

      expect(result.phase).toEqual('charging');
      expect(result.pan?.id).toEqual(pan.id);
    });
  });

  describe('validation errors', () => {
    it('should throw error when production order not found', async () => {
      const input: MoveProductionOrderInput = {
        id: 99999,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: 1,
        pan_id: 1
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/not found/i);
    });

    it('should throw error when workcenter not found', async () => {
      const { pan, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: 99999,
        pan_id: pan.id // Provide valid pan to avoid pan validation error
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/workcenter.*not found/i);
    });

    it('should throw error when pan not found', async () => {
      const { workcenter, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: 99999
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/pan.*not found/i);
    });

    it('should require workcenter when moving to phase', async () => {
      const { order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: null,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/workcenter.*required/i);
    });

    it('should require pan when entering charging phase', async () => {
      const { workcenter, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/pan.*required/i);
    });

    it('should require buffer name when moving to buffer', async () => {
      const { order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'buffer',
        phase: null,
        buffer_name: null,
        workcenter_id: null,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/buffer name.*required/i);
    });

    it('should require null buffer name when moving to phase', async () => {
      const { workcenter, pan, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: workcenter.id,
        pan_id: pan.id
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/buffer name must be null/i);
    });

    it('should require null phase when moving to buffer', async () => {
      const { order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'buffer',
        phase: 'charging',
        buffer_name: 'charging_mixing_buffer',
        workcenter_id: null,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/phase must be null/i);
    });

    it('should not allow forward movement more than one step', async () => {
      const { workcenter, pan, order } = await createTestData();

      // Set up order in charging phase
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'charging',
          workcenter_id: workcenter.id,
          pan_id: pan.id
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'extrusion', // Skipping mixing
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/cannot move more than one step forward/i);
    });

    it('should validate buffer usage based on phase transitions', async () => {
      const { order } = await createTestData();

      // Set up order in extrusion phase
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'extrusion'
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'buffer',
        phase: null,
        buffer_name: 'charging_mixing_buffer', // Wrong buffer for extrusion
        workcenter_id: null,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/charging_mixing_buffer can only be used when transitioning from charging or mixing phases/i);
    });

    it('should validate mixing_extrusion_buffer usage', async () => {
      const { order } = await createTestData();

      // Set up order in charging phase  
      await db.update(productionOrdersTable)
        .set({
          location_type: 'phase',
          phase: 'charging'
        })
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'buffer',
        phase: null,
        buffer_name: 'mixing_extrusion_buffer', // Wrong buffer for charging
        workcenter_id: null,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/mixing_extrusion_buffer can only be used when transitioning from mixing or extrusion phases/i);
    });

    it('should require phase when location_type is phase', async () => {
      const { workcenter, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: null,
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: null
      };

      await expect(moveProductionOrder(input)).rejects.toThrow(/phase must be specified/i);
    });
  });

  describe('database updates', () => {
    it('should update production order in database', async () => {
      const { workcenter, pan, order } = await createTestData();

      const input: MoveProductionOrderInput = {
        id: order.id,
        location_type: 'phase',
        phase: 'charging',
        buffer_name: null,
        workcenter_id: workcenter.id,
        pan_id: pan.id
      };

      await moveProductionOrder(input);

      // Verify database was updated
      const updatedOrders = await db.select()
        .from(productionOrdersTable)
        .where(eq(productionOrdersTable.id, order.id))
        .execute();

      expect(updatedOrders).toHaveLength(1);
      const updatedOrder = updatedOrders[0];
      expect(updatedOrder.location_type).toEqual('phase');
      expect(updatedOrder.phase).toEqual('charging');
      expect(updatedOrder.buffer_name).toBeNull();
      expect(updatedOrder.workcenter_id).toEqual(workcenter.id);
      expect(updatedOrder.pan_id).toEqual(pan.id);
      expect(updatedOrder.updated_at).toBeInstanceOf(Date);
    });
  });
});