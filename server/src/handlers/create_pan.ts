import { type CreatePanInput, type Pan } from '../schema';

export async function createPan(input: CreatePanInput): Promise<Pan> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is creating a new pan and persisting it in the database.
    // New pans should be available by default.
    return Promise.resolve({
        id: 0, // Placeholder ID
        name: input.name,
        is_available: true,
        created_at: new Date()
    } as Pan);
}