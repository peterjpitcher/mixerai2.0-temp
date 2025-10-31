import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').optional(),
  company: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  avatarUrl: z
    .string()
    .trim()
    .url()
    .optional()
    .or(z.literal('').transform(() => null))
    .or(z.null())
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export function hasProfileUpdates(payload: UpdateProfileInput): boolean {
  return (
    payload.fullName !== undefined ||
    payload.company !== undefined ||
    payload.jobTitle !== undefined ||
    payload.avatarUrl !== undefined
  );
}
