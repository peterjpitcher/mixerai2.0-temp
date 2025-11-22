import type { SupabaseClient } from '@supabase/supabase-js';

import { createSupabaseAdminClient } from './supabase/client';
import { ALL_COUNTRIES_CODE, GLOBAL_CLAIM_COUNTRY_CODE } from '@/lib/constants/claims';
import { logDebug, logError } from '@/lib/logger';
import type { Database } from '@/types/supabase';

function normalizeSingleRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value ?? null;
}

async function fetchSingleRow<T>(builder: any): Promise<{ data: T | null; error: any }> {
  if (!builder) {
    return { data: null, error: new Error('Invalid query builder') };
  }

  if (typeof builder.single === 'function') {
    const result = await builder.single();
    return {
      data: normalizeSingleRow<T>(result?.data as T | T[] | null | undefined),
      error: result?.error ?? null,
    };
  }

  const result = await builder;
  return {
    data: normalizeSingleRow<T>(result?.data as T | T[] | null | undefined),
    error: result?.error ?? null,
  };
}

type AdminClient = SupabaseClient<Database>;

// Types mirroring database schema and API responses
export type ClaimTypeEnum = 'allowed' | 'disallowed' | 'mandatory' | 'conditional';
export type ClaimLevelEnum = 'brand' | 'product' | 'ingredient';
export type FinalClaimTypeEnum = ClaimTypeEnum | 'none';

