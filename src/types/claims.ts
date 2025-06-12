export interface StyledClaims {
  introductory_sentence: string;
  mandatory_claims: Array<{
    text: string;
    level: string;
  }>;
  grouped_claims: Array<{
    level: string;
    allowed_claims: string[];
    disallowed_claims: string[];
  }>;
}

export interface ProductContext {
  productName: string;
  styledClaims: StyledClaims | null;
} 