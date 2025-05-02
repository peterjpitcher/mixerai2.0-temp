import { NextResponse } from 'next/server';

/**
 * GET endpoint to retrieve workflow templates
 * This is a static API that provides predefined templates for
 * different content types
 */
export async function GET() {
  try {
    // Define standard workflow templates
    const templates = [
      {
        id: 'article-standard',
        name: 'Standard Article Workflow',
        contentType: 'article',
        description: 'A standard 3-step approval process for articles',
        steps: [
          {
            id: 1,
            name: 'Author Review',
            description: 'Initial review by the content author',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 2,
            name: 'Editorial Review',
            description: 'Review by an editor for language and style',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 3,
            name: 'Brand Approval',
            description: 'Final approval by brand representative',
            role: 'admin',
            approvalRequired: true
          }
        ]
      },
      {
        id: 'retailer-pdp',
        name: 'Retailer Product Description',
        contentType: 'retailer_pdp',
        description: 'Simplified 2-step approval process for retailer product descriptions',
        steps: [
          {
            id: 1,
            name: 'Content Review',
            description: 'Review of product description by content team',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 2,
            name: 'Brand Approval',
            description: 'Final approval by brand representative',
            role: 'admin',
            approvalRequired: true
          }
        ]
      },
      {
        id: 'owned-pdp',
        name: 'Owned Product Description',
        contentType: 'owned_pdp',
        description: 'Comprehensive 4-step approval process for owned product descriptions',
        steps: [
          {
            id: 1,
            name: 'Author Review',
            description: 'Initial review by the content author',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 2,
            name: 'Editorial Review',
            description: 'Review by an editor for language and style',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 3,
            name: 'SEO Review',
            description: 'Review by SEO team for optimization',
            role: 'editor',
            approvalRequired: true
          },
          {
            id: 4,
            name: 'Brand Approval',
            description: 'Final approval by brand representative',
            role: 'admin',
            approvalRequired: true
          }
        ]
      },
      {
        id: 'quick-approval',
        name: 'Quick Approval Workflow',
        contentType: 'any',
        description: 'Simple 1-step approval process for quick content approvals',
        steps: [
          {
            id: 1,
            name: 'Brand Approval',
            description: 'Direct approval by brand representative',
            role: 'admin',
            approvalRequired: true
          }
        ]
      }
    ];

    return NextResponse.json({ 
      success: true, 
      templates 
    });
  } catch (error) {
    console.error('Error fetching workflow templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow templates' },
      { status: 500 }
    );
  }
} 