export interface Claim {
  id: string;
  claim_text: string;
  claim_type: ClaimTypeEnum;
  level: ClaimLevelEnum;
  master_brand_id?: string | null;
  product_id?: string | null;
  ingredient_id?: string | null;
  country_code: string | null;
  description?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  master_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Ingredient {
  id: string;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MasterClaimBrand {
  id: string;
  name: string;
  mixerai_brand_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProductIngredientAssociation {
  product_id: string;
  ingredient_id: string;
  created_at?: string;
}

export interface EffectiveClaim {
  claim_text: string;
  final_claim_type: FinalClaimTypeEnum;
  source_level: ClaimLevelEnum | 'override' | 'none';
  source_claim_id?: string | null;
  original_master_claim_id_if_overridden?: string | null;
  is_blocked_override?: boolean;
  is_replacement_override?: boolean;
  isActuallyMaster?: boolean;
  description?: string | null;
  applies_to_product_id: string;
  applies_to_country_code: string;
  original_claim_country_code?: string | null | undefined;
  source_entity_id?: string | null;
  original_claim_text?: string | null;
  override_rule_id?: string | null;
}

export interface MarketClaimOverride {
  id: string;
  master_claim_id: string;
  market_country_code: string;
  target_product_id: string;
  is_blocked: boolean;
  replacement_claim_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  replacement_claim?: Claim | null;
  master_claim?: Claim | null;
}

export interface ClaimsDataPreset {
  product?: Product | null;
  productClaims?: Claim[];
  ingredientClaims?: Claim[];
  brandClaims?: Claim[];
  ingredientIds?: string[];
  marketOverrides?: MarketClaimOverride[];
}

export interface GetStackedClaimsForProductOptions {
  preset?: ClaimsDataPreset;
  client?: AdminClient;
}

export interface GetStackedClaimsForProductRPCOptions {
  client?: AdminClient;
}

interface EffectiveClaimRpcRow {
  claim_text: string | null;
  final_claim_type: FinalClaimTypeEnum | null;
  source_level: SourceLevel | null;
  source_claim_id: string | null;
  original_claim_country_code: string | null;
  applies_to_product_id: string | null;
  applies_to_country_code: string | null;
  description: string | null;
  original_claim_text: string | null;
  original_master_claim_id_if_overridden: string | null;
  master_claim_id?: string | null;
  is_master?: boolean | null;
  is_replacement_override?: boolean | null;
  is_blocked_override?: boolean | null;
  override_rule_id?: string | null;
  source_entity_id?: string | null;
}

const CLAIM_SELECT = 'id, claim_text, claim_type, level, master_brand_id, product_id, ingredient_id, country_code, description, created_by, created_at, updated_at';

const resolveLevel = (claim: Claim): ClaimLevelEnum => {
  if (claim.level === 'product') return 'product';
  if (claim.level === 'ingredient') return 'ingredient';
  return 'brand';
};

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

async function fetchProductRecord(client: AdminClient, productId: string): Promise<Product | null> {
  const { data, error } = await fetchSingleRow<Product>(
    client.from('products').select('id, name, master_brand_id').eq('id', productId)
  );

  if (error) {
    logError(`[getStackedClaimsForProduct] Error fetching product ${productId}:`, error);
    return null;
  }

  return data;
}

async function fetchIngredientIds(client: AdminClient, productId: string): Promise<string[]> {
  const { data, error } = await client
    .from('product_ingredients')
    .select('ingredient_id')
    .eq('product_id', productId);

  if (error) {
    logError(`[getStackedClaimsForProduct] Error fetching ingredients for product ${productId}:`, error);
    return [];
  }

  return unique(((data as { ingredient_id: string }[] | null) ?? []).map(row => row.ingredient_id));
}

async function fetchClaimCountries(
  client: AdminClient,
  claimIds: string[],
  countryCode: string,
  context: string
): Promise<Map<string, string>> {
  if (!claimIds.length) {
    return new Map();
  }

  const { data, error } = await client
    .from('claim_countries')
    .select('claim_id, country_code')
    .in('claim_id', claimIds)
    .in('country_code', [countryCode, GLOBAL_CLAIM_COUNTRY_CODE]);

  if (error) {
    logError(`[getStackedClaimsForProduct] claim_countries fetch failed for ${context}:`, error);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of (data as { claim_id: string; country_code: string }[] | null) ?? []) {
    const prev = map.get(row.claim_id);
    if (!prev || prev === GLOBAL_CLAIM_COUNTRY_CODE || row.country_code === countryCode) {
      map.set(row.claim_id, row.country_code);
    }
  }

  return map;
}

async function fetchProductClaims(
  client: AdminClient,
  productId: string,
  countryCode: string
): Promise<Claim[]> {
  const { data, error } = await client
    .from('claim_products')
    .select('claim_id')
    .eq('product_id', productId);

  if (error) {
    logError(`[getStackedClaimsForProduct] claim_products fetch failed for ${productId}:`, error);
    return [];
  }

  const claimIds = unique(((data as { claim_id: string }[] | null) ?? []).map(row => row.claim_id));
  if (!claimIds.length) {
    return [];
  }

  const chosenCountries = await fetchClaimCountries(client, claimIds, countryCode, 'product claims');
  if (!chosenCountries.size) {
    return [];
  }

  const { data: claims, error: claimErr } = await client
    .from('claims')
    .select(CLAIM_SELECT)
    .in('id', Array.from(chosenCountries.keys()))
    .eq('level', 'product');

  if (claimErr) {
    logError('[getStackedClaimsForProduct] claims fetch failed for product-level claims:', claimErr);
    return [];
  }

  return ((claims as Claim[] | null) ?? []).map(claim => ({
    ...claim,
    country_code: chosenCountries.get(claim.id) ?? claim.country_code,
  }));
}

async function fetchIngredientClaims(
  client: AdminClient,
  ingredientIds: string[],
  countryCode: string
): Promise<Claim[]> {
  if (!ingredientIds.length) {
    return [];
  }

  const { data, error } = await client
    .from('claim_ingredients')
    .select('claim_id')
    .in('ingredient_id', ingredientIds);

  if (error) {
    logError('[getStackedClaimsForProduct] claim_ingredients fetch failed:', error);
    return [];
  }

  const claimIds = unique(((data as { claim_id: string }[] | null) ?? []).map(row => row.claim_id));
  if (!claimIds.length) {
    return [];
  }

  const chosenCountries = await fetchClaimCountries(client, claimIds, countryCode, 'ingredient claims');
  if (!chosenCountries.size) {
    return [];
  }

  const { data: claims, error: claimErr } = await client
    .from('claims')
    .select(CLAIM_SELECT)
    .in('id', Array.from(chosenCountries.keys()))
    .eq('level', 'ingredient');

  if (claimErr) {
    logError('[getStackedClaimsForProduct] claims fetch failed for ingredient-level claims:', claimErr);
    return [];
  }

  return ((claims as Claim[] | null) ?? []).map(claim => ({
    ...claim,
    country_code: chosenCountries.get(claim.id) ?? claim.country_code,
  }));
}

async function fetchBrandClaims(
  client: AdminClient,
  brandId: string,
  countryCode: string
): Promise<Claim[]> {
  const { data, error } = await client
    .from('claims')
    .select(CLAIM_SELECT)
    .eq('master_brand_id', brandId)
    .eq('level', 'brand');

  if (error) {
    logError('[getStackedClaimsForProduct] claims fetch failed for brand-level claims:', error);
    return [];
  }

  const claims = (data as Claim[] | null) ?? [];
  if (!claims.length) {
    return [];
  }

  const ids = claims.map(claim => claim.id);
  const { data: countries, error: countryErr } = await client
    .from('claim_countries')
    .select('claim_id, country_code')
    .in('claim_id', ids);

  if (countryErr) {
    logError('[getStackedClaimsForProduct] claim_countries fetch failed for brand claims:', countryErr);
    return [];
  }

  const map = new Map<string, string[]>();
  for (const row of (countries as { claim_id: string; country_code: string }[] | null) ?? []) {
    const next = map.get(row.claim_id) ?? [];
    next.push(row.country_code);
    map.set(row.claim_id, next);
  }

  return claims
    .filter(claim => {
      const list = map.get(claim.id) ?? (claim.country_code ? [claim.country_code] : []);
      return list.includes(countryCode) || list.includes(GLOBAL_CLAIM_COUNTRY_CODE);
    })
    .map(claim => {
      const list = map.get(claim.id) ?? (claim.country_code ? [claim.country_code] : []);
      const chosen = list.includes(countryCode)
        ? countryCode
        : list.includes(GLOBAL_CLAIM_COUNTRY_CODE)
          ? GLOBAL_CLAIM_COUNTRY_CODE
          : claim.country_code;
      return {
        ...claim,
        country_code: chosen ?? claim.country_code,
      };
    });
}

async function fetchMarketOverrides(
  client: AdminClient,
  productId: string,
  countryCode: string
): Promise<MarketClaimOverride[]> {
  const { data, error } = await client
    .from('market_claim_overrides')
    .select(`
      *,
      replacement_claim:claims!market_claim_overrides_replacement_claim_id_fkey(${CLAIM_SELECT}),
      master_claim:claims!market_claim_overrides_master_claim_id_fkey(${CLAIM_SELECT})
    `)
    .eq('target_product_id', productId)
    .in('market_country_code', [countryCode, ALL_COUNTRIES_CODE]);

  if (error) {
    logError(`[getStackedClaimsForProduct] Error fetching market overrides for product ${productId}, country ${countryCode}:`, error);
    return [];
  }

  return (data as MarketClaimOverride[] | null) ?? [];
}

function buildBaseEffectiveClaim(
  claim: Claim,
  productId: string,
  countryCode: string
): EffectiveClaim {
  const level = resolveLevel(claim);
  const sourceEntityId =
    level === 'product'
      ? claim.product_id ?? null
      : level === 'ingredient'
        ? claim.ingredient_id ?? null
        : claim.master_brand_id ?? null;

  return {
    claim_text: claim.claim_text,
    final_claim_type: claim.claim_type,
    source_level: level,
    source_claim_id: claim.id,
    description: claim.description ?? null,
    applies_to_product_id: productId,
    applies_to_country_code: countryCode,
    original_claim_country_code: claim.country_code,
    source_entity_id: sourceEntityId,
    isActuallyMaster: claim.country_code === GLOBAL_CLAIM_COUNTRY_CODE,
    original_claim_text: claim.claim_text,
    override_rule_id: null,
  };
}

function buildBlockedOverrideClaim(
  claim: Claim | null,
  override: MarketClaimOverride,
  productId: string,
  countryCode: string
): EffectiveClaim {
  const text = claim?.claim_text ?? override.master_claim?.claim_text ?? override.master_claim_id ?? 'Master claim override';
  return {
    claim_text: text,
    final_claim_type: 'none',
    source_level: 'override',
    source_claim_id: override.id,
    original_master_claim_id_if_overridden: claim?.id ?? override.master_claim_id ?? null,
    is_blocked_override: true,
    isActuallyMaster: false,
    description:
      override.market_country_code === ALL_COUNTRIES_CODE
        ? `Master claim "${text}" blocked globally for product ${productId}.`
        : `Master claim "${text}" blocked in ${countryCode} for product ${productId}.`,
    applies_to_product_id: productId,
    applies_to_country_code: countryCode,
    original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
    original_claim_text: claim?.claim_text ?? override.master_claim?.claim_text ?? text,
    override_rule_id: override.id,
  };
}

function buildReplacementOverrideClaim(
  claim: Claim | null,
  replacement: Claim,
  override: MarketClaimOverride,
  productId: string,
  countryCode: string
): EffectiveClaim {
  return {
    claim_text: replacement.claim_text,
    final_claim_type: replacement.claim_type,
    source_level: 'override',
    source_claim_id: replacement.id,
    original_master_claim_id_if_overridden: claim?.id ?? override.master_claim_id ?? null,
    is_replacement_override: true,
    isActuallyMaster: false,
    description:
      replacement.description ??
      (override.market_country_code === ALL_COUNTRIES_CODE
        ? `Master claim "${claim?.claim_text ?? override.master_claim?.claim_text ?? ''}" replaced globally by "${replacement.claim_text}".`
        : `Master claim "${claim?.claim_text ?? override.master_claim?.claim_text ?? ''}" replaced by "${replacement.claim_text}" in ${countryCode}.`),
    applies_to_product_id: productId,
    applies_to_country_code: countryCode,
    original_claim_country_code: replacement.country_code,
    source_entity_id: replacement.product_id || replacement.ingredient_id || replacement.master_brand_id || null,
    original_claim_text: claim?.claim_text ?? override.master_claim?.claim_text ?? replacement.claim_text,
    override_rule_id: override.id,
  };
}

function buildMissingReplacementClaim(
  claim: Claim | null,
  override: MarketClaimOverride,
  productId: string,
  countryCode: string
): EffectiveClaim {
  const text = claim?.claim_text ?? override.master_claim?.claim_text ?? override.master_claim_id ?? 'Master claim override';
  return {
    claim_text: text,
    final_claim_type: 'none',
    source_level: 'override',
    source_claim_id: override.id,
    original_master_claim_id_if_overridden: claim?.id ?? override.master_claim_id ?? null,
    is_blocked_override: true,
    isActuallyMaster: false,
    description: `Master claim "${text}" intended for replacement in ${countryCode} but replacement claim missing. Considered blocked.`,
    applies_to_product_id: productId,
    applies_to_country_code: countryCode,
    original_claim_country_code: GLOBAL_CLAIM_COUNTRY_CODE,
    original_claim_text: claim?.claim_text ?? override.master_claim?.claim_text ?? text,
    override_rule_id: override.id,
  };
}

function rankClaim(claim: Claim, countryCode: string): number {
  const levelScore = claim.level === 'product' ? 30 : claim.level === 'ingredient' ? 20 : 10;
  const marketBoost = claim.country_code === countryCode ? 100 : 0;
  return marketBoost + levelScore;
}

function sortClaimsForProcessing(claims: Claim[], countryCode: string): Claim[] {
  return [...claims].sort((a, b) => {
    const priorityDiff = rankClaim(b, countryCode) - rankClaim(a, countryCode);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.claim_text.localeCompare(b.claim_text);
  });
}

function buildOverrideLookup(
  overrides: MarketClaimOverride[],
  countryCode: string
): { selected: Map<string, MarketClaimOverride>; shadowed: Set<string> } {
  const selected = new Map<string, MarketClaimOverride>();
  const shadowed = new Set<string>();

  for (const override of overrides) {
    if (!override.master_claim_id) {
      continue;
    }

    const current = selected.get(override.master_claim_id);
    if (!current) {
      selected.set(override.master_claim_id, override);
      continue;
    }

    const currentIsGlobal = current.market_country_code === ALL_COUNTRIES_CODE;
    const incomingIsMarket = override.market_country_code === countryCode;

    if (incomingIsMarket && currentIsGlobal) {
      shadowed.add(current.id);
      selected.set(override.master_claim_id, override);
      continue;
    }

    shadowed.add(override.id);
  }

  return { selected, shadowed };
}

function composeEffectiveClaims(
  productId: string,
  countryCode: string,
  claims: Claim[],
  overrides: MarketClaimOverride[]
): EffectiveClaim[] {
  const processedOverrideIds = new Set<string>();
  const { selected: overrideByMasterId, shadowed: shadowedOverrideIds } = buildOverrideLookup(overrides, countryCode);
  const candidates: EffectiveClaim[] = [];

  const orderedClaims = sortClaimsForProcessing(claims, countryCode);

  for (const claim of orderedClaims) {
    const isMaster = isGlobalCountryCode(claim.country_code);
    const override = isMaster ? overrideByMasterId.get(claim.id) : undefined;

    if (override) {
      processedOverrideIds.add(override.id);
      if (override.is_blocked && !override.replacement_claim_id) {
        candidates.push(buildBlockedOverrideClaim(claim, override, productId, countryCode));
        continue;
      }

      if (override.replacement_claim_id) {
        if (override.replacement_claim) {
          candidates.push(
            buildReplacementOverrideClaim(claim, override.replacement_claim, override, productId, countryCode)
          );
          continue;
        }

        logError(
          `[getStackedClaimsForProduct] Override ${override.id} specified replacement_claim_id ${override.replacement_claim_id} but no replacement claim was returned.`
        );
        candidates.push(buildMissingReplacementClaim(claim, override, productId, countryCode));
        continue;
      }
    }

    candidates.push(buildBaseEffectiveClaim(claim, productId, countryCode));
  }

  for (const override of overrides) {
    if (processedOverrideIds.has(override.id) || shadowedOverrideIds.has(override.id)) {
      continue;
    }

    if (override.replacement_claim_id) {
      if (override.replacement_claim) {
        candidates.push(
          buildReplacementOverrideClaim(null, override.replacement_claim, override, productId, countryCode)
        );
        continue;
      }

      logError(
        `[getStackedClaimsForProduct] Override ${override.id} specified replacement_claim_id ${override.replacement_claim_id} but replacement claim data was not available.`
      );
      candidates.push(buildMissingReplacementClaim(null, override, productId, countryCode));
      continue;
    }

    if (override.is_blocked && !override.replacement_claim_id) {
      candidates.push(buildBlockedOverrideClaim(null, override, productId, countryCode));
    }
  }

  return candidates;
}

/**
 * Fetches and stacks claims for a given product, considering its ingredients, brand,
 * and market-specific overrides. It applies precedence rules to determine the
 * final effective claim for each unique claim text.
 */
export async function getStackedClaimsForProduct(
  productId: string,
  countryCode: string,
  options: GetStackedClaimsForProductOptions = {}
): Promise<EffectiveClaim[]> {
  const { preset } = options;
  const client = options.client ?? createSupabaseAdminClient();

  const presetHas = <K extends keyof ClaimsDataPreset>(key: K) =>
    preset !== undefined && Object.prototype.hasOwnProperty.call(preset, key);

  if (!productId) {
    logError('[getStackedClaimsForProduct] Product ID is required.');
    return [];
  }
  if (!countryCode) {
    logError('[getStackedClaimsForProduct] Country code is required.');
    return [];
  }

  try {
    let product = presetHas('product') ? preset?.product ?? null : null;
    if (!product) {
      product = await fetchProductRecord(client, productId);
      if (!product) {
        return [];
      }
    }

    const ingredientIds = presetHas('ingredientIds')
      ? preset?.ingredientIds ?? []
      : await fetchIngredientIds(client, productId);

    const [productClaims, ingredientClaims, brandClaims, marketOverrides] = await Promise.all([
      presetHas('productClaims')
        ? Promise.resolve(preset?.productClaims ?? [])
        : fetchProductClaims(client, productId, countryCode),
      presetHas('ingredientClaims')
        ? Promise.resolve(preset?.ingredientClaims ?? [])
        : fetchIngredientClaims(client, ingredientIds, countryCode),
      presetHas('brandClaims')
        ? Promise.resolve(preset?.brandClaims ?? [])
        : product?.master_brand_id
          ? fetchBrandClaims(client, product.master_brand_id, countryCode)
          : Promise.resolve([]),
      presetHas('marketOverrides')
        ? Promise.resolve(preset?.marketOverrides ?? [])
        : fetchMarketOverrides(client, productId, countryCode),
    ]);

    const allClaims = [...productClaims, ...ingredientClaims, ...brandClaims];
    if (!allClaims.length && !marketOverrides.length) {
      logDebug('[stacked-claims:compose]', { productId, countryCode, inCount: 0, outCount: 0 });
      return [];
    }

    const candidates = composeEffectiveClaims(productId, countryCode, allClaims, marketOverrides);
    const result = dedupeByFinalText(candidates);

    logDebug('[stacked-claims:compose]', {
      productId,
      countryCode,
      inCount: candidates.length,
      outCount: result.length,
    });

    return result;
  } catch (error) {
    logError(`[getStackedClaimsForProduct] Unexpected error for product ${productId}, country ${countryCode}:`, error);
    return [];
  }
}

export const isGlobalCountryCode = (
  code?: string | null
): code is typeof GLOBAL_CLAIM_COUNTRY_CODE =>
  typeof code === 'string' && code.trim().toUpperCase() === GLOBAL_CLAIM_COUNTRY_CODE;

type SourceLevel = 'product' | 'ingredient' | 'brand' | 'override' | 'none';
type Precedence = 1 | 2 | 3;

const levelScore = (lvl: SourceLevel) => ({ product: 3, ingredient: 2, brand: 1, override: 4, none: 0 }[lvl] || 0);

const precedenceOf = (ec: EffectiveClaim): Precedence => {
  const overridden = Boolean(ec.is_blocked_override) || Boolean(ec.is_replacement_override);
  if (overridden) return 1;
  if (ec.original_claim_country_code && ec.original_claim_country_code !== GLOBAL_CLAIM_COUNTRY_CODE) return 2;
  if (ec.isActuallyMaster === false) return 2;
  return 3;
};

export function dedupeByFinalText(rows: EffectiveClaim[]): EffectiveClaim[] {
  let fallbackCounter = 0;
  const keep = new Map<
    string,
    {
      claim: EffectiveClaim;
      priority: { p: Precedence; s: number };
      normalizedText: string;
      mapKey: string;
    }
  >();

  for (const ec of rows) {
    const normalizedText = (ec.claim_text ?? '').trim().toLowerCase();
    const fallbackKey = ec.override_rule_id || ec.source_claim_id || `__fallback-${fallbackCounter++}`;
    const mapKey = normalizedText || String(fallbackKey);

    const incomingPriority = {
      p: precedenceOf(ec),
      s: levelScore((ec.source_level as SourceLevel) || 'none'),
    };
    const existing = keep.get(mapKey);
    if (!existing) {
      keep.set(mapKey, { claim: ec, priority: incomingPriority, normalizedText, mapKey });
      continue;
    }

    const a = existing.priority;
    const b = incomingPriority;
    if (b.p < a.p || (b.p === a.p && b.s > a.s)) {
      keep.set(mapKey, { claim: ec, priority: b, normalizedText, mapKey });
    }
  }

  return Array.from(keep.values())
    .sort((left, right) => {
      if (left.priority.p !== right.priority.p) return left.priority.p - right.priority.p;
      if (left.priority.s !== right.priority.s) return right.priority.s - left.priority.s;
      if (left.normalizedText !== right.normalizedText) return left.normalizedText.localeCompare(right.normalizedText);
      return left.mapKey.localeCompare(right.mapKey);
    })
    .map(entry => entry.claim);
}

export async function getStackedClaimsForProductRPC(
  productId: string,
  countryCode: string,
  options: GetStackedClaimsForProductRPCOptions = {}
): Promise<EffectiveClaim[]> {
  if (!productId) {
    logError('[getStackedClaimsForProductRPC] Product ID is required.');
    return [];
  }

  if (!countryCode) {
    logError('[getStackedClaimsForProductRPC] Country code is required.');
    return [];
  }

  const client = options.client ?? createSupabaseAdminClient();

  const { data, error } = await client.rpc<any, Record<string, unknown>>(
    'get_effective_claims' as never,
    {
      p_product_id: productId,
      p_country_code: countryCode,
    }
  );

  if (error) {
    logError('[getStackedClaimsForProductRPC] RPC error', error);
    return [];
  }

  const rows = (data as EffectiveClaimRpcRow[] | null) ?? [];
  const mapped: EffectiveClaim[] = rows.map(row => {
    const sourceLevel = (row.source_level ?? 'none') as SourceLevel;
    return {
      source_claim_id: row.source_claim_id ?? null,
      source_level: sourceLevel,
      original_claim_country_code: row.original_claim_country_code ?? null,
      final_claim_type: (row.final_claim_type ?? 'none') as FinalClaimTypeEnum,
      claim_text: row.claim_text ?? '',
      isActuallyMaster: Boolean(row.is_master ?? (row.original_claim_country_code === GLOBAL_CLAIM_COUNTRY_CODE)),
      applies_to_product_id: row.applies_to_product_id ?? productId,
      applies_to_country_code: row.applies_to_country_code ?? countryCode,
      description: row.description ?? null,
      original_claim_text: row.original_claim_text ?? null,
      original_master_claim_id_if_overridden: row.original_master_claim_id_if_overridden ?? row.master_claim_id ?? null,
      is_replacement_override: Boolean(row.is_replacement_override),
      is_blocked_override: Boolean(row.is_blocked_override),
      override_rule_id: row.override_rule_id ?? null,
      source_entity_id: row.source_entity_id ?? null,
    };
  });

  return dedupeByFinalText(mapped);
}

export { normalizeSingleRow, fetchSingleRow };
