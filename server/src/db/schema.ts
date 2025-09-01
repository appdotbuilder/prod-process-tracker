import { serial, text, pgTable, timestamp, integer, boolean, pgEnum, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const phaseEnum = pgEnum('phase', ['charging', 'mixing', 'extrusion']);
export const locationTypeEnum = pgEnum('location_type', ['phase', 'buffer']);
export const bufferNameEnum = pgEnum('buffer_name', ['charging_mixing_buffer', 'mixing_extrusion_buffer']);
export const statusEnum = pgEnum('status', ['active', 'completed', 'cancelled']);

// Pans table
export const pansTable = pgTable('pans', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  is_available: boolean('is_available').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Workcenters table
export const workcentersTable = pgTable('workcenters', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  phase: phaseEnum('phase').notNull(),
  capacity: integer('capacity').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Production Orders table
export const productionOrdersTable = pgTable('production_orders', {
  id: serial('id').primaryKey(),
  order_number: text('order_number').notNull().unique(),
  location_type: locationTypeEnum('location_type').notNull(),
  phase: phaseEnum('phase'), // Nullable when in buffer
  buffer_name: bufferNameEnum('buffer_name'), // Nullable when in phase
  workcenter_id: integer('workcenter_id'), // Foreign key to workcenters
  pan_id: integer('pan_id'), // Foreign key to pans
  quantity: numeric('quantity', { precision: 10, scale: 2 }).notNull(),
  status: statusEnum('status').notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const productionOrdersRelations = relations(productionOrdersTable, ({ one }) => ({
  workcenter: one(workcentersTable, {
    fields: [productionOrdersTable.workcenter_id],
    references: [workcentersTable.id],
  }),
  pan: one(pansTable, {
    fields: [productionOrdersTable.pan_id],
    references: [pansTable.id],
  }),
}));

export const workcentersRelations = relations(workcentersTable, ({ many }) => ({
  productionOrders: many(productionOrdersTable),
}));

export const pansRelations = relations(pansTable, ({ many }) => ({
  productionOrders: many(productionOrdersTable),
}));

// TypeScript types for the table schemas
export type Pan = typeof pansTable.$inferSelect;
export type NewPan = typeof pansTable.$inferInsert;
export type Workcenter = typeof workcentersTable.$inferSelect;
export type NewWorkcenter = typeof workcentersTable.$inferInsert;
export type ProductionOrder = typeof productionOrdersTable.$inferSelect;
export type NewProductionOrder = typeof productionOrdersTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  pans: pansTable,
  workcenters: workcentersTable,
  productionOrders: productionOrdersTable,
};