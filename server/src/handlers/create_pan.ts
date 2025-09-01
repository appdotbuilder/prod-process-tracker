import { db } from '../db';
import { pansTable } from '../db/schema';
import { type CreatePanInput, type Pan } from '../schema';

export const createPan = async (input: CreatePanInput): Promise<Pan> => {
  try {
    // Insert pan record
    const result = await db.insert(pansTable)
      .values({
        name: input.name,
        is_available: true // New pans are available by default
      })
      .returning()
      .execute();

    // Return the created pan
    const pan = result[0];
    return pan;
  } catch (error) {
    console.error('Pan creation failed:', error);
    throw error;
  }
};