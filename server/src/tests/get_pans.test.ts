import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { pansTable } from '../db/schema';
import { getPans } from '../handlers/get_pans';

describe('getPans', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pans exist', async () => {
    const result = await getPans();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all pans when they exist', async () => {
    // Create test pans
    await db.insert(pansTable).values([
      { name: 'Pan A', is_available: true },
      { name: 'Pan B', is_available: false },
      { name: 'Pan C', is_available: true }
    ]).execute();

    const result = await getPans();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('Pan A');
    expect(result[0].is_available).toBe(true);
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);

    expect(result[1].name).toEqual('Pan B');
    expect(result[1].is_available).toBe(false);
    
    expect(result[2].name).toEqual('Pan C');
    expect(result[2].is_available).toBe(true);
  });

  it('should return pans with correct data types', async () => {
    // Create a single test pan
    await db.insert(pansTable).values({
      name: 'Test Pan',
      is_available: true
    }).execute();

    const result = await getPans();

    expect(result).toHaveLength(1);
    const pan = result[0];
    
    // Verify all field types
    expect(typeof pan.id).toBe('number');
    expect(typeof pan.name).toBe('string');
    expect(typeof pan.is_available).toBe('boolean');
    expect(pan.created_at).toBeInstanceOf(Date);
  });

  it('should handle both available and unavailable pans', async () => {
    // Create pans with different availability states
    await db.insert(pansTable).values([
      { name: 'Available Pan', is_available: true },
      { name: 'Unavailable Pan', is_available: false }
    ]).execute();

    const result = await getPans();

    expect(result).toHaveLength(2);
    
    // Find pans by name to verify availability
    const availablePan = result.find(p => p.name === 'Available Pan');
    const unavailablePan = result.find(p => p.name === 'Unavailable Pan');

    expect(availablePan?.is_available).toBe(true);
    expect(unavailablePan?.is_available).toBe(false);
  });

  it('should return pans in database insertion order', async () => {
    // Create pans in specific order
    await db.insert(pansTable).values({ name: 'First Pan', is_available: true }).execute();
    await db.insert(pansTable).values({ name: 'Second Pan', is_available: true }).execute();
    await db.insert(pansTable).values({ name: 'Third Pan', is_available: true }).execute();

    const result = await getPans();

    expect(result).toHaveLength(3);
    expect(result[0].name).toEqual('First Pan');
    expect(result[1].name).toEqual('Second Pan');
    expect(result[2].name).toEqual('Third Pan');
    
    // Verify IDs are in ascending order (auto-increment)
    expect(result[0].id).toBeLessThan(result[1].id);
    expect(result[1].id).toBeLessThan(result[2].id);
  });

  it('should handle default availability value correctly', async () => {
    // Insert pan without explicitly setting is_available (should default to true)
    await db.insert(pansTable).values({
      name: 'Default Availability Pan'
    }).execute();

    const result = await getPans();

    expect(result).toHaveLength(1);
    expect(result[0].is_available).toBe(true);
    expect(result[0].name).toEqual('Default Availability Pan');
  });
});