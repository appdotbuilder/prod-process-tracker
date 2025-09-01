import { db } from '../db';
import { pansTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type Pan } from '../schema';

export async function getAvailablePans(): Promise<Pan[]> {
  try {
    const results = await db.select()
      .from(pansTable)
      .where(eq(pansTable.is_available, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch available pans:', error);
    throw error;
  }
}