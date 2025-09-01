import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { workcentersTable } from '../db/schema';
import { type CreateWorkcenterInput } from '../schema';
import { createWorkcenter } from '../handlers/create_workcenter';
import { eq } from 'drizzle-orm';

// Test inputs for different phases
const chargingWorkcenterInput: CreateWorkcenterInput = {
  name: 'Charging Station 1',
  phase: 'charging',
  capacity: 5
};

const mixingWorkcenterInput: CreateWorkcenterInput = {
  name: 'Mixing Unit A',
  phase: 'mixing',
  capacity: 3
};

const extrusionWorkcenterInput: CreateWorkcenterInput = {
  name: 'Extruder X1',
  phase: 'extrusion',
  capacity: 2
};

describe('createWorkcenter', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a charging workcenter', async () => {
    const result = await createWorkcenter(chargingWorkcenterInput);

    // Basic field validation
    expect(result.name).toEqual('Charging Station 1');
    expect(result.phase).toEqual('charging');
    expect(result.capacity).toEqual(5);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a mixing workcenter', async () => {
    const result = await createWorkcenter(mixingWorkcenterInput);

    expect(result.name).toEqual('Mixing Unit A');
    expect(result.phase).toEqual('mixing');
    expect(result.capacity).toEqual(3);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an extrusion workcenter', async () => {
    const result = await createWorkcenter(extrusionWorkcenterInput);

    expect(result.name).toEqual('Extruder X1');
    expect(result.phase).toEqual('extrusion');
    expect(result.capacity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save workcenter to database', async () => {
    const result = await createWorkcenter(chargingWorkcenterInput);

    // Query using proper drizzle syntax
    const workcenters = await db.select()
      .from(workcentersTable)
      .where(eq(workcentersTable.id, result.id))
      .execute();

    expect(workcenters).toHaveLength(1);
    expect(workcenters[0].name).toEqual('Charging Station 1');
    expect(workcenters[0].phase).toEqual('charging');
    expect(workcenters[0].capacity).toEqual(5);
    expect(workcenters[0].created_at).toBeInstanceOf(Date);
  });

  it('should create multiple workcenters with unique IDs', async () => {
    const result1 = await createWorkcenter(chargingWorkcenterInput);
    const result2 = await createWorkcenter(mixingWorkcenterInput);
    const result3 = await createWorkcenter(extrusionWorkcenterInput);

    // Each should have unique ID
    expect(result1.id).not.toEqual(result2.id);
    expect(result2.id).not.toEqual(result3.id);
    expect(result1.id).not.toEqual(result3.id);

    // Verify all are saved in database
    const allWorkcenters = await db.select()
      .from(workcentersTable)
      .execute();

    expect(allWorkcenters).toHaveLength(3);
    
    // Check that all phases are represented
    const phases = allWorkcenters.map(wc => wc.phase);
    expect(phases).toContain('charging');
    expect(phases).toContain('mixing');
    expect(phases).toContain('extrusion');
  });

  it('should handle workcenters with high capacity', async () => {
    const highCapacityInput: CreateWorkcenterInput = {
      name: 'High Volume Mixer',
      phase: 'mixing',
      capacity: 100
    };

    const result = await createWorkcenter(highCapacityInput);

    expect(result.capacity).toEqual(100);
    expect(result.name).toEqual('High Volume Mixer');
    expect(result.phase).toEqual('mixing');
  });

  it('should create workcenters with same phase but different names', async () => {
    const mixer1Input: CreateWorkcenterInput = {
      name: 'Mixer Alpha',
      phase: 'mixing',
      capacity: 4
    };

    const mixer2Input: CreateWorkcenterInput = {
      name: 'Mixer Beta',
      phase: 'mixing',
      capacity: 6
    };

    const result1 = await createWorkcenter(mixer1Input);
    const result2 = await createWorkcenter(mixer2Input);

    expect(result1.phase).toEqual('mixing');
    expect(result2.phase).toEqual('mixing');
    expect(result1.name).toEqual('Mixer Alpha');
    expect(result2.name).toEqual('Mixer Beta');
    expect(result1.id).not.toEqual(result2.id);

    // Verify both are in database
    const mixingWorkcenters = await db.select()
      .from(workcentersTable)
      .where(eq(workcentersTable.phase, 'mixing'))
      .execute();

    expect(mixingWorkcenters).toHaveLength(2);
  });
});