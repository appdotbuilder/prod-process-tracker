import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { pansTable } from '../db/schema';
import { type CreatePanInput } from '../schema';
import { getAvailablePans } from '../handlers/get_available_pans';

describe('getAvailablePans', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only available pans', async () => {
    // Create test data - mix of available and unavailable pans
    await db.insert(pansTable).values([
      { name: 'Available Pan 1', is_available: true },
      { name: 'Available Pan 2', is_available: true },
      { name: 'Unavailable Pan', is_available: false },
      { name: 'Available Pan 3', is_available: true }
    ]).execute();

    const result = await getAvailablePans();

    // Should return only the 3 available pans
    expect(result).toHaveLength(3);
    
    // All returned pans should be available
    result.forEach(pan => {
      expect(pan.is_available).toBe(true);
    });

    // Check specific pan names are included
    const panNames = result.map(p => p.name);
    expect(panNames).toContain('Available Pan 1');
    expect(panNames).toContain('Available Pan 2');
    expect(panNames).toContain('Available Pan 3');
    expect(panNames).not.toContain('Unavailable Pan');
  });

  it('should return empty array when no available pans exist', async () => {
    // Create only unavailable pans
    await db.insert(pansTable).values([
      { name: 'Unavailable Pan 1', is_available: false },
      { name: 'Unavailable Pan 2', is_available: false }
    ]).execute();

    const result = await getAvailablePans();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no pans exist', async () => {
    // No pans in database
    const result = await getAvailablePans();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return all pans when all are available', async () => {
    // Create only available pans
    await db.insert(pansTable).values([
      { name: 'Pan A', is_available: true },
      { name: 'Pan B', is_available: true },
      { name: 'Pan C', is_available: true }
    ]).execute();

    const result = await getAvailablePans();

    expect(result).toHaveLength(3);
    result.forEach(pan => {
      expect(pan.is_available).toBe(true);
    });
  });

  it('should return pans with correct schema structure', async () => {
    await db.insert(pansTable).values({
      name: 'Test Pan',
      is_available: true
    }).execute();

    const result = await getAvailablePans();

    expect(result).toHaveLength(1);
    const pan = result[0];

    // Validate all required fields exist with correct types
    expect(typeof pan.id).toBe('number');
    expect(typeof pan.name).toBe('string');
    expect(typeof pan.is_available).toBe('boolean');
    expect(pan.created_at).toBeInstanceOf(Date);

    // Validate specific values
    expect(pan.name).toBe('Test Pan');
    expect(pan.is_available).toBe(true);
    expect(pan.id).toBeGreaterThan(0);
  });

  it('should handle large number of available pans', async () => {
    // Create many pans to test performance and correctness
    const panData = Array.from({ length: 50 }, (_, i) => ({
      name: `Pan ${i + 1}`,
      is_available: i % 3 !== 0 // Make roughly 2/3 of pans available
    }));

    await db.insert(pansTable).values(panData).execute();

    const result = await getAvailablePans();

    // Should return only available pans
    const expectedAvailableCount = panData.filter(p => p.is_available).length;
    expect(result).toHaveLength(expectedAvailableCount);
    
    // All returned pans should be available
    result.forEach(pan => {
      expect(pan.is_available).toBe(true);
    });

    // Should be ordered by database default (usually by ID)
    expect(result.length).toBeGreaterThan(0);
  });
});