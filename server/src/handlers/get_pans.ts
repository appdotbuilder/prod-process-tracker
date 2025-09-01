import { db } from '../db';
import { pansTable } from '../db/schema';
import { type Pan } from '../schema';

export const getPans = async (): Promise<Pan[]> => {
  try {
    // Fetch all pans from the database
    const results = await db.select()
      .from(pansTable)
      .execute();

    // Return the results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch pans:', error);
    throw error;
  }
};