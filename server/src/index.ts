import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createProductionOrderInputSchema,
  moveProductionOrderInputSchema,
  assignPanInputSchema,
  createPanInputSchema,
  createWorkcenterInputSchema,
  phaseEnum,
  bufferNameEnum
} from './schema';

// Import handlers
import { createProductionOrder } from './handlers/create_production_order';
import { getProductionOrders } from './handlers/get_production_orders';
import { moveProductionOrder } from './handlers/move_production_order';
import { assignPan } from './handlers/assign_pan';
import { getPans } from './handlers/get_pans';
import { getAvailablePans } from './handlers/get_available_pans';
import { createPan } from './handlers/create_pan';
import { getWorkcenters, getWorkcentersByPhase } from './handlers/get_workcenters';
import { createWorkcenter } from './handlers/create_workcenter';
import { getProductionOrdersByPhase, getProductionOrdersByBuffer } from './handlers/get_production_orders_by_location';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Production Order routes
  createProductionOrder: publicProcedure
    .input(createProductionOrderInputSchema)
    .mutation(({ input }) => createProductionOrder(input)),

  getProductionOrders: publicProcedure
    .query(() => getProductionOrders()),

  moveProductionOrder: publicProcedure
    .input(moveProductionOrderInputSchema)
    .mutation(({ input }) => moveProductionOrder(input)),

  getProductionOrdersByPhase: publicProcedure
    .input(phaseEnum)
    .query(({ input }) => getProductionOrdersByPhase(input)),

  getProductionOrdersByBuffer: publicProcedure
    .input(bufferNameEnum)
    .query(({ input }) => getProductionOrdersByBuffer(input)),

  // Pan routes
  getPans: publicProcedure
    .query(() => getPans()),

  getAvailablePans: publicProcedure
    .query(() => getAvailablePans()),

  createPan: publicProcedure
    .input(createPanInputSchema)
    .mutation(({ input }) => createPan(input)),

  assignPan: publicProcedure
    .input(assignPanInputSchema)
    .mutation(({ input }) => assignPan(input)),

  // Workcenter routes
  getWorkcenters: publicProcedure
    .query(() => getWorkcenters()),

  getWorkcentersByPhase: publicProcedure
    .input(phaseEnum)
    .query(({ input }) => getWorkcentersByPhase(input)),

  createWorkcenter: publicProcedure
    .input(createWorkcenterInputSchema)
    .mutation(({ input }) => createWorkcenter(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();