import { NextRequest, NextResponse } from 'next/server';

// Template-based brand identity generation
function generateBrandIdentityTemplate(brandName: string, country: string, language: string) {
  return {
    brandIdentity: `${brandName} projects a professional, reliable, and customer-focused personality. The brand emphasizes quality service, innovation, and a commitment to excellence in everything it does. ${brandName} is positioned as a trusted partner that understands the unique needs of its customers in ${country}.`,
    
    toneOfVoice: `${brandName}'s communication style is clear, friendly, and authoritative without being overly formal. Content should use direct language that inspires confidence and conveys expertise. The tone combines professionalism with accessibility, using technical terms where appropriate but always explained in a way that's understandable to the target audience in ${language}.`,
    
    guardrails: `When creating content for ${brandName}, avoid:
- Overpromising or making unsubstantiated claims
- Using jargon without explanation
- Negative messaging about competitors
- Culturally insensitive references
- Informal slang or overly casual language that may undermine professionalism
- Maintain transparency in all communications`,
    
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

// Template-based content generation
function generateContentTemplate(title: string, contentType: string, brandIdentity: string) {
  const templates = {
    blog: `# ${title}

This is placeholder text for a blog post about ${title.toLowerCase()}. This content would typically be 800-1200 words discussing the key points and providing value to readers. The tone and style would match the brand identity of being ${brandIdentity.substring(0, 50)}...

## Key Points

- First important point about the topic
- Second point with supporting details
- Third actionable insight
- Practical applications or examples

## Why This Matters

This section would explain the significance of the topic and its relevance to readers. It would connect the information to practical business applications and provide context.

## Conclusion

A summary of the main points covered, along with a call to action or final thought to leave readers with.`,

    social: `📣 ${title}

This is placeholder text for a social media post about ${title.toLowerCase()}. This would be a concise, engaging message crafted to generate interest and engagement.

#hashtag #${title.replace(/\s+/g, '')} #trending`,

    email: `Subject: ${title}

Dear [Customer],

This is placeholder text for an email about ${title.toLowerCase()}. This would typically include a personalized greeting, an introduction to the topic, key information, and a clear call to action.

We hope this information is helpful!

Best regards,
The Team`
  };

  return {
    title,
    metaTitle: `${title} | Learn About This Topic`,
    metaDescription: `Discover everything you need to know about ${title.toLowerCase()} in this comprehensive guide.`,
    body: templates[contentType as keyof typeof templates] || templates.blog
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { type, brandName, country, language, contentType, title } = payload;

    if (type === 'brand-identity') {
      if (!brandName) {
        return NextResponse.json({ 
          success: false, 
          error: 'Brand name is required' 
        }, { status: 400 });
      }

      const result = generateBrandIdentityTemplate(
        brandName, 
        country || 'United Kingdom', 
        language || 'English'
      );

      return NextResponse.json({
        success: true,
        data: result,
        meta: {
          generationType: 'template',
          templateVersion: '1.0',
          timestamp: new Date().toISOString()
        }
      });
    } 
    else if (type === 'content') {
      if (!title) {
        return NextResponse.json({ 
          success: false, 
          error: 'Content title is required' 
        }, { status: 400 });
      }

      const result = generateContentTemplate(
        title, 
        contentType || 'blog',
        brandName ? `${brandName} is a professional brand` : 'professional and informative'
      );

      return NextResponse.json({
        success: true,
        data: result,
        meta: {
          generationType: 'template',
          templateVersion: '1.0',
          timestamp: new Date().toISOString()
        }
      });
    }
    else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid generation type. Use "brand-identity" or "content"' 
      }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Template generation error:', error);
    
    return NextResponse.json({
      success: false,
      error: `Template generation failed: ${error.message}`,
    }, { status: 500 });
  }
} 