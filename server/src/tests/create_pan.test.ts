import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { pansTable } from '../db/schema';
import { type CreatePanInput } from '../schema';
import { createPan } from '../handlers/create_pan';
import { eq } from 'drizzle-orm';

// Simple test input
const testInput: CreatePanInput = {
  name: 'Test Pan A1'
};

describe('createPan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a pan', async () => {
    const result = await createPan(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Pan A1');
    expect(result.is_available).toEqual(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save pan to database', async () => {
    const result = await createPan(testInput);

    // Query using proper drizzle syntax
    const pans = await db.select()
      .from(pansTable)
      .where(eq(pansTable.id, result.id))
      .execute();

    expect(pans).toHaveLength(1);
    expect(pans[0].name).toEqual('Test Pan A1');
    expect(pans[0].is_available).toEqual(true);
    expect(pans[0].created_at).toBeInstanceOf(Date);
  });

  it('should set is_available to true by default', async () => {
    const result = await createPan(testInput);

    expect(result.is_available).toEqual(true);

    // Verify in database
    const savedPan = await db.select()
      .from(pansTable)
      .where(eq(pansTable.id, result.id))
      .execute();

    expect(savedPan[0].is_available).toEqual(true);
  });

  it('should create multiple pans with unique IDs', async () => {
    const input1: CreatePanInput = { name: 'Pan 1' };
    const input2: CreatePanInput = { name: 'Pan 2' };

    const result1 = await createPan(input1);
    const result2 = await createPan(input2);

    expect(result1.id).toBeDefined();
    expect(result2.id).toBeDefined();
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are saved in database
    const allPans = await db.select()
      .from(pansTable)
      .execute();

    expect(allPans).toHaveLength(2);
    expect(allPans.map(p => p.name)).toContain('Pan 1');
    expect(allPans.map(p => p.name)).toContain('Pan 2');
  });

  it('should handle special characters in pan names', async () => {
    const specialInput: CreatePanInput = {
      name: 'Pan-A1_Special@Test#123'
    };

    const result = await createPan(specialInput);

    expect(result.name).toEqual('Pan-A1_Special@Test#123');

    // Verify in database
    const savedPan = await db.select()
      .from(pansTable)
      .where(eq(pansTable.id, result.id))
      .execute();

    expect(savedPan[0].name).toEqual('Pan-A1_Special@Test#123');
  });
});