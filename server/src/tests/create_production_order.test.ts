import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productionOrdersTable } from '../db/schema';
import { type CreateProductionOrderInput } from '../schema';
import { createProductionOrder } from '../handlers/create_production_order';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreateProductionOrderInput = {
  order_number: 'PO-001',
  quantity: 100.5
};

describe('createProductionOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a production order', async () => {
    const result = await createProductionOrder(testInput);

    // Basic field validation
    expect(result.order_number).toEqual('PO-001');
    expect(result.quantity).toEqual(100.5);
    expect(typeof result.quantity).toBe('number');
    expect(result.location_type).toEqual('buffer');
    expect(result.phase).toBeNull();
    expect(result.buffer_name).toEqual('charging_mixing_buffer');
    expect(result.workcenter_id).toBeNull();
    expect(result.pan_id).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save production order to database', async () => {
    const result = await createProductionOrder(testInput);

    // Query using proper drizzle syntax
    const productionOrders = await db.select()
      .from(productionOrdersTable)
      .where(eq(productionOrdersTable.id, result.id))
      .execute();

    expect(productionOrders).toHaveLength(1);
    const savedOrder = productionOrders[0];
    expect(savedOrder.order_number).toEqual('PO-001');
    expect(parseFloat(savedOrder.quantity)).toEqual(100.5);
    expect(savedOrder.location_type).toEqual('buffer');
    expect(savedOrder.phase).toBeNull();
    expect(savedOrder.buffer_name).toEqual('charging_mixing_buffer');
    expect(savedOrder.workcenter_id).toBeNull();
    expect(savedOrder.pan_id).toBeNull();
    expect(savedOrder.status).toEqual('active');
    expect(savedOrder.created_at).toBeInstanceOf(Date);
    expect(savedOrder.updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple production orders with different order numbers', async () => {
    const input1: CreateProductionOrderInput = {
      order_number: 'PO-001',
      quantity: 50
    };

    const input2: CreateProductionOrderInput = {
      order_number: 'PO-002',
      quantity: 75.25
    };

    const result1 = await createProductionOrder(input1);
    const result2 = await createProductionOrder(input2);

    expect(result1.order_number).toEqual('PO-001');
    expect(result1.quantity).toEqual(50);
    expect(result2.order_number).toEqual('PO-002');
    expect(result2.quantity).toEqual(75.25);
    expect(result1.id).not.toEqual(result2.id);

    // Verify both orders are saved in database
    const allOrders = await db.select()
      .from(productionOrdersTable)
      .execute();

    expect(allOrders).toHaveLength(2);
    const orderNumbers = allOrders.map(order => order.order_number);
    expect(orderNumbers).toContain('PO-001');
    expect(orderNumbers).toContain('PO-002');
  });

  it('should handle decimal quantities correctly', async () => {
    const decimalInput: CreateProductionOrderInput = {
      order_number: 'PO-DECIMAL',
      quantity: 123.45 // Using 2 decimal places to match database scale
    };

    const result = await createProductionOrder(decimalInput);

    expect(result.quantity).toEqual(123.45);
    expect(typeof result.quantity).toBe('number');

    // Verify database storage and retrieval
    const savedOrder = await db.select()
      .from(productionOrdersTable)
      .where(eq(productionOrdersTable.id, result.id))
      .execute();

    expect(parseFloat(savedOrder[0].quantity)).toEqual(123.45);
  });

  it('should fail when order_number is duplicate', async () => {
    // Create first order
    await createProductionOrder(testInput);

    // Try to create second order with same order number
    const duplicateInput: CreateProductionOrderInput = {
      order_number: 'PO-001', // Same as first order
      quantity: 200
    };

    // Should throw error due to unique constraint
    await expect(createProductionOrder(duplicateInput)).rejects.toThrow();
  });

  it('should set default values correctly', async () => {
    const result = await createProductionOrder(testInput);

    // Check all default values are set as expected
    expect(result.location_type).toEqual('buffer');
    expect(result.phase).toBeNull();
    expect(result.buffer_name).toEqual('charging_mixing_buffer');
    expect(result.workcenter_id).toBeNull();
    expect(result.pan_id).toBeNull();
    expect(result.status).toEqual('active');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});