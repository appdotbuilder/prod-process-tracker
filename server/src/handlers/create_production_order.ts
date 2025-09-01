import { db } from '../db';
import { productionOrdersTable } from '../db/schema';
import { type CreateProductionOrderInput, type ProductionOrder } from '../schema';

export const createProductionOrder = async (input: CreateProductionOrderInput): Promise<ProductionOrder> => {
  try {
    // Insert production order record
    const result = await db.insert(productionOrdersTable)
      .values({
        order_number: input.order_number,
        location_type: 'buffer', // Default to buffer
        phase: null, // Null when in buffer
        buffer_name: 'charging_mixing_buffer', // Start in first buffer
        workcenter_id: null, // Not assigned to workcenter initially
        pan_id: null, // Not assigned to pan initially
        quantity: input.quantity.toString(), // Convert number to string for numeric column
        status: 'active' // Default status
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const productionOrder = result[0];
    return {
      ...productionOrder,
      quantity: parseFloat(productionOrder.quantity) // Convert string back to number
    };
  } catch (error) {
    console.error('Production order creation failed:', error);
    throw error;
  }
};