import { z } from 'zod';
import { commonSchemas } from '@/lib/api/validation';

const isHttpProtocol = (value: string): boolean => {
  try {
    const protocol = new URL(value).protocol.toLowerCase();
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
};

export const httpUrlSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  commonSchemas.url.refine(
    (value) => isHttpProtocol(value),
    { message: 'Only http and https URLs are allowed' }
  )
);

export const createBrandSchema = z.object({
  name: commonSchemas.nonEmptyString,
  website_url: httpUrlSchema.optional().nullable(),
  additional_website_urls: z.preprocess(
    (value) => {
      if (!Array.isArray(value)) return value;
      return value
        .map((url) => (typeof url === 'string' ? url.trim() : ''))
        .filter((url): url is string => url.length > 0);
    },
    z.array(httpUrlSchema).optional().nullable()
  ),
  country: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  brand_identity: z.string().optional().nullable(),
  tone_of_voice: z.string().optional().nullable(),
  guardrails: z.union([
    z.string(),
    z.array(z.string())
  ]).optional().nullable(),
  brand_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').optional().nullable(),
  logo_url: commonSchemas.url.optional().nullable(),
  master_claim_brand_id: commonSchemas.uuid.optional().nullable(),
  master_claim_brand_ids: z.array(commonSchemas.uuid).optional().nullable(),
  selected_agency_ids: z.array(commonSchemas.uuid).optional().nullable(),
  approved_content_types: z.array(z.string()).optional().nullable(),
  admin_users: z.array(z.object({
    email: commonSchemas.email,
    role: z.literal('admin')
  })).optional()
});

export type CreateBrandSchema = z.infer<typeof createBrandSchema>;

export function formatGuardrailsInput(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    const items = value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
    if (items.length === 0) {
      return null;
    }
    return items.map((item) => `- ${item}`).join('\n');
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const items = parsed
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter((entry) => entry.length > 0);
          if (items.length === 0) {
            return null;
          }
          return items.map((item) => `- ${item}`).join('\n');
        }
      } catch {
        // Ignore JSON parsing errors; fall through to returning trimmed string.
      }
    }

    return trimmed;
  }

  return null;
}
