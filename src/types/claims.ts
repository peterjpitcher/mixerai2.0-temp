export interface CreateClaimInput {
  claim_text: string;
  claim_type: 'allowed' | 'disallowed';
  level: 'product' | 'ingredient' | 'brand';
  description?: string | null;
  master_brand_id?: string | null;
  ingredient_id?: string | null;
  ingredient_ids?: string[];
  product_ids?: string[];
  country_codes: string[];
  workflow_id?: string | null;
}

export type StyledClaimText = string | { text: string };

export interface StyledClaimsGroup {
  level: string;
  allowed_claims: StyledClaimText[];
  disallowed_claims: StyledClaimText[];
}

export interface StyledClaims {
  introductory_sentence: string;
  grouped_claims: StyledClaimsGroup[];
}

export interface ProductContext {
  productName: string;
  styledClaims: StyledClaims | null;
}
