import { db } from '../db';
import { productionOrdersTable, workcentersTable, pansTable } from '../db/schema';
import { type ProductionOrderWithDetails, type Phase, type BufferName } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getProductionOrdersByPhase(phase: Phase): Promise<ProductionOrderWithDetails[]> {
  try {
    // Query production orders in the specified phase with related workcenter and pan data
    const results = await db.select()
      .from(productionOrdersTable)
      .leftJoin(workcentersTable, eq(productionOrdersTable.workcenter_id, workcentersTable.id))
      .leftJoin(pansTable, eq(productionOrdersTable.pan_id, pansTable.id))
      .where(and(
        eq(productionOrdersTable.location_type, 'phase'),
        eq(productionOrdersTable.phase, phase)
      ))
      .execute();

    // Transform the joined results to match ProductionOrderWithDetails schema
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
    console.error('Failed to get production orders by phase:', error);
    throw error;
  }
}

export async function getProductionOrdersByBuffer(bufferName: BufferName): Promise<ProductionOrderWithDetails[]> {
  try {
    // Query production orders in the specified buffer
    // No joins needed since orders in buffers don't have workcenters or pans assigned
    const results = await db.select()
      .from(productionOrdersTable)
      .where(and(
        eq(productionOrdersTable.location_type, 'buffer'),
        eq(productionOrdersTable.buffer_name, bufferName)
      ))
      .execute();

    // Transform the results to match ProductionOrderWithDetails schema
    return results.map(result => ({
      id: result.id,
      order_number: result.order_number,
      location_type: result.location_type,
      phase: result.phase,
      buffer_name: result.buffer_name,
      workcenter: null, // Orders in buffers don't have workcenters
      pan: null, // Orders in buffers don't have pans
      quantity: parseFloat(result.quantity), // Convert numeric to number
      status: result.status,
      created_at: result.created_at,
      updated_at: result.updated_at
    }));
  } catch (error) {
    console.error('Failed to get production orders by buffer:', error);
    throw error;
  }
}