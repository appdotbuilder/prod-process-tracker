import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { type ProductionOrderWithDetails } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProductionOrders(): Promise<ProductionOrderWithDetails[]> {
  try {
    // Query with left joins to include workcenter and pan data when available
    const results = await db.select()
      .from(productionOrdersTable)
      .leftJoin(workcentersTable, eq(productionOrdersTable.workcenter_id, workcentersTable.id))
      .leftJoin(pansTable, eq(productionOrdersTable.pan_id, pansTable.id))
      .execute();

    // Transform the joined results into the expected format
    return results.map(result => ({
      id: result.production_orders.id,
      order_number: result.production_orders.order_number,
      location_type: result.production_orders.location_type,
      phase: result.production_orders.phase,
      buffer_name: result.production_orders.buffer_name,
      workcenter: result.workcenters ? {
        id: result.workcenters.id,
        name: result.workcenters.name,
        phase: result.workcenters.phase,
        capacity: result.workcenters.capacity,
        created_at: result.workcenters.created_at
      } : null,
      pan: result.pans ? {
        id: result.pans.id,
        name: result.pans.name,
        is_available: result.pans.is_available,
        created_at: result.pans.created_at
      } : null,
      quantity: parseFloat(result.production_orders.quantity), // Convert numeric to number
      status: result.production_orders.status,
      created_at: result.production_orders.created_at,
      updated_at: result.production_orders.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch production orders:', error);
    throw error;
  }
}