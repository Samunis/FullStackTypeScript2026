import { z } from 'zod';


export const updateMeSchema = z
  .object({
    username: z.string().trim().min(2).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type UpdateMeInput = z.infer<typeof updateMeSchema>;
