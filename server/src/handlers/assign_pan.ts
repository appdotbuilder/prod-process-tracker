import { db } from '../db';
import { productionOrdersTable, pansTable, workcentersTable } from '../db/schema';
import { type AssignPanInput, type ProductionOrderWithDetails } from '../schema';
import { eq, and } from 'drizzle-orm';

export const assignPan = async (input: AssignPanInput): Promise<ProductionOrderWithDetails> => {
  try {
    // First, verify the production order exists
    const productionOrders = await db.select()
      .from(productionOrdersTable)
      .where(eq(productionOrdersTable.id, input.production_order_id))
      .execute();

    if (productionOrders.length === 0) {
      throw new Error(`Production order with id ${input.production_order_id} not found`);
    }

    // Verify the pan exists and is available
    const pans = await db.select()
      .from(pansTable)
      .where(
        and(
          eq(pansTable.id, input.pan_id),
          eq(pansTable.is_available, true)
        )
      )
      .execute();

    if (pans.length === 0) {
      throw new Error(`Pan with id ${input.pan_id} not found or not available`);
    }

    // Update the production order to assign the pan
    const updatedProductionOrders = await db.update(productionOrdersTable)
      .set({
        pan_id: input.pan_id,
        updated_at: new Date()
      })
      .where(eq(productionOrdersTable.id, input.production_order_id))
      .returning()
      .execute();

    // Update the pan to mark it as unavailable
    await db.update(pansTable)
      .set({ is_available: false })
      .where(eq(pansTable.id, input.pan_id))
      .execute();

    // Get the updated production order with all related data
    const results = await db.select()
      .from(productionOrdersTable)
      .leftJoin(workcentersTable, eq(productionOrdersTable.workcenter_id, workcentersTable.id))
      .leftJoin(pansTable, eq(productionOrdersTable.pan_id, pansTable.id))
      .where(eq(productionOrdersTable.id, input.production_order_id))
      .execute();

    const result = results[0];
    const productionOrderData = result.production_orders;
    const workcenterData = result.workcenters;
    const panData = result.pans;

    return {
      id: productionOrderData.id,
      order_number: productionOrderData.order_number,
      location_type: productionOrderData.location_type,
      phase: productionOrderData.phase,
      buffer_name: productionOrderData.buffer_name,
      workcenter: workcenterData ? {
        id: workcenterData.id,
        name: workcenterData.name,
        phase: workcenterData.phase,
        capacity: workcenterData.capacity,
        created_at: workcenterData.created_at
      } : null,
      pan: panData ? {
        id: panData.id,
        name: panData.name,
        is_available: panData.is_available,
        created_at: panData.created_at
      } : null,
      quantity: parseFloat(productionOrderData.quantity), // Convert numeric to number
      status: productionOrderData.status,
      created_at: productionOrderData.created_at,
      updated_at: productionOrderData.updated_at
    };
  } catch (error) {
    console.error('Pan assignment failed:', error);
    throw error;
  }
};