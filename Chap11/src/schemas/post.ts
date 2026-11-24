import { z } from 'zod';


export const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  content: z.string().max(10_000).optional(),
  published: z.boolean().optional(),
});

export const updatePostSchema = createPostSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Provide at least one field to update',
  });

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
