import { db } from '../db';
import { workcentersTable } from '../db/schema';
import { type CreateWorkcenterInput, type Workcenter } from '../schema';

export const createWorkcenter = async (input: CreateWorkcenterInput): Promise<Workcenter> => {
  try {
    // Insert workcenter record
    const result = await db.insert(workcentersTable)
      .values({
        name: input.name,
        phase: input.phase,
        capacity: input.capacity
      })
      .returning()
      .execute();

    const workcenter = result[0];
    return workcenter;
  } catch (error) {
    console.error('Workcenter creation failed:', error);
    throw error;
  }
};