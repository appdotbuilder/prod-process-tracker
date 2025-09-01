import { db } from '../db';
import { workcentersTable } from '../db/schema';
import { type Workcenter, type Phase } from '../schema';
import { eq } from 'drizzle-orm';

export async function getWorkcenters(): Promise<Workcenter[]> {
  try {
    const results = await db.select()
      .from(workcentersTable)
      .execute();

    return results.map(workcenter => ({
      ...workcenter,
      capacity: workcenter.capacity // Integer columns don't need conversion
    }));
  } catch (error) {
    console.error('Failed to fetch workcenters:', error);
    throw error;
  }
}

export async function getWorkcentersByPhase(phase: Phase): Promise<Workcenter[]> {
  try {
    const results = await db.select()
      .from(workcentersTable)
      .where(eq(workcentersTable.phase, phase))
      .execute();

    return results.map(workcenter => ({
      ...workcenter,
      capacity: workcenter.capacity // Integer columns don't need conversion
    }));
  } catch (error) {
    console.error('Failed to fetch workcenters by phase:', error);
    throw error;
  }
}