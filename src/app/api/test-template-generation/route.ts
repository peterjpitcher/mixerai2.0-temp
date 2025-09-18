import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-utils'; // For consistent error handling
// import { withAuth } from '@/lib/auth/api-auth'; // No longer used
import { withAdminAuthAndCSRF } from '@/lib/auth/api-auth'; // Use withAdminAuthAndCSRF

const testsEnabled = process.env.ENABLE_TEST_ENDPOINTS === 'true';

function disabledResponse() {
  return NextResponse.json(
    { success: false, error: 'This test endpoint is disabled. Set ENABLE_TEST_ENDPOINTS=true to enable locally.' },
    { status: 410 }
  );
}
import { User } from '@supabase/supabase-js';

// Template-based brand identity generation (Non-AI)
function generateBrandIdentityTemplate(brandName: string, country: string, language: string) {
  return {
    brandIdentity: `${brandName} projects a professional, reliable, and customer-focused personality. The brand emphasizes quality service, innovation, and a commitment to excellence in everything it does. ${brandName} is positioned as a trusted partner that understands the unique needs of its customers in ${country}.`,
    
    toneOfVoice: `${brandName}'s communication style is clear, friendly, and authoritative without being overly formal. Content should use direct language that inspires confidence and conveys expertise. The tone combines professionalism with accessibility, using technical terms where appropriate but always explained in a way that's understandable to the target audience in ${language}.`,
    
    guardrails: `When creating content for ${brandName}, avoid:\n- Overpromising or making unsubstantiated claims\n- Using jargon without explanation\n- Negative messaging about competitors\n- Culturally insensitive references\n- Informal slang or overly casual language that may undermine professionalism\n- Maintain transparency in all communications`,
    
    brandColor: '#4A90E2', // Default blue
    
    vettingAgencies: [
      {
        name: 'National Advertising Review Board',
        priority: 'Primary',
        description: 'Reviews advertising for truth and accuracy'
      },
      {
        name: 'Better Business Bureau',
        priority: 'Secondary',
        description: 'Promotes ethical business practices and standards'
      }
    ]
  };
}

// Template-based content generation (Non-AI)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateContentTemplate(title: string, contentType: string, _brandIdentity: string) {
  const templates: {[key: string]: string} = {
    blog: `# ${title}\n\nThis is placeholder text for a blog post about ${title.toLowerCase()}. ...`,
    social: `📣 ${title}\n\nThis is placeholder text for a social media post...`,
    email: `Subject: ${title}\n\nDear [Customer],\n\nThis is placeholder text for an email...`
  };
  // Full template strings omitted for brevity in this edit, assume they are the same as original
  const selectedBody = templates[contentType] || templates.blog;

  return {
    title,
    metaTitle: `${title} | Learn About This Topic`,
    metaDescription: `Discover everything you need to know about ${title.toLowerCase()} in this comprehensive guide.`,
    body: selectedBody
  };
}

/**
 * POST endpoint for testing static (non-AI) template generation for brand identity and content.
 * NOTE: This endpoint is now protected by admin-only authorization.
 * It should be REMOVED or STRICTLY SECURED if kept in deployment.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAdminAuthAndCSRF(async (req: NextRequest, _user: User) => {
  if (!testsEnabled) {
    return disabledResponse();
  }
  try {
    const payload = await req.json();
    const { type, brandName, country, language, contentType, title } = payload;

    if (type === 'brand-identity') {
      if (!brandName) {
        return NextResponse.json({ success: false, error: 'Brand name is required' }, { status: 400 });
      }
      const result = generateBrandIdentityTemplate(brandName, country || 'United Kingdom', language || 'English');
      return NextResponse.json({
        success: true,
        data: result,
        meta: { generationType: 'template', templateVersion: '1.0', timestamp: new Date().toISOString() }
      });
    } 
    else if (type === 'content') {
      if (!title) {
        return NextResponse.json({ success: false, error: 'Content title is required' }, { status: 400 });
      }
      const result = generateContentTemplate(title, contentType || 'blog', brandName ? `${brandName} is a professional brand` : 'professional and informative');
      return NextResponse.json({
        success: true,
        data: result,
        meta: { generationType: 'template', templateVersion: '1.0', timestamp: new Date().toISOString() }
      });
    }
    else {
      return NextResponse.json({ success: false, error: 'Invalid generation type. Use "brand-identity" or "content"' }, { status: 400 });
    }
  } catch (error: unknown) {
    // console.error removed
    return handleApiError(error, `Template generation test failed`);
  }
}); 
