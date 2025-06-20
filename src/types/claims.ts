export interface StyledClaims {
  introductory_sentence: string;
  grouped_claims: Array<{
    level: string;
    allowed_claims: (string | { text: string })[];
    disallowed_claims: (string | { text: string })[];
  }>;
}

export interface ProductContext {
  productName: string;
  styledClaims: StyledClaims | null;
} 