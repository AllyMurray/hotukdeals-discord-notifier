import { z } from "zod";

/**
 * User data from OpenAuth subject (matches functions/subjects.ts)
 */
export const User = z.object({
  id: z.string(),
  email: z.email(),
  username: z.string(),
  avatar: z.string().optional(),
});
export type User = z.infer<typeof User>;
