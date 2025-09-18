import { NextResponse, NextRequest } from 'next/server';
import { handleApiError } from '@/lib/api-utils'; // Import for consistent error handling
import { withAuth } from '@/lib/auth/api-auth';

export const dynamic = 'force-dynamic';

/**
 * GET endpoint to retrieve workflow templates
 * This is a static API that provides predefined templates for
 * different content templates.
 * This endpoint is currently unauthenticated.
 */
export const GET = withAuth(async (request: NextRequest, user) => {
  try {
    const userRole = user.user_metadata?.role;
    if (!(userRole === 'admin' || userRole === 'editor')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to access workflow templates.' },
        { status: 403 }
      );
    }
    // Define standard workflow templates
    const templates = [
      {
        id: 'basic-article-standard-workflow',
        name: 'Standard Workflow for Basic Article',
        templateName: 'Basic Article',
        description: 'A standard 3-step approval process for articles created with the Basic Article template',
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
        id: 'product-description-standard-workflow',
        name: 'Standard Workflow for Product Description',
        templateName: 'Product Description',
        description: 'A standard approval process for product descriptions created with the Product Description template',
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
            name: 'SEO Review',
            description: 'Review by SEO team for optimization',
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
        id: 'generic-quick-approval',
        name: 'Quick Approval Workflow (Any Template)',
        templateName: 'any',
        description: 'Simple 1-step approval process for quick content approvals, applicable to any template',
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
    // Removed console.error
    return handleApiError(error, 'Failed to fetch workflow templates');
  }
});
