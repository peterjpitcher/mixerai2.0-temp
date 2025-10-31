import { z } from 'zod';
import { createBrandSchema } from './create-brand-schema';
import { commonSchemas } from '@/lib/api/validation';

export const updateBrandSchema = createBrandSchema.extend({
  master_claim_brand_id: z.preprocess(
    (value) => {
      if (typeof value === 'string') {
        const normalized = value.trim();
        if (
          normalized.length === 0 ||
          normalized === '@none@' ||
          normalized === 'NO_SELECTION'
        ) {
          return null;
        }
      }
      return value;
    },
    createBrandSchema.shape.master_claim_brand_id,
  ),
  new_custom_agency_names: z.preprocess(
    (value) => {
      if (value == null) return value;
      if (!Array.isArray(value)) return value;
      return value
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry): entry is string => entry.length > 0);
    },
    z.array(commonSchemas.nonEmptyString).optional().nullable(),
  ),
});

export type UpdateBrandSchema = z.infer<typeof updateBrandSchema>;
