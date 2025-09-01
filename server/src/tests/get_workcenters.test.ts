import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { workcentersTable } from '../db/schema';
import { type CreateWorkcenterInput } from '../schema';
import { getWorkcenters, getWorkcentersByPhase } from '../handlers/get_workcenters';
import { eq } from 'drizzle-orm';

// Test data
const testWorkcenters: CreateWorkcenterInput[] = [
  { name: 'Charging Station 1', phase: 'charging', capacity: 5 },
  { name: 'Charging Station 2', phase: 'charging', capacity: 3 },
  { name: 'Mixing Unit A', phase: 'mixing', capacity: 2 },
  { name: 'Mixing Unit B', phase: 'mixing', capacity: 4 },
  { name: 'Extruder 1', phase: 'extrusion', capacity: 1 },
  { name: 'Extruder 2', phase: 'extrusion', capacity: 2 }
];

describe('getWorkcenters', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no workcenters exist', async () => {
    const result = await getWorkcenters();
    
    expect(result).toEqual([]);
  });

  it('should return all workcenters', async () => {
    // Insert test workcenters
    for (const workcenter of testWorkcenters) {
      await db.insert(workcentersTable)
        .values(workcenter)
        .execute();
    }

    const result = await getWorkcenters();

    expect(result).toHaveLength(6);
    
    // Check that all phases are represented
    const phases = result.map(w => w.phase);
    expect(phases).toContain('charging');
    expect(phases).toContain('mixing');
    expect(phases).toContain('extrusion');
    
    // Verify specific workcenters exist
    const chargingStations = result.filter(w => w.phase === 'charging');
    expect(chargingStations).toHaveLength(2);
    expect(chargingStations[0].name).toMatch(/Charging Station/);
    expect(chargingStations[0].capacity).toBeGreaterThan(0);
    expect(typeof chargingStations[0].capacity).toBe('number');
    expect(chargingStations[0].id).toBeDefined();
    expect(chargingStations[0].created_at).toBeInstanceOf(Date);
  });

  it('should return workcenters ordered by insertion order', async () => {
    // Insert workcenters in specific order
    const orderedWorkcenters = [
      { name: 'First Workcenter', phase: 'charging' as const, capacity: 1 },
      { name: 'Second Workcenter', phase: 'mixing' as const, capacity: 2 },
      { name: 'Third Workcenter', phase: 'extrusion' as const, capacity: 3 }
    ];

    for (const workcenter of orderedWorkcenters) {
      await db.insert(workcentersTable)
        .values(workcenter)
        .execute();
    }

    const result = await getWorkcenters();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('First Workcenter');
    expect(result[1].name).toBe('Second Workcenter');
    expect(result[2].name).toBe('Third Workcenter');
  });
});

describe('getWorkcentersByPhase', () => {
  beforeEach(async () => {
    await createDB();
    
    // Insert test workcenters for all tests
    for (const workcenter of testWorkcenters) {
      await db.insert(workcentersTable)
        .values(workcenter)
        .execute();
    }
  });

  afterEach(resetDB);

  it('should return only charging workcenters', async () => {
    const result = await getWorkcentersByPhase('charging');

    expect(result).toHaveLength(2);
    result.forEach(workcenter => {
      expect(workcenter.phase).toBe('charging');
      expect(workcenter.name).toMatch(/Charging Station/);
      expect(workcenter.capacity).toBeGreaterThan(0);
      expect(typeof workcenter.capacity).toBe('number');
      expect(workcenter.id).toBeDefined();
      expect(workcenter.created_at).toBeInstanceOf(Date);
    });
  });

  it('should return only mixing workcenters', async () => {
    const result = await getWorkcentersByPhase('mixing');

    expect(result).toHaveLength(2);
    result.forEach(workcenter => {
      expect(workcenter.phase).toBe('mixing');
      expect(workcenter.name).toMatch(/Mixing Unit/);
      expect([2, 4]).toContain(workcenter.capacity);
    });
  });

  it('should return only extrusion workcenters', async () => {
    const result = await getWorkcentersByPhase('extrusion');

    expect(result).toHaveLength(2);
    result.forEach(workcenter => {
      expect(workcenter.phase).toBe('extrusion');
      expect(workcenter.name).toMatch(/Extruder/);
      expect([1, 2]).toContain(workcenter.capacity);
    });
  });

  it('should return empty array for phase with no workcenters', async () => {
    // Clear all workcenters and add only charging ones
    await db.delete(workcentersTable).execute();
    
    await db.insert(workcentersTable)
      .values({ name: 'Only Charging', phase: 'charging', capacity: 1 })
      .execute();

    const mixingResult = await getWorkcentersByPhase('mixing');
    const extrusionResult = await getWorkcentersByPhase('extrusion');

    expect(mixingResult).toEqual([]);
    expect(extrusionResult).toEqual([]);
    
    // But charging should still return results
    const chargingResult = await getWorkcentersByPhase('charging');
    expect(chargingResult).toHaveLength(1);
  });

  it('should handle all valid phases correctly', async () => {
    const validPhases = ['charging', 'mixing', 'extrusion'] as const;
    
    for (const phase of validPhases) {
      const result = await getWorkcentersByPhase(phase);
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(workcenter => {
        expect(workcenter.phase).toBe(phase);
      });
    }
  });

  it('should verify data integrity of filtered results', async () => {
    const chargingWorkcenters = await getWorkcentersByPhase('charging');
    
    // Verify against direct database query
    const dbResults = await db.select()
      .from(workcentersTable)
      .where(eq(workcentersTable.phase, 'charging'))
      .execute();

    expect(chargingWorkcenters).toHaveLength(dbResults.length);
    
    // Compare each field
    chargingWorkcenters.forEach((handlerResult, index) => {
      const dbResult = dbResults.find(db => db.id === handlerResult.id);
      expect(dbResult).toBeDefined();
      expect(handlerResult.name).toBe(dbResult!.name);
      expect(handlerResult.phase).toBe(dbResult!.phase);
      expect(handlerResult.capacity).toBe(dbResult!.capacity);
      expect(handlerResult.created_at).toEqual(dbResult!.created_at);
    });
  });
});