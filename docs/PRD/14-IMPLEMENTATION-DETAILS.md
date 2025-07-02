# MixerAI 2.0 Implementation Details
## Business Logic and Configuration Specifications

Version: 1.0  
Date: December 2024  
[← Back to Master Index](./00-MASTER-INDEX.md) | [Related: Functional Requirements](./02-FUNCTIONAL-REQUIREMENTS.md)

---

## 📋 Table of Contents

1. [Business Logic Specifications](#1-business-logic-specifications)
2. [Default Configurations](#2-default-configurations)
3. [AI Prompt Templates](#3-ai-prompt-templates)
4. [Workflow Engine Logic](#4-workflow-engine-logic)
5. [Claims Validation Rules](#5-claims-validation-rules)
6. [Permission Matrices](#6-permission-matrices)
7. [UI/UX Specifications](#7-uiux-specifications)
8. [Integration Configurations](#8-integration-configurations)
9. [Error Handling Guide](#9-error-handling-guide)
10. [Search & Filtering Logic](#10-search--filtering-logic)

---

## 1. Business Logic Specifications

### 1.1 Content Status Transitions

```typescript
enum ContentStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

const statusTransitions: Record<ContentStatus, ContentStatus[]> = {
  [ContentStatus.DRAFT]: [ContentStatus.IN_REVIEW, ContentStatus.ARCHIVED],
  [ContentStatus.IN_REVIEW]: [ContentStatus.DRAFT, ContentStatus.APPROVED, ContentStatus.ARCHIVED],
  [ContentStatus.APPROVED]: [ContentStatus.PUBLISHED, ContentStatus.DRAFT, ContentStatus.ARCHIVED],
  [ContentStatus.PUBLISHED]: [ContentStatus.ARCHIVED],
  [ContentStatus.ARCHIVED]: [ContentStatus.DRAFT]
}

// Validation function
function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return statusTransitions[from]?.includes(to) ?? false
}
```

### 1.2 Content Scoring Algorithm

```typescript
interface ContentScore {
  overall: number // 0-100
  components: {
    completeness: number    // Required fields filled
    quality: number        // AI quality assessment
    compliance: number     // Claims compliance
    brandAlignment: number // Brand voice match
  }
}

function calculateContentScore(content: Content): ContentScore {
  // Completeness: % of required fields with content
  const requiredFields = content.template.fields.filter(f => f.required)
  const filledFields = requiredFields.filter(f => 
    content.fields[f.name] && content.fields[f.name].length > 0
  )
  const completeness = (filledFields.length / requiredFields.length) * 100

  // Quality: Length, readability, keyword presence
  const quality = calculateQuality(content)
  
  // Compliance: Claims validation pass rate
  const compliance = content.claims_validated ? 100 : 0
  
  // Brand Alignment: AI assessment
  const brandAlignment = content.brand_score || 0

  const overall = (
    completeness * 0.3 +
    quality * 0.3 +
    compliance * 0.2 +
    brandAlignment * 0.2
  )

  return { overall, components: { completeness, quality, compliance, brandAlignment }}
}

function calculateQuality(content: Content): number {
  let score = 100

  // Deduct for too short content
  const wordCount = content.fields.body?.split(' ').length || 0
  if (wordCount < 50) score -= 30
  else if (wordCount < 100) score -= 15
  
  // Deduct for missing metadata
  if (!content.fields.meta_description) score -= 10
  if (!content.fields.meta_title) score -= 10
  
  // Deduct for no images
  if (!content.fields.featured_image) score -= 10
  
  return Math.max(0, score)
}
```

### 1.3 Version Control Logic

```typescript
interface ContentVersion {
  version: number
  content: Content
  created_by: string
  created_at: Date
  change_summary: string
}

class VersionManager {
  // Auto-save creates minor versions
  createAutoSaveVersion(content: Content): ContentVersion {
    return {
      version: content.version + 0.1,
      content: { ...content },
      created_by: content.updated_by,
      created_at: new Date(),
      change_summary: 'Auto-save'
    }
  }

  // Manual save creates major versions
  createManualVersion(content: Content, summary: string): ContentVersion {
    return {
      version: Math.floor(content.version) + 1,
      content: { ...content },
      created_by: content.updated_by,
      created_at: new Date(),
      change_summary: summary
    }
  }

  // Keep last 10 auto-saves, all manual saves
  pruneVersions(versions: ContentVersion[]): ContentVersion[] {
    const manualVersions = versions.filter(v => v.version % 1 === 0)
    const autoSaves = versions.filter(v => v.version % 1 !== 0)
      .sort((a, b) => b.version - a.version)
      .slice(0, 10)
    
    return [...manualVersions, ...autoSaves].sort((a, b) => b.version - a.version)
  }
}
```

---

## 2. Default Configurations

### 2.1 Brand Voice Definitions

```typescript
interface BrandVoice {
  name: string
  description: string
  attributes: {
    formality: 1-5      // 1=casual, 5=formal
    technicality: 1-5   // 1=simple, 5=technical
    emotion: 1-5        // 1=neutral, 5=emotional
    urgency: 1-5        // 1=relaxed, 5=urgent
  }
  examples: {
    good: string[]
    bad: string[]
  }
  keywords: {
    preferred: string[]
    avoided: string[]
  }
}

const defaultBrandVoices: Record<string, BrandVoice> = {
  professional: {
    name: "Professional",
    description: "Clear, authoritative, and trustworthy",
    attributes: {
      formality: 4,
      technicality: 3,
      emotion: 2,
      urgency: 2
    },
    examples: {
      good: [
        "Our innovative solution delivers measurable results",
        "Research demonstrates significant improvements"
      ],
      bad: [
        "Hey there! Check out our awesome stuff!",
        "This thing is super duper amazing!!!"
      ]
    },
    keywords: {
      preferred: ["innovative", "solution", "deliver", "demonstrate", "significant"],
      avoided: ["awesome", "amazing", "super", "thing", "stuff"]
    }
  },
  
  casual: {
    name: "Casual & Friendly",
    description: "Conversational, approachable, and warm",
    attributes: {
      formality: 2,
      technicality: 2,
      emotion: 4,
      urgency: 3
    },
    examples: {
      good: [
        "We'd love to help you achieve your goals",
        "Let's explore how we can work together"
      ],
      bad: [
        "Our corporation shall endeavor to facilitate",
        "Pursuant to our discussion regarding"
      ]
    },
    keywords: {
      preferred: ["help", "love", "explore", "together", "your"],
      avoided: ["corporation", "endeavor", "facilitate", "pursuant"]
    }
  }
}
```

### 2.2 Template Field Types

```typescript
interface FieldValidation {
  type: string
  rules: ValidationRule[]
  errorMessages: Record<string, string>
}

const fieldValidations: Record<string, FieldValidation> = {
  short_text: {
    type: 'string',
    rules: [
      { name: 'required', check: (v) => v?.length > 0 },
      { name: 'maxLength', check: (v) => v?.length <= 255 },
      { name: 'minLength', check: (v) => v?.length >= 3 }
    ],
    errorMessages: {
      required: 'This field is required',
      maxLength: 'Maximum 255 characters allowed',
      minLength: 'Minimum 3 characters required'
    }
  },
  
  long_text: {
    type: 'string',
    rules: [
      { name: 'required', check: (v) => v?.length > 0 },
      { name: 'maxLength', check: (v) => v?.length <= 5000 },
      { name: 'minLength', check: (v) => v?.length >= 10 }
    ],
    errorMessages: {
      required: 'This field is required',
      maxLength: 'Maximum 5000 characters allowed',
      minLength: 'Minimum 10 characters required'
    }
  },
  
  rich_text: {
    type: 'html',
    rules: [
      { name: 'required', check: (v) => stripHtml(v)?.length > 0 },
      { name: 'maxLength', check: (v) => stripHtml(v)?.length <= 10000 },
      { name: 'validHtml', check: (v) => isValidHtml(v) },
      { name: 'noScripts', check: (v) => !v?.includes('<script') }
    ],
    errorMessages: {
      required: 'This field is required',
      maxLength: 'Maximum 10000 characters allowed',
      validHtml: 'Please enter valid HTML',
      noScripts: 'Scripts are not allowed'
    }
  },
  
  url: {
    type: 'string',
    rules: [
      { name: 'required', check: (v) => v?.length > 0 },
      { name: 'validUrl', check: (v) => /^https?:\/\/.+\..+/.test(v) },
      { name: 'httpsOnly', check: (v) => v?.startsWith('https://') }
    ],
    errorMessages: {
      required: 'URL is required',
      validUrl: 'Please enter a valid URL',
      httpsOnly: 'Only HTTPS URLs are allowed'
    }
  },
  
  email: {
    type: 'string',
    rules: [
      { name: 'required', check: (v) => v?.length > 0 },
      { name: 'validEmail', check: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
    ],
    errorMessages: {
      required: 'Email is required',
      validEmail: 'Please enter a valid email address'
    }
  },
  
  number: {
    type: 'number',
    rules: [
      { name: 'required', check: (v) => v !== null && v !== undefined },
      { name: 'min', check: (v, min) => v >= min },
      { name: 'max', check: (v, max) => v <= max }
    ],
    errorMessages: {
      required: 'This field is required',
      min: 'Value must be at least {min}',
      max: 'Value must be at most {max}'
    }
  },
  
  date: {
    type: 'date',
    rules: [
      { name: 'required', check: (v) => v !== null },
      { name: 'future', check: (v) => new Date(v) > new Date() },
      { name: 'past', check: (v) => new Date(v) < new Date() }
    ],
    errorMessages: {
      required: 'Date is required',
      future: 'Date must be in the future',
      past: 'Date must be in the past'
    }
  },
  
  image: {
    type: 'file',
    rules: [
      { name: 'required', check: (v) => v !== null },
      { name: 'fileType', check: (v) => /\.(jpg|jpeg|png|webp|svg)$/i.test(v.name) },
      { name: 'fileSize', check: (v) => v.size <= 5 * 1024 * 1024 } // 5MB
    ],
    errorMessages: {
      required: 'Image is required',
      fileType: 'Only JPG, PNG, WebP, and SVG files are allowed',
      fileSize: 'Image must be less than 5MB'
    }
  }
}
```

### 2.3 Workflow Templates

```typescript
const defaultWorkflowTemplates = {
  simple_review: {
    name: "Simple Review",
    description: "Single reviewer approval",
    steps: [
      {
        id: "review",
        name: "Review",
        type: "approval",
        assignee: "brand_manager",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 24
      }
    ]
  },
  
  marketing_legal: {
    name: "Marketing + Legal Review",
    description: "Marketing review followed by legal approval",
    steps: [
      {
        id: "marketing_review",
        name: "Marketing Review",
        type: "approval",
        assignee: "brand_manager",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 24
      },
      {
        id: "legal_review",
        name: "Legal Review",
        type: "approval",
        assignee: "legal_team",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 48,
        prerequisites: ["marketing_review.approved"]
      }
    ]
  },
  
  full_approval: {
    name: "Full Approval Chain",
    description: "Brand, Legal, and Executive approval",
    steps: [
      {
        id: "brand_review",
        name: "Brand Review",
        type: "approval",
        assignee: "brand_manager",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 24
      },
      {
        id: "legal_review",
        name: "Legal Review",
        type: "parallel_approval",
        assignee: "legal_team",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 48
      },
      {
        id: "compliance_review",
        name: "Compliance Review",
        type: "parallel_approval",
        assignee: "compliance_team",
        actions: ["approve", "reject", "request_changes"],
        sla_hours: 48
      },
      {
        id: "executive_approval",
        name: "Executive Approval",
        type: "approval",
        assignee: "executive",
        actions: ["approve", "reject"],
        sla_hours: 72,
        prerequisites: ["brand_review.approved", "legal_review.approved", "compliance_review.approved"]
      }
    ]
  }
}
```

---

## 3. AI Prompt Templates

### 3.1 Content Generation Prompts

```typescript
const contentGenerationPrompts = {
  blog_post: {
    system: `You are a professional content writer for {brand_name}. 
Your writing style is {brand_voice_description}.
Brand guidelines: {brand_guidelines}
Target audience: {target_audience}`,
    
    user: `Write a blog post about {topic}.
Requirements:
- Length: {word_count} words
- Include keywords: {keywords}
- Tone: {tone_attributes}
- Call to action: {cta_type}

Context: {additional_context}`,
    
    parameters: {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9
    }
  },
  
  product_description: {
    system: `You are a product marketing specialist for {brand_name}.
Focus on benefits over features.
Brand voice: {brand_voice_description}
Compliance requirements: {compliance_rules}`,
    
    user: `Write a compelling product description for {product_name}.
Product details: {product_details}
Key benefits: {benefits}
Target customer: {target_customer}
Required claims: {claims}
Avoid claims: {restricted_claims}`,
    
    parameters: {
      temperature: 0.6,
      max_tokens: 500,
      top_p: 0.8
    }
  },
  
  social_media: {
    system: `You are a social media manager for {brand_name}.
Platform: {platform}
Character limit: {char_limit}
Brand voice: {brand_voice_description}`,
    
    user: `Create a {platform} post about {topic}.
Include: {requirements}
Hashtags: {hashtag_count} relevant hashtags
Emoji usage: {emoji_level}
Call to action: {cta}`,
    
    parameters: {
      temperature: 0.8,
      max_tokens: 280,
      top_p: 0.9
    }
  },
  
  email_campaign: {
    system: `You are an email marketing specialist for {brand_name}.
Campaign type: {campaign_type}
Brand guidelines: {brand_guidelines}`,
    
    user: `Write an email for {campaign_name}.
Subject line requirements: {subject_requirements}
Preview text: {preview_requirements}
Body sections: {body_sections}
Personalization tokens: {personalization_tokens}
CTA: {cta_details}`,
    
    parameters: {
      temperature: 0.7,
      max_tokens: 1000,
      top_p: 0.85
    }
  }
}
```

### 3.2 AI Enhancement Prompts

```typescript
const enhancementPrompts = {
  improve_clarity: {
    system: "You are an editor focused on improving clarity and readability.",
    user: `Improve the clarity of this text while maintaining the meaning and tone:
{original_text}

Requirements:
- Simplify complex sentences
- Remove jargon unless necessary
- Improve flow between sentences
- Maintain brand voice: {brand_voice}`,
    parameters: { temperature: 0.5 }
  },
  
  add_keywords: {
    system: "You are an SEO specialist who naturally incorporates keywords.",
    user: `Revise this text to naturally include these keywords: {keywords}
Original text: {original_text}

Requirements:
- Maintain natural flow
- Don't force keywords
- Keep original meaning
- Target keyword density: 1-2%`,
    parameters: { temperature: 0.6 }
  },
  
  check_claims: {
    system: "You are a compliance specialist reviewing marketing claims.",
    user: `Review this content for potentially problematic claims:
{content}

Allowed claims: {allowed_claims}
Restricted claims: {restricted_claims}
Region: {region}

Identify any claims that might need substantiation or removal.`,
    parameters: { temperature: 0.3 }
  },
  
  translate_content: {
    system: "You are a professional translator specializing in marketing content.",
    user: `Translate this content from {source_language} to {target_language}:
{content}

Requirements:
- Maintain brand voice
- Adapt cultural references
- Keep marketing effectiveness
- Preserve SEO keywords where possible: {keywords}`,
    parameters: { temperature: 0.4 }
  }
}
```

---

## 4. Workflow Engine Logic

### 4.1 Workflow State Machine

```typescript
interface WorkflowState {
  workflowId: string
  contentId: string
  currentStep: string
  status: 'active' | 'completed' | 'cancelled'
  history: StepHistory[]
  startedAt: Date
  completedAt?: Date
}

interface StepHistory {
  stepId: string
  action: string
  actor: string
  timestamp: Date
  comment?: string
  duration: number // minutes
}

class WorkflowEngine {
  async processAction(
    workflowId: string, 
    stepId: string, 
    action: string, 
    actor: string, 
    comment?: string
  ): Promise<WorkflowState> {
    const workflow = await this.getWorkflow(workflowId)
    const currentStep = workflow.steps.find(s => s.id === stepId)
    
    // Validate action is allowed
    if (!currentStep.actions.includes(action)) {
      throw new Error(`Action ${action} not allowed for step ${stepId}`)
    }
    
    // Validate actor has permission
    if (!this.canAct(actor, currentStep.assignee)) {
      throw new Error(`User ${actor} cannot perform actions on this step`)
    }
    
    // Record action
    const history: StepHistory = {
      stepId,
      action,
      actor,
      timestamp: new Date(),
      comment,
      duration: this.calculateDuration(workflow.history, stepId)
    }
    
    workflow.history.push(history)
    
    // Determine next step
    if (action === 'approve') {
      const nextStep = this.findNextStep(workflow, currentStep)
      if (nextStep) {
        workflow.currentStep = nextStep.id
        await this.notifyAssignee(nextStep, workflow)
      } else {
        workflow.status = 'completed'
        workflow.completedAt = new Date()
        await this.onWorkflowComplete(workflow)
      }
    } else if (action === 'reject') {
      workflow.status = 'completed'
      workflow.completedAt = new Date()
      await this.onWorkflowRejected(workflow)
    } else if (action === 'request_changes') {
      // Stay on current step but notify content owner
      await this.notifyChangesRequested(workflow, comment)
    }
    
    // Check SLA
    if (this.isOverSLA(currentStep, history)) {
      await this.notifySLABreach(workflow, currentStep)
    }
    
    return workflow
  }
  
  private findNextStep(workflow: Workflow, currentStep: Step): Step | null {
    // Check if there are steps that depend on current step
    const dependentSteps = workflow.steps.filter(step => 
      step.prerequisites?.includes(`${currentStep.id}.approved`)
    )
    
    // Find steps where all prerequisites are met
    const readySteps = dependentSteps.filter(step =>
      this.allPrerequisitesMet(step, workflow.history)
    )
    
    // Return the first ready step (or implement priority logic)
    return readySteps[0] || null
  }
  
  private allPrerequisitesMet(step: Step, history: StepHistory[]): boolean {
    if (!step.prerequisites) return true
    
    return step.prerequisites.every(prereq => {
      const [stepId, action] = prereq.split('.')
      return history.some(h => h.stepId === stepId && h.action === action)
    })
  }
}
```

### 4.2 Notification Logic

```typescript
interface NotificationTemplate {
  subject: string
  body: string
  variables: string[]
}

const workflowNotifications: Record<string, NotificationTemplate> = {
  task_assigned: {
    subject: "New task: Review {content_title}",
    body: `Hello {assignee_name},

You have a new {step_name} task for "{content_title}".

Brand: {brand_name}
Submitted by: {submitter_name}
Due: {due_date}

{custom_message}

Please review at: {review_link}

Best regards,
MixerAI`,
    variables: ['assignee_name', 'step_name', 'content_title', 'brand_name', 'submitter_name', 'due_date', 'custom_message', 'review_link']
  },
  
  changes_requested: {
    subject: "Changes requested for {content_title}",
    body: `Hello {content_owner},

{reviewer_name} has requested changes to "{content_title}".

Reviewer comments:
{reviewer_comments}

Please address the feedback and resubmit for review.

View feedback: {content_link}

Best regards,
MixerAI`,
    variables: ['content_owner', 'reviewer_name', 'content_title', 'reviewer_comments', 'content_link']
  },
  
  content_approved: {
    subject: "✅ {content_title} has been approved",
    body: `Hello {content_owner},

Great news! Your content "{content_title}" has been approved by {approver_name}.

Next steps:
{next_steps}

View content: {content_link}

Best regards,
MixerAI`,
    variables: ['content_owner', 'content_title', 'approver_name', 'next_steps', 'content_link']
  },
  
  sla_warning: {
    subject: "⚠️ Task approaching deadline: {content_title}",
    body: `Hello {assignee_name},

Your {step_name} task for "{content_title}" is due in {hours_remaining} hours.

Please complete your review soon to avoid delays.

Review now: {review_link}

Best regards,
MixerAI`,
    variables: ['assignee_name', 'step_name', 'content_title', 'hours_remaining', 'review_link']
  }
}
```

---

## 5. Claims Validation Rules

### 5.1 Claims Hierarchy

```typescript
interface Claim {
  id: string
  category: string
  subcategory: string
  claim_text: string
  substantiation_required: boolean
  regions: string[] // regions where allowed
  restricted_regions: string[] // regions where NOT allowed
  required_disclaimer?: string
  alternatives: string[] // suggested alternatives if not allowed
}

class ClaimsValidator {
  validateContent(content: string, region: string, category: string): ValidationResult {
    const violations: Violation[] = []
    const warnings: Warning[] = []
    const suggestions: Suggestion[] = []
    
    // Get applicable claims for region and category
    const claims = this.getClaimsForRegion(region, category)
    
    // Check for restricted claims
    claims.restricted.forEach(claim => {
      if (this.containsClaim(content, claim)) {
        violations.push({
          claim: claim,
          severity: 'high',
          message: `Claim "${claim.claim_text}" is not allowed in ${region}`,
          alternatives: claim.alternatives
        })
      }
    })
    
    // Check for claims needing substantiation
    claims.substantiation.forEach(claim => {
      if (this.containsClaim(content, claim)) {
        warnings.push({
          claim: claim,
          severity: 'medium',
          message: `Claim "${claim.claim_text}" requires substantiation`,
          action: 'Provide scientific evidence or studies'
        })
      }
    })
    
    // Check for missing disclaimers
    claims.disclaimer.forEach(claim => {
      if (this.containsClaim(content, claim) && !content.includes(claim.required_disclaimer)) {
        warnings.push({
          claim: claim,
          severity: 'medium',
          message: `Claim "${claim.claim_text}" requires disclaimer`,
          action: `Add: "${claim.required_disclaimer}"`
        })
      }
    })
    
    // Suggest stronger claims if available
    claims.upgrades.forEach(upgrade => {
      if (this.containsClaim(content, upgrade.weak)) {
        suggestions.push({
          original: upgrade.weak.claim_text,
          suggested: upgrade.strong.claim_text,
          reason: 'Stronger claim available with same substantiation'
        })
      }
    })
    
    return { violations, warnings, suggestions, isValid: violations.length === 0 }
  }
  
  private containsClaim(content: string, claim: Claim): boolean {
    // Smart matching - not just exact text
    const variations = this.generateVariations(claim.claim_text)
    const contentLower = content.toLowerCase()
    
    return variations.some(variation => {
      // Use regex for flexible matching
      const pattern = new RegExp(`\\b${this.escapeRegex(variation)}\\b`, 'i')
      return pattern.test(content)
    })
  }
  
  private generateVariations(claimText: string): string[] {
    const variations = [claimText]
    
    // Add common variations
    variations.push(claimText.toLowerCase())
    variations.push(claimText.replace(/[0-9]+%/, '[0-9]+%')) // Match any percentage
    variations.push(claimText.replace(/\s+/g, '\\s+')) // Flexible whitespace
    
    return variations
  }
}
```

### 5.2 Region-Specific Rules

```typescript
const regionSpecificRules = {
  US: {
    health_claims: {
      restricted: [
        "cures", "treats", "prevents disease",
        "FDA approved" // unless actually FDA approved
      ],
      requires_disclaimer: [
        "supports immune system",
        "promotes heart health",
        "aids digestion"
      ],
      disclaimer: "*These statements have not been evaluated by the FDA."
    },
    
    environmental_claims: {
      requires_substantiation: [
        "biodegradable", "recyclable", "sustainable",
        "carbon neutral", "eco-friendly"
      ]
    }
  },
  
  EU: {
    health_claims: {
      must_be_authorized: true,
      authorized_list: "https://ec.europa.eu/food/safety/labelling_nutrition/claims/register/",
      restricted: [
        "slimming", "weight loss" // unless authorized
      ]
    },
    
    cosmetic_claims: {
      restricted: [
        "anti-aging", "reverses aging",
        "permanent results"
      ],
      requires_evidence: [
        "clinically proven",
        "dermatologist tested"
      ]
    }
  },
  
  CA: {
    bilingual_requirements: {
      french_required: true,
      equal_prominence: true
    },
    
    health_claims: {
      natural_health_product_rules: true,
      requires_npn: true // Natural Product Number
    }
  }
}
```

---

## 6. Permission Matrices

### 6.1 Role-Based Permissions

```typescript
const permissionMatrix = {
  super_admin: {
    brands: ['create', 'read', 'update', 'delete', 'archive'],
    users: ['create', 'read', 'update', 'delete', 'invite'],
    content: ['create', 'read', 'update', 'delete', 'publish', 'archive'],
    templates: ['create', 'read', 'update', 'delete', 'share'],
    workflows: ['create', 'read', 'update', 'delete', 'override'],
    claims: ['create', 'read', 'update', 'delete', 'approve'],
    analytics: ['view_all', 'export', 'configure'],
    billing: ['view', 'update', 'change_plan'],
    settings: ['view', 'update_all']
  },
  
  brand_admin: {
    brands: ['read', 'update'], // only assigned brands
    users: ['read', 'invite'], // only for assigned brands
    content: ['create', 'read', 'update', 'delete', 'publish', 'archive'],
    templates: ['create', 'read', 'update', 'share'], // within brand
    workflows: ['create', 'read', 'update'], // cannot delete
    claims: ['read', 'suggest'], // cannot approve
    analytics: ['view_brand', 'export'], // only brand data
    billing: [], // no access
    settings: ['view', 'update_brand'] // brand settings only
  },
  
  content_manager: {
    brands: ['read'], // only assigned brands
    users: ['read'], // only team members
    content: ['create', 'read', 'update', 'submit'], // cannot publish directly
    templates: ['read', 'use'], // cannot modify
    workflows: ['read', 'participate'], // cannot configure
    claims: ['read'], // view only
    analytics: ['view_own', 'view_team'], // limited scope
    billing: [], // no access
    settings: ['view'] // read only
  },
  
  content_creator: {
    brands: ['read'], // only assigned brands
    users: ['read'], // only direct team
    content: ['create', 'read', 'update:own', 'submit'], // only own content
    templates: ['read', 'use'],
    workflows: ['read', 'participate:assigned'], // only when assigned
    claims: ['read'],
    analytics: ['view_own'], // only own metrics
    billing: [],
    settings: ['view']
  },
  
  reviewer: {
    brands: ['read'],
    users: ['read'],
    content: ['read', 'comment', 'approve', 'reject'], // cannot edit
    templates: ['read'],
    workflows: ['read', 'participate:assigned'],
    claims: ['read', 'validate'],
    analytics: ['view_assigned'], // only content they review
    billing: [],
    settings: ['view']
  },
  
  viewer: {
    brands: ['read'],
    users: ['read'],
    content: ['read', 'comment'], // read and comment only
    templates: ['read'],
    workflows: ['read'],
    claims: ['read'],
    analytics: ['view_limited'], // high-level only
    billing: [],
    settings: []
  }
}

// Helper function to check permissions
function hasPermission(
  userRole: string, 
  resource: string, 
  action: string, 
  context?: { ownerId?: string, brandId?: string }
): boolean {
  const permissions = permissionMatrix[userRole]?.[resource] || []
  
  // Check for direct permission
  if (permissions.includes(action)) return true
  
  // Check for contextual permissions
  if (action.includes(':')) {
    const [baseAction, condition] = action.split(':')
    
    if (condition === 'own' && context?.ownerId === context?.userId) {
      return permissions.includes(baseAction + ':own')
    }
    
    if (condition === 'assigned' && context?.assignedTo === context?.userId) {
      return permissions.includes(baseAction + ':assigned')
    }
  }
  
  return false
}
```

### 6.2 Feature Access Matrix

```typescript
const featureAccess = {
  starter_plan: {
    brands: 1,
    users: 5,
    content_items: 100,
    ai_generations: 500, // per month
    templates: 10,
    workflows: ['simple_review'],
    storage: '10GB',
    api_access: false,
    custom_domain: false,
    sso: false
  },
  
  professional_plan: {
    brands: 5,
    users: 25,
    content_items: 1000,
    ai_generations: 5000,
    templates: 50,
    workflows: ['simple_review', 'marketing_legal'],
    storage: '100GB',
    api_access: true,
    custom_domain: true,
    sso: false
  },
  
  enterprise_plan: {
    brands: 'unlimited',
    users: 'unlimited',
    content_items: 'unlimited',
    ai_generations: 'unlimited',
    templates: 'unlimited',
    workflows: 'all',
    storage: '1TB+',
    api_access: true,
    custom_domain: true,
    sso: true,
    dedicated_support: true,
    custom_integrations: true
  }
}
```

---

## 7. UI/UX Specifications

### 7.1 Empty States

```typescript
const emptyStates = {
  content_list: {
    icon: 'FileText',
    title: 'No content yet',
    description: 'Create your first piece of content to get started',
    action: {
      label: 'Create Content',
      link: '/content/new'
    },
    illustration: '/images/empty-content.svg'
  },
  
  brand_list: {
    icon: 'Building',
    title: 'No brands created',
    description: 'Set up your first brand to start managing content',
    action: {
      label: 'Add Brand',
      link: '/brands/new'
    }
  },
  
  template_list: {
    icon: 'Layout',
    title: 'No templates available',
    description: 'Create templates to standardize your content creation',
    action: {
      label: 'Create Template',
      link: '/templates/new'
    },
    alternative: {
      label: 'Browse Template Library',
      link: '/templates/library'
    }
  },
  
  workflow_tasks: {
    icon: 'CheckCircle',
    title: 'All caught up!',
    description: 'You have no pending tasks',
    illustration: '/images/all-done.svg'
  },
  
  analytics: {
    icon: 'BarChart',
    title: 'No data available yet',
    description: 'Analytics will appear once you start creating content',
    note: 'Data typically appears within 24 hours'
  },
  
  search_results: {
    icon: 'Search',
    title: 'No results found',
    description: 'Try adjusting your filters or search terms',
    suggestions: [
      'Check your spelling',
      'Try more general keywords',
      'Remove some filters'
    ]
  }
}
```

### 7.2 Loading States

```typescript
const loadingPatterns = {
  // Skeleton screens for lists
  contentListSkeleton: `
    <div class="space-y-4">
      {[1,2,3,4,5].map(i => (
        <div key={i} class="bg-white p-6 rounded-lg shadow animate-pulse">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div class="flex gap-4">
                <div class="h-3 bg-gray-200 rounded w-20"></div>
                <div class="h-3 bg-gray-200 rounded w-20"></div>
                <div class="h-3 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
            <div class="h-8 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  `,
  
  // Shimmer effect for cards
  cardSkeleton: `
    <div class="bg-white rounded-lg shadow overflow-hidden">
      <div class="animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 h-48"></div>
      <div class="p-6">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
        <div class="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>
  `,
  
  // Progress indicators for AI generation
  aiGenerationStates: [
    { percent: 10, message: "Analyzing requirements..." },
    { percent: 30, message: "Researching topic..." },
    { percent: 50, message: "Generating content..." },
    { percent: 70, message: "Applying brand voice..." },
    { percent: 90, message: "Finalizing content..." },
    { percent: 100, message: "Complete!" }
  ],
  
  // Inline loading states
  buttonLoading: {
    saving: { icon: 'spinner', text: 'Saving...' },
    generating: { icon: 'sparkles', text: 'Generating...' },
    publishing: { icon: 'upload', text: 'Publishing...' },
    deleting: { icon: 'trash', text: 'Deleting...' }
  }
}
```

### 7.3 Error States

```typescript
const errorMessages = {
  // Network errors
  network: {
    offline: {
      title: "You're offline",
      message: "Check your internet connection and try again",
      icon: "WifiOff",
      retry: true
    },
    timeout: {
      title: "Request timed out",
      message: "The server took too long to respond. Please try again.",
      icon: "Clock",
      retry: true
    },
    server_error: {
      title: "Something went wrong",
      message: "We're having trouble connecting to our servers. Please try again later.",
      icon: "ServerCrash",
      retry: true
    }
  },
  
  // Validation errors
  validation: {
    required_field: "{field} is required",
    invalid_email: "Please enter a valid email address",
    password_weak: "Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number",
    file_too_large: "File size must be less than {maxSize}",
    invalid_file_type: "File type must be {allowedTypes}",
    duplicate_name: "A {resource} with this name already exists"
  },
  
  // Permission errors
  permissions: {
    unauthorized: {
      title: "Access denied",
      message: "You don't have permission to view this page",
      action: "Go to dashboard",
      link: "/dashboard"
    },
    expired_session: {
      title: "Session expired",
      message: "Please log in again to continue",
      action: "Log in",
      link: "/login"
    },
    plan_limit: {
      title: "Plan limit reached",
      message: "You've reached the {limit} limit for your plan",
      action: "Upgrade plan",
      link: "/settings/billing"
    }
  },
  
  // AI errors
  ai: {
    generation_failed: {
      title: "Generation failed",
      message: "We couldn't generate content. Please try again or adjust your inputs.",
      suggestions: [
        "Try a different prompt",
        "Reduce the content length",
        "Check for restricted terms"
      ]
    },
    quota_exceeded: {
      title: "AI quota exceeded",
      message: "You've used all your AI generations for this month",
      action: "View usage",
      link: "/settings/usage"
    },
    content_filtered: {
      title: "Content filtered",
      message: "The generated content was filtered due to policy violations. Please adjust your prompt."
    }
  }
}
```

---

## 8. Integration Configurations

### 8.1 Azure OpenAI Configuration

```typescript
const azureOpenAIConfig = {
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: '2024-02-15-preview',
  
  deployments: {
    gpt4: {
      name: 'gpt-4-deployment',
      model: 'gpt-4',
      maxTokens: 8192,
      rateLimit: {
        requestsPerMinute: 60,
        tokensPerMinute: 150000
      }
    },
    gpt35turbo: {
      name: 'gpt-35-turbo-deployment',
      model: 'gpt-35-turbo',
      maxTokens: 4096,
      rateLimit: {
        requestsPerMinute: 300,
        tokensPerMinute: 90000
      }
    },
    embeddings: {
      name: 'text-embedding-ada-002',
      model: 'text-embedding-ada-002',
      maxTokens: 8191,
      dimensions: 1536
    }
  },
  
  // Fallback configuration
  fallback: {
    enabled: true,
    providers: ['openai', 'anthropic'],
    strategy: 'sequential' // or 'loadbalance'
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoff: 'exponential',
    initialDelay: 1000,
    maxDelay: 10000
  }
}
```

### 8.2 Email Configuration (Resend)

```typescript
const emailConfig = {
  from: {
    default: 'MixerAI <noreply@mixerai.com>',
    support: 'MixerAI Support <support@mixerai.com>',
    notifications: 'MixerAI Notifications <notifications@mixerai.com>'
  },
  
  replyTo: {
    support: 'support@mixerai.com',
    noreply: null
  },
  
  templates: {
    base: {
      header: {
        logo: 'https://mixerai.com/logo.png',
        bgColor: '#1a1a1a',
        textColor: '#ffffff'
      },
      footer: {
        links: [
          { text: 'Unsubscribe', url: '{unsubscribe_url}' },
          { text: 'Privacy Policy', url: 'https://mixerai.com/privacy' },
          { text: 'Support', url: 'https://mixerai.com/support' }
        ],
        copyright: '© 2024 MixerAI. All rights reserved.'
      },
      styles: {
        primaryColor: '#007bff',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        buttonStyle: 'background: #007bff; color: white; padding: 12px 24px; border-radius: 6px;'
      }
    }
  },
  
  // Rate limits
  rateLimits: {
    perUser: {
      hourly: 20,
      daily: 100
    },
    perDomain: {
      hourly: 500,
      daily: 5000
    }
  }
}
```

---

## 9. Error Handling Guide

### 9.1 API Error Responses

```typescript
interface APIError {
  error: {
    code: string
    message: string
    details?: any
    timestamp: string
    requestId: string
  }
}

const errorCodes = {
  // Authentication errors (401)
  AUTH_INVALID_TOKEN: 'Invalid or expired authentication token',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password',
  
  // Authorization errors (403)
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action',
  AUTHZ_BRAND_ACCESS_DENIED: 'You do not have access to this brand',
  AUTHZ_PLAN_LIMIT_EXCEEDED: 'This feature requires a higher plan',
  
  // Validation errors (400)
  VALIDATION_REQUIRED_FIELD: '{field} is required',
  VALIDATION_INVALID_FORMAT: '{field} has an invalid format',
  VALIDATION_DUPLICATE_VALUE: '{field} already exists',
  
  // Resource errors (404)
  RESOURCE_NOT_FOUND: 'The requested {resource} was not found',
  
  // Conflict errors (409)
  CONFLICT_RESOURCE_MODIFIED: 'The resource was modified by another user',
  CONFLICT_DUPLICATE_NAME: 'A {resource} with this name already exists',
  
  // Rate limit errors (429)
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again in {retryAfter} seconds',
  
  // Server errors (500)
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again.',
  
  // Service errors (503)
  SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
  AI_SERVICE_ERROR: 'AI service is temporarily unavailable'
}

// Error handler middleware
function handleError(error: any): APIError {
  const requestId = generateRequestId()
  
  if (error.code in errorCodes) {
    return {
      error: {
        code: error.code,
        message: interpolate(errorCodes[error.code], error.context),
        details: error.details,
        timestamp: new Date().toISOString(),
        requestId
      }
    }
  }
  
  // Log unexpected errors
  logger.error('Unexpected error', { error, requestId })
  
  return {
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: errorCodes.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      requestId
    }
  }
}
```

### 9.2 Client-Side Error Handling

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    errorReporter.log(error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      )
    }
    
    return this.props.children
  }
}

// Global error handler for unhandled promises
window.addEventListener('unhandledrejection', event => {
  errorReporter.log(event.reason)
  
  // Show user-friendly error
  showToast({
    type: 'error',
    title: 'Something went wrong',
    message: 'Please refresh the page and try again'
  })
})

// API error interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login'
    } else if (error.response?.status === 403) {
      showToast({
        type: 'error',
        title: 'Access Denied',
        message: error.response.data.error.message
      })
    } else if (error.response?.status === 429) {
      showToast({
        type: 'warning',
        title: 'Slow Down',
        message: 'Too many requests. Please wait a moment.'
      })
    }
    
    return Promise.reject(error)
  }
)
```

---

## 10. Search & Filtering Logic

### 10.1 Search Implementation

```typescript
interface SearchConfig {
  fields: SearchField[]
  weights: Record<string, number>
  fuzziness: number
  highlighting: boolean
}

const contentSearchConfig: SearchConfig = {
  fields: [
    { name: 'title', type: 'text', boost: 3 },
    { name: 'body', type: 'text', boost: 1 },
    { name: 'meta_description', type: 'text', boost: 2 },
    { name: 'tags', type: 'keyword', boost: 2 },
    { name: 'brand.name', type: 'keyword', boost: 1 }
  ],
  weights: {
    exactMatch: 10,
    prefixMatch: 5,
    fuzzyMatch: 2,
    synonymMatch: 3
  },
  fuzziness: 0.8, // 80% similarity for fuzzy matching
  highlighting: true
}

// Search query builder
function buildSearchQuery(searchTerm: string, filters: FilterSet): DatabaseQuery {
  const query = {
    bool: {
      must: [],
      filter: [],
      should: []
    }
  }
  
  // Full-text search
  if (searchTerm) {
    query.bool.must.push({
      multi_match: {
        query: searchTerm,
        fields: contentSearchConfig.fields.map(f => 
          `${f.name}^${f.boost}`
        ),
        type: 'best_fields',
        fuzziness: 'AUTO'
      }
    })
  }
  
  // Apply filters
  if (filters.brand) {
    query.bool.filter.push({ term: { brand_id: filters.brand } })
  }
  
  if (filters.status) {
    query.bool.filter.push({ term: { status: filters.status } })
  }
  
  if (filters.dateRange) {
    query.bool.filter.push({
      range: {
        created_at: {
          gte: filters.dateRange.start,
          lte: filters.dateRange.end
        }
      }
    })
  }
  
  if (filters.author) {
    query.bool.filter.push({ term: { created_by: filters.author } })
  }
  
  // Boost recent content
  query.bool.should.push({
    range: {
      updated_at: {
        gte: 'now-7d',
        boost: 2
      }
    }
  })
  
  return query
}
```

### 10.2 Filter Configurations

```typescript
const filterConfigs = {
  content: {
    status: {
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft', icon: 'Edit' },
        { value: 'in_review', label: 'In Review', icon: 'Clock' },
        { value: 'approved', label: 'Approved', icon: 'CheckCircle' },
        { value: 'published', label: 'Published', icon: 'Globe' },
        { value: 'archived', label: 'Archived', icon: 'Archive' }
      ],
      multiple: true
    },
    
    brand: {
      type: 'select',
      options: 'dynamic', // Loaded from user's brands
      multiple: true,
      searchable: true
    },
    
    contentType: {
      type: 'select',
      options: 'dynamic', // Loaded from templates
      multiple: true,
      groupBy: 'category'
    },
    
    dateRange: {
      type: 'dateRange',
      presets: [
        { label: 'Today', value: { start: 'today', end: 'today' } },
        { label: 'Last 7 days', value: { start: '-7d', end: 'today' } },
        { label: 'Last 30 days', value: { start: '-30d', end: 'today' } },
        { label: 'This month', value: { start: 'month-start', end: 'month-end' } },
        { label: 'Custom', value: 'custom' }
      ]
    },
    
    author: {
      type: 'user-select',
      multiple: true,
      includeTeams: true
    },
    
    tags: {
      type: 'tag-input',
      suggestions: 'dynamic',
      multiple: true
    },
    
    workflow: {
      type: 'select',
      options: 'dynamic',
      includeStep: true // Can filter by workflow AND current step
    }
  },
  
  // Saved filter sets
  savedFilters: [
    {
      name: 'My Drafts',
      filters: { status: ['draft'], author: 'currentUser' },
      icon: 'Edit'
    },
    {
      name: 'Needs Review',
      filters: { status: ['in_review'], assignedTo: 'currentUser' },
      icon: 'Clock'
    },
    {
      name: 'Recently Published',
      filters: { status: ['published'], dateRange: { start: '-7d', end: 'today' } },
      icon: 'TrendingUp'
    }
  ]
}
```

### 10.3 Sort Options

```typescript
const sortOptions = {
  content: [
    { value: 'updated_at:desc', label: 'Recently Updated', default: true },
    { value: 'created_at:desc', label: 'Recently Created' },
    { value: 'title:asc', label: 'Title (A-Z)' },
    { value: 'title:desc', label: 'Title (Z-A)' },
    { value: 'status:asc', label: 'Status' },
    { value: 'score:desc', label: 'Quality Score' },
    { value: 'relevance', label: 'Relevance', onlyWithSearch: true }
  ],
  
  users: [
    { value: 'name:asc', label: 'Name (A-Z)', default: true },
    { value: 'email:asc', label: 'Email (A-Z)' },
    { value: 'created_at:desc', label: 'Recently Added' },
    { value: 'last_login:desc', label: 'Recently Active' }
  ],
  
  brands: [
    { value: 'name:asc', label: 'Name (A-Z)', default: true },
    { value: 'created_at:desc', label: 'Recently Created' },
    { value: 'content_count:desc', label: 'Most Content' },
    { value: 'user_count:desc', label: 'Most Users' }
  ]
}
```

---

## Summary

This implementation guide provides the specific details needed to build MixerAI 2.0 without access to the existing codebase. It covers:

1. **Business Logic** - Exact rules for content status, scoring, versioning
2. **Default Configurations** - Brand voices, field validations, workflow templates
3. **AI Prompts** - Complete prompt templates for all content types
4. **Workflow Engine** - State machine logic and notification templates
5. **Claims Validation** - Region-specific rules and validation logic
6. **Permissions** - Complete RBAC matrix and feature access
7. **UI/UX Details** - Empty states, loading patterns, error messages
8. **Integrations** - Azure OpenAI and email service configurations
9. **Error Handling** - Comprehensive error codes and handling
10. **Search & Filtering** - Implementation details for search functionality

Combined with the other PRD documents, a developer should now have all the information needed to rebuild MixerAI 2.0 from scratch.

---

[← Back to Master Index](./00-MASTER-INDEX.md) | [Related: Functional Requirements](./02-FUNCTIONAL-REQUIREMENTS.md)