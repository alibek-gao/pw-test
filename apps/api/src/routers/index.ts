import { router } from "../trpc.js";
import { csvRouter } from "./csv.js";

export const appRouter = router({
  csv: csvRouter,
});

export type AppRouter = typeof appRouter;
