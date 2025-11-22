#!/usr/bin/env ts-node

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { ensureNormalizedContent } from '../src/lib/content/html-normalizer';
import type { NormalizedContent } from '../src/lib/content/html-normalizer';

interface ContentRow {
  id: string;
  template_id: string | null;
  content_data: Record<string, unknown> | null;
}

interface TemplateField {
  id: string;
  type: string;
}

interface TemplateRow {
  id: string;
  fields: {
    outputFields?: TemplateField[];
  } | null;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to run this script.');
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const batchSize = Number(process.env.MIGRATION_BATCH_SIZE || 200);

  console.log('[migrate-generated-outputs] Starting migration');
  let processed = 0;
  let updated = 0;
  let offset = 0;

  while (true) {
    const { data: rows, error } = await supabase
      .from('content')
      .select('id, template_id, content_data')
      .order('id', { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw error;
    }

    if (!rows || rows.length === 0) {
      break;
    }

    for (const row of rows as ContentRow[]) {
      processed += 1;
      const outputs = row.content_data?.generatedOutputs;
      if (!outputs || typeof outputs !== 'object') {
        continue;
      }

      const templateFields = await fetchTemplateFields(supabase, row.template_id);
      const normalised = normaliseOutputs(outputs as Record<string, unknown>, templateFields);

      if (normalised.changed) {
        const { error: updateError } = await supabase
          .from('content')
          .update({
            content_data: {
              ...row.content_data,
              generatedOutputs: normalised.outputs,
            },
          })
          .eq('id', row.id);

        if (updateError) {
          console.error(`[migrate-generated-outputs] Failed to update content ${row.id}:`, updateError);
          continue;
        }

        updated += 1;
        console.log(`[migrate-generated-outputs] Updated content ${row.id}`);
      }
    }

    offset += rows.length;
  }

  console.log(`[migrate-generated-outputs] Completed. Processed: ${processed}, Updated: ${updated}`);
}

function normaliseOutputs(
  outputs: Record<string, unknown>,
  fields: TemplateField[]
): { outputs: Record<string, NormalizedContent>; changed: boolean } {
  const fieldTypeMap = new Map<string, string>();
  fields.forEach((field) => fieldTypeMap.set(field.id, field.type));

  let changed = false;
  const normalisedEntries = Object.entries(outputs).reduce<Record<string, NormalizedContent>>((acc, [key, value]) => {
    const type = fieldTypeMap.get(key) ?? 'plainText';
    if (
      value &&
      typeof value === 'object' &&
      'html' in (value as Record<string, unknown>) &&
      'plain' in (value as Record<string, unknown>) &&
      typeof (value as Record<string, unknown>).charCount === 'number'
    ) {
      acc[key] = value as NormalizedContent;
      return acc;
    }

    const normalised = ensureNormalizedContent(value, type);
    changed = true;
    acc[key] = normalised;
    return acc;
  }, {});

  return { outputs: normalisedEntries, changed };
}

async function fetchTemplateFields(
  supabase: ReturnType<typeof createClient>,
  templateId: string | null
): Promise<TemplateField[]> {
  if (!templateId) return [];

  const { data, error } = await supabase
    .from('content_templates')
    .select('fields')
    .eq('id', templateId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`[migrate-generated-outputs] Failed to load template ${templateId}:`, error.message);
    return [];
  }

  const template = data as TemplateRow | null;
  return template?.fields?.outputFields ?? [];
}

main().catch((error) => {
  console.error('[migrate-generated-outputs] Migration failed:', error);
  process.exit(1);
});
