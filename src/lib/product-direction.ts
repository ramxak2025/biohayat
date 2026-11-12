import { z } from "zod";

/** Persistence/API keys; presentation labels belong to shared/catalog-directions. */
export const productDirectionSchema = z.enum(["sunna", "semya", "osnova", "sport"]);
export type ProductDirection = z.infer<typeof productDirectionSchema>;
