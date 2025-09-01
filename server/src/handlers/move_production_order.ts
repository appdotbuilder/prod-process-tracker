import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { type MoveProductionOrderInput, type ProductionOrderWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

// Define the order of phases for movement validation
const PHASE_ORDER = ['charging', 'mixing', 'extrusion'] as const;
const PHASE_TO_INDEX = { charging: 0, mixing: 1, extrusion: 2 };

export async function moveProductionOrder(input: MoveProductionOrderInput): Promise<ProductionOrderWithDetails> {
  try {
    // First, get the current production order
    const currentOrderResult = await db.select()
      .from(productionOrdersTable)
      .where(eq(productionOrdersTable.id, input.id))
      .execute();

    if (currentOrderResult.length === 0) {
      throw new Error(`Production order with id ${input.id} not found`);
    }

    const currentOrder = currentOrderResult[0];

    // Validate movement rules
    await validateMovement(currentOrder, input);

    // Validate foreign key constraints
    if (input.workcenter_id) {
      const workcenterExists = await db.select()
        .from(workcentersTable)
        .where(eq(workcentersTable.id, input.workcenter_id))
        .execute();
      
      if (workcenterExists.length === 0) {
        throw new Error(`Workcenter with id ${input.workcenter_id} not found`);
      }
    }

    if (input.pan_id) {
      const panExists = await db.select()
        .from(pansTable)
        .where(eq(pansTable.id, input.pan_id))
        .execute();
      
      if (panExists.length === 0) {
        throw new Error(`Pan with id ${input.pan_id} not found`);
      }
    }

    // Update the production order
    const updatedResult = await db.update(productionOrdersTable)
      .set({
        location_type: input.location_type,
        phase: input.phase,
        buffer_name: input.buffer_name,
        workcenter_id: input.workcenter_id,
        pan_id: input.pan_id,
        updated_at: new Date()
      })
      .where(eq(productionOrdersTable.id, input.id))
      .returning()
      .execute();

    const updatedOrder = updatedResult[0];

    // Fetch the complete record with related data
    const result = await db.select({
      id: productionOrdersTable.id,
      order_number: productionOrdersTable.order_number,
      location_type: productionOrdersTable.location_type,
      phase: productionOrdersTable.phase,
      buffer_name: productionOrdersTable.buffer_name,
      workcenter_id: productionOrdersTable.workcenter_id,
      pan_id: productionOrdersTable.pan_id,
      quantity: productionOrdersTable.quantity,
      status: productionOrdersTable.status,
      created_at: productionOrdersTable.created_at,
      updated_at: productionOrdersTable.updated_at,
      workcenter: workcentersTable,
      pan: pansTable
    })
    .from(productionOrdersTable)
    .leftJoin(workcentersTable, eq(productionOrdersTable.workcenter_id, workcentersTable.id))
    .leftJoin(pansTable, eq(productionOrdersTable.pan_id, pansTable.id))
    .where(eq(productionOrdersTable.id, input.id))
    .execute();

    const orderWithDetails = result[0];

    return {
      id: orderWithDetails.id,
      order_number: orderWithDetails.order_number,
      location_type: orderWithDetails.location_type,
      phase: orderWithDetails.phase,
      buffer_name: orderWithDetails.buffer_name,
      workcenter: orderWithDetails.workcenter,
      pan: orderWithDetails.pan,
      quantity: parseFloat(orderWithDetails.quantity), // Convert numeric to number
      status: orderWithDetails.status,
      created_at: orderWithDetails.created_at,
      updated_at: orderWithDetails.updated_at
    } as ProductionOrderWithDetails;
  } catch (error) {
    console.error('Move production order failed:', error);
    throw error;
  }
}

async function validateMovement(
  currentOrder: typeof productionOrdersTable.$inferSelect,
  input: MoveProductionOrderInput
): Promise<void> {
  // Business rule validations
  if (input.location_type === 'phase') {
    // Moving to a phase requires workcenter assignment
    if (!input.workcenter_id) {
      throw new Error('Workcenter assignment is required when moving to a phase');
    }

    // Moving to charging phase requires pan assignment
    if (input.phase === 'charging' && !input.pan_id) {
      throw new Error('Pan assignment is required when entering charging phase');
    }

    // Buffer name should be null when in phase
    if (input.buffer_name !== null) {
      throw new Error('Buffer name must be null when moving to a phase');
    }

    // Phase must be specified when location_type is 'phase'
    if (!input.phase) {
      throw new Error('Phase must be specified when moving to a phase');
    }
  } else if (input.location_type === 'buffer') {
    // Moving to a buffer requires buffer name
    if (!input.buffer_name) {
      throw new Error('Buffer name is required when moving to a buffer');
    }

    // Phase, workcenter, and pan should be null when in buffer
    if (input.phase !== null) {
      throw new Error('Phase must be null when moving to a buffer');
    }
    if (input.workcenter_id !== null) {
      throw new Error('Workcenter assignment must be null when moving to a buffer');
    }
    if (input.pan_id !== null) {
      throw new Error('Pan assignment must be null when moving to a buffer');
    }
  }

  // Validate phase progression rules
  if (currentOrder.phase && input.phase) {
    const currentPhaseIndex = PHASE_TO_INDEX[currentOrder.phase];
    const targetPhaseIndex = PHASE_TO_INDEX[input.phase];

    // Only allow one step forward at a time
    if (targetPhaseIndex > currentPhaseIndex && targetPhaseIndex !== currentPhaseIndex + 1) {
      throw new Error(`Cannot move more than one step forward. Current phase: ${currentOrder.phase}, target phase: ${input.phase}`);
    }
  }

  // Validate buffer transitions based on current phase
  if (input.buffer_name) {
    if (input.buffer_name === 'charging_mixing_buffer') {
      // This buffer is between charging and mixing phases
      if (currentOrder.phase && !['charging', 'mixing'].includes(currentOrder.phase)) {
        throw new Error('charging_mixing_buffer can only be used when transitioning from charging or mixing phases');
      }
    } else if (input.buffer_name === 'mixing_extrusion_buffer') {
      // This buffer is between mixing and extrusion phases  
      if (currentOrder.phase && !['mixing', 'extrusion'].includes(currentOrder.phase)) {
        throw new Error('mixing_extrusion_buffer can only be used when transitioning from mixing or extrusion phases');
      }
    }
  }
}