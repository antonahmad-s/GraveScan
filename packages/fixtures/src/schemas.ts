import { z } from "zod";
import { REJECTION_REASONS } from "./errors.ts";
import { FIXTURE_IDS } from "./ids.ts";

export const FixtureIdSchema = z.enum(FIXTURE_IDS);

export const FixtureErrorSchema = z.discriminatedUnion("code", [
  z.object({ code: z.literal("UNKNOWN_FIXTURE"), id: z.string() }),
  z.object({
    code: z.literal("PATH_REJECTED"),
    path: z.string(),
    reason: z.enum(REJECTION_REASONS),
  }),
]);
