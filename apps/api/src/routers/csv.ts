import { uploadConfig } from "../config.js";
import { publicProcedure, router } from "../trpc.js";

export const csvRouter = router({
  config: publicProcedure.query(() => uploadConfig),
});
