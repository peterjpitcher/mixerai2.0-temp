import { NextResponse } from 'next/server';
import { z } from 'zod';

// Mock data - replace with actual database call
const mockClaims = [
  { id: 'claim_1', claim_text: 'Clinically proven to hydrate skin' },
  { id: 'claim_2', claim_text: 'Reduces the appearance of fine lines' },
  { id: 'claim_3', claim_text: 'Made with 100% natural ingredients' },
  { id: 'claim_4', claim_text: 'Dermatologist tested and approved' },
  { id: 'claim_5', claim_text: 'Fragrance-free and hypoallergenic' },
];

const paramsSchema = z.object({
  id: z.string().uuid({ message: 'Invalid brand ID format.' }),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Validate brandId from the URL
  const validation = paramsSchema.safeParse(params);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: validation.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // TODO: Add permission check to ensure user can access this brand.
  // For now, we'll proceed with the validated brandId.
  // Brand ID is validated

  // In a real implementation, you would fetch claims for the given brandId from the database.
  // For example:
  // const { data: claims, error } = await supabase
  //   .from('brand_claims')
  //   .select('id, claim_text')
  //   .eq('brand_id', brandId);

  // For now, we return mock data.
  const claims = mockClaims;

  return NextResponse.json(
    { success: true, claims },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    }
  );
} 