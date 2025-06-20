import { NextResponse, NextRequest } from 'next/server';
import { withAuth } from '@/lib/auth/api-auth';
import { User } from '@supabase/supabase-js';
import { createSupabaseAdminClient } from '@/lib/supabase/client';
import { hasAccessToBrand } from '@/lib/auth/permissions';
import { generateTextCompletion } from '@/lib/azure/openai';

interface ClaimReview {
  claim_id: string;
  original_claim: string;
  status: 'approved' | 'needs_revision' | 'rejected';
  feedback: string;
  suggested_revision?: string;
  compliance_issues?: string[];
}

interface AIClaimReview {
  claim_index?: number;
  status: 'approved' | 'needs_revision' | 'rejected';
  feedback: string;
  suggested_revision?: string;
  compliance_issues?: string[];
}

interface ReviewResult {
  master_claim_brand_id: string;
  country_code: string;
  review_date: string;
  overall_status: 'approved' | 'needs_revision' | 'rejected';
  claims_reviewed: number;
  approved_claims: number;
  rejected_claims: number;
  needs_revision_claims: number;
  claim_reviews: ClaimReview[];
}

export const GET = withAuth(async (req: NextRequest, user: User, context?: unknown) => {
  try {
    const { params } = context as { params: { masterClaimBrandId: string } };
    const { masterClaimBrandId } = params;
    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get('countryCode');

    if (!masterClaimBrandId) {
      return NextResponse.json(
        { success: false, error: 'Master claim brand ID is required' },
        { status: 400 }
      );
    }

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'Country code is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdminClient();

    // Check if user has access to this brand
    const hasAccess = await hasAccessToBrand(user.id, masterClaimBrandId, supabase);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this brand' },
        { status: 403 }
      );
    }

    // Fetch the master claim brand
    const { data: masterBrand, error: brandError } = await supabase
      .from('master_claim_brands')
      .select('*')
      .eq('id', masterClaimBrandId)
      .single();

    if (brandError || !masterBrand) {
      return NextResponse.json(
        { success: false, error: 'Master claim brand not found' },
        { status: 404 }
      );
    }

    // Fetch all claims for this brand
    const { data: claims, error: claimsError } = await supabase
      .from('claims')
      .select('*')
      .eq('master_brand_id', masterClaimBrandId);

    if (claimsError) {
      console.error('Error fetching claims:', claimsError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch claims' },
        { status: 500 }
      );
    }

    if (!claims || claims.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          master_claim_brand_id: masterClaimBrandId,
          country_code: countryCode,
          review_date: new Date().toISOString(),
          overall_status: 'approved',
          claims_reviewed: 0,
          approved_claims: 0,
          rejected_claims: 0,
          needs_revision_claims: 0,
          claim_reviews: []
        }
      });
    }

    // Get country-specific regulations
    const countryRegulations = getCountryRegulations(countryCode);

    // Prepare AI review prompt
    const prompt = `You are a regulatory compliance expert reviewing marketing claims for ${masterBrand.name} in ${countryCode}.

Country-specific regulations to consider:
${countryRegulations}

Review each claim below and provide:
1. Status: "approved", "needs_revision", or "rejected"
2. Feedback: Explain why the claim was approved, needs revision, or was rejected
3. Suggested revision (if status is "needs_revision")
4. Compliance issues (list specific regulatory concerns)

Claims to review:
${claims.map((claim, index) => `${index + 1}. ${claim.claim_text}`).join('\n')}

Respond in JSON format:
{
  "claim_reviews": [
    {
      "claim_index": 0,
      "status": "approved|needs_revision|rejected",
      "feedback": "explanation",
      "suggested_revision": "revised text (if applicable)",
      "compliance_issues": ["issue1", "issue2"]
    }
  ]
}`;

    // Call AI to review claims
    const aiResponse = await generateTextCompletion(
      "You are a regulatory compliance expert reviewing marketing claims.",
      prompt,
      2000, // max_tokens
      0.3 // temperature - lower for more consistent compliance reviews
    );

    if (!aiResponse) {
      return NextResponse.json(
        { success: false, error: 'Failed to generate AI review' },
        { status: 500 }
      );
    }

    let reviewData;
    try {
      reviewData = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      return NextResponse.json(
        { success: false, error: 'Failed to process AI review' },
        { status: 500 }
      );
    }

    // Process the AI review results
    const claimReviews: ClaimReview[] = reviewData.claim_reviews.map((review: AIClaimReview, index: number) => {
      const claimIndex = review.claim_index ?? index;
      return {
        claim_id: claims[claimIndex].id,
        original_claim: claims[claimIndex].claim_text,
        status: review.status,
        feedback: review.feedback,
        suggested_revision: review.suggested_revision,
        compliance_issues: review.compliance_issues || []
      };
    });

    // Calculate summary statistics
    const approvedClaims = claimReviews.filter(r => r.status === 'approved').length;
    const rejectedClaims = claimReviews.filter(r => r.status === 'rejected').length;
    const needsRevisionClaims = claimReviews.filter(r => r.status === 'needs_revision').length;

    const overallStatus = rejectedClaims > 0 ? 'rejected' : 
                         needsRevisionClaims > 0 ? 'needs_revision' : 
                         'approved';

    const result: ReviewResult = {
      master_claim_brand_id: masterClaimBrandId,
      country_code: countryCode,
      review_date: new Date().toISOString(),
      overall_status: overallStatus,
      claims_reviewed: claims.length,
      approved_claims: approvedClaims,
      rejected_claims: rejectedClaims,
      needs_revision_claims: needsRevisionClaims,
      claim_reviews: claimReviews
    };

    // Store the review result in the database
    // TODO: Uncomment after claim_reviews table is added to database types
    // const { error: insertError } = await supabase
    //   .from('claim_reviews')
    //   .insert({
    //     master_claim_brand_id: masterClaimBrandId,
    //     country_code: countryCode,
    //     review_data: result,
    //     reviewed_by: user.id,
    //     reviewed_at: new Date().toISOString()
    //   });

    // if (insertError) {
    //   console.error('Failed to store review:', insertError);
    //   // Continue anyway - the review was successful
    // }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error in AI brand review:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to complete AI review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

// Helper function to get country-specific regulations
function getCountryRegulations(countryCode: string): string {
  const regulations: Record<string, string> = {
    US: `- FDA regulations for health claims
- FTC guidelines for advertising claims
- No misleading or unsubstantiated claims
- Specific requirements for "natural", "organic", "clinically proven"
- Disclaimers required for health-related claims`,
    
    EU: `- EU Regulation 1924/2006 on nutrition and health claims
- Claims must be authorized and listed in EU Register
- Strict requirements for health and nutrition claims
- Prohibited claims about preventing, treating, or curing diseases
- Clear substantiation required`,
    
    UK: `- UK Code of Non-broadcast Advertising (CAP Code)
- ASA guidelines on health and beauty claims
- Brexit-specific regulations diverging from EU
- Evidence requirements for efficacy claims
- Restrictions on medicinal claims`,
    
    CA: `- Canadian Food and Drug Regulations
- Natural Health Products Regulations
- Competition Act requirements for performance claims
- French language requirements for Quebec
- Restrictions on therapeutic claims`,
    
    AU: `- Therapeutic Goods Administration (TGA) regulations
- ACCC guidelines on false or misleading claims
- Specific requirements for complementary medicines
- Restrictions on therapeutic claims
- Evidence requirements for TGA listed products`
  };

  return regulations[countryCode] || `General advertising standards apply. Ensure claims are truthful, substantiated, and not misleading.`;
}

// Method not allowed handlers
export async function POST() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405 });
}