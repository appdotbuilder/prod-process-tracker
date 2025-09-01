import { z } from 'zod';

// Enums
export const phaseEnum = z.enum(['charging', 'mixing', 'extrusion']);
export const locationTypeEnum = z.enum(['phase', 'buffer']);
export const bufferNameEnum = z.enum(['charging_mixing_buffer', 'mixing_extrusion_buffer']);

export type Phase = z.infer<typeof phaseEnum>;
export type LocationType = z.infer<typeof locationTypeEnum>;
export type BufferName = z.infer<typeof bufferNameEnum>;

// Pan schema
export const panSchema = z.object({
  id: z.number(),
  name: z.string(),
  is_available: z.boolean(),
  created_at: z.coerce.date()
});

export type Pan = z.infer<typeof panSchema>;

// Workcenter schema
export const workcenterSchema = z.object({
  id: z.number(),
  name: z.string(),
  phase: phaseEnum,
  capacity: z.number().int().positive(),
  created_at: z.coerce.date()
});

export type Workcenter = z.infer<typeof workcenterSchema>;

// Production Order schema
export const productionOrderSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  location_type: locationTypeEnum,
  phase: phaseEnum.nullable(), // Null when in buffer
  buffer_name: bufferNameEnum.nullable(), // Null when in phase
  workcenter_id: z.number().nullable(), // Assigned when in phase
  pan_id: z.number().nullable(), // Assigned when entering charging phase
  quantity: z.number().positive(),
  status: z.enum(['active', 'completed', 'cancelled']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ProductionOrder = z.infer<typeof productionOrderSchema>;

// Input schemas for creating production orders
export const createProductionOrderInputSchema = z.object({
  order_number: z.string().min(1),
  quantity: z.number().positive()
});

export type CreateProductionOrderInput = z.infer<typeof createProductionOrderInputSchema>;

// Input schemas for moving production orders
export const moveProductionOrderInputSchema = z.object({
  id: z.number(),
  location_type: locationTypeEnum,
  phase: phaseEnum.nullable(),
  buffer_name: bufferNameEnum.nullable(),
  workcenter_id: z.number().nullable(),
  pan_id: z.number().nullable()
});

export type MoveProductionOrderInput = z.infer<typeof moveProductionOrderInputSchema>;

// Input schema for assigning pan to production order
export const assignPanInputSchema = z.object({
  production_order_id: z.number(),
  pan_id: z.number()
});

export type AssignPanInput = z.infer<typeof assignPanInputSchema>;

// Input schema for creating pans
export const createPanInputSchema = z.object({
  name: z.string().min(1)
});

export type CreatePanInput = z.infer<typeof createPanInputSchema>;

// Input schema for creating workcenters
export const createWorkcenterInputSchema = z.object({
  name: z.string().min(1),
  phase: phaseEnum,
  capacity: z.number().int().positive()
});

export type CreateWorkcenterInput = z.infer<typeof createWorkcenterInputSchema>;

// Production order with related data for display
export const productionOrderWithDetailsSchema = z.object({
  id: z.number(),
  order_number: z.string(),
  location_type: locationTypeEnum,
  phase: phaseEnum.nullable(),
  buffer_name: bufferNameEnum.nullable(),
  workcenter: workcenterSchema.nullable(),
  pan: panSchema.nullable(),
  quantity: z.number().positive(),
  status: z.enum(['active', 'completed', 'cancelled']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type ProductionOrderWithDetails = z.infer<typeof productionOrderWithDetailsSchema>;