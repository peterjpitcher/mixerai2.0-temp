# MixerAI 2.0 Testing Strategy
## Comprehensive Quality Assurance Plan

Version: 1.0  
Date: December 2024  
[← Back to Non-Functional Requirements](./10-NON-FUNCTIONAL-REQUIREMENTS.md) | [Related: Implementation Roadmap](./12-IMPLEMENTATION-ROADMAP.md)

---

## 📋 Table of Contents

1. [Testing Overview](#1-testing-overview)
2. [Unit Testing](#2-unit-testing)
3. [Integration Testing](#3-integration-testing)
4. [End-to-End Testing](#4-end-to-end-testing)
5. [Performance Testing](#5-performance-testing)
6. [Security Testing](#6-security-testing)
7. [AI/ML Testing](#7-aiml-testing)
8. [User Acceptance Testing](#8-user-acceptance-testing)
9. [Test Automation](#9-test-automation)
10. [Quality Metrics](#10-quality-metrics)

---

## 1. Testing Overview

### 1.1 Testing Philosophy

```yaml
Core Principles:
  Shift-Left Testing: Test early and often
  Automation First: Automate repetitive tests
  Risk-Based: Focus on critical paths
  Continuous Testing: Part of CI/CD pipeline
  Data-Driven: Decisions based on metrics
  
Testing Pyramid:
  Unit Tests: 60% - Fast, isolated, numerous
  Integration Tests: 25% - API contracts, services
  E2E Tests: 10% - Critical user journeys
  Manual Tests: 5% - Exploratory, UX validation
  
Quality Gates:
  Pre-Commit: Linting, unit tests
  Pre-Merge: All automated tests
  Pre-Deploy: Performance, security
  Post-Deploy: Smoke tests, monitoring
```

### 1.2 Test Environment Strategy

```yaml
Environments:
  Local Development:
    Purpose: Developer testing
    Data: Synthetic/mocked
    Reset: On demand
    
  CI Environment:
    Purpose: Automated testing
    Data: Minimal fixtures
    Reset: Every build
    
  Staging Environment:
    Purpose: Integration/E2E tests
    Data: Production-like subset
    Reset: Nightly
    
  Performance Environment:
    Purpose: Load/stress testing
    Data: Production volume
    Reset: Before each test
    
  Security Environment:
    Purpose: Security testing
    Data: Sanitized production
    Reset: As needed
```

### 1.3 Testing Tools & Technologies

```typescript
interface TestingStack {
  unit: {
    framework: 'Jest',
    coverage: 'Istanbul',
    mocking: 'Jest mocks + MSW',
    snapshot: 'Jest snapshots'
  },
  
  integration: {
    api: 'Supertest + Jest',
    database: 'Test containers',
    messaging: 'In-memory queues',
    contracts: 'Pact'
  },
  
  e2e: {
    framework: 'Playwright',
    visual: 'Percy',
    accessibility: 'axe-playwright',
    mobile: 'Playwright mobile'
  },
  
  performance: {
    load: 'k6',
    stress: 'k6 + Grafana',
    profiling: 'Node.js profiler',
    monitoring: 'Datadog APM'
  },
  
  security: {
    sast: 'SonarQube + Snyk',
    dast: 'OWASP ZAP',
    dependency: 'Snyk + Dependabot',
    secrets: 'GitLeaks'
  }
}
```

---

## 2. Unit Testing

### 2.1 Unit Test Standards

```typescript
// Test Structure Standard
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = createTestInput()
      const expected = createExpectedOutput()
      
      // Act
      const result = component.method(input)
      
      // Assert
      expect(result).toEqual(expected)
    })
    
    it('should handle edge case', () => {
      // Edge case testing
    })
    
    it('should handle error case', () => {
      // Error case testing
    })
  })
})

// Coverage Requirements
interface CoverageTargets {
  statements: 80,    // Minimum 80% statement coverage
  branches: 75,      // Minimum 75% branch coverage
  functions: 80,     // Minimum 80% function coverage
  lines: 80          // Minimum 80% line coverage
}
```

### 2.2 Frontend Unit Testing

```typescript
// React Component Testing
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ContentEditor } from '@/components/ContentEditor'

describe('ContentEditor', () => {
  const mockProps = {
    content: { id: '1', title: 'Test', body: 'Content' },
    onSave: jest.fn(),
    onCancel: jest.fn()
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('renders content correctly', () => {
    render(<ContentEditor {...mockProps} />)
    
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
  })
  
  it('calls onSave with updated content', async () => {
    render(<ContentEditor {...mockProps} />)
    
    const titleInput = screen.getByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } })
    
    const saveButton = screen.getByRole('button', { name: 'Save' })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledWith({
        ...mockProps.content,
        title: 'Updated Title'
      })
    })
  })
  
  it('shows validation errors', async () => {
    render(<ContentEditor {...mockProps} />)
    
    const titleInput = screen.getByLabelText('Title')
    fireEvent.change(titleInput, { target: { value: '' } })
    fireEvent.blur(titleInput)
    
    await waitFor(() => {
      expect(screen.getByText('Title is required')).toBeInTheDocument()
    })
  })
})
```

### 2.3 Backend Unit Testing

```typescript
// Service Testing
describe('ContentService', () => {
  let service: ContentService
  let mockRepository: jest.Mocked<ContentRepository>
  let mockEventBus: jest.Mocked<EventBus>
  
  beforeEach(() => {
    mockRepository = createMockRepository()
    mockEventBus = createMockEventBus()
    service = new ContentService(mockRepository, mockEventBus)
  })
  
  describe('createContent', () => {
    it('creates content with valid data', async () => {
      const input = {
        title: 'Test Content',
        brandId: 'brand-123',
        templateId: 'template-456'
      }
      
      const expectedContent = {
        id: 'content-789',
        ...input,
        status: 'draft',
        version: 1
      }
      
      mockRepository.create.mockResolvedValue(expectedContent)
      
      const result = await service.createContent(input)
      
      expect(result).toEqual(expectedContent)
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining(input)
      )
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ContentCreated',
          payload: expectedContent
        })
      )
    })
    
    it('validates required fields', async () => {
      const input = { title: '' } // Missing required fields
      
      await expect(service.createContent(input))
        .rejects.toThrow(ValidationError)
    })
    
    it('handles repository errors', async () => {
      mockRepository.create.mockRejectedValue(new Error('DB Error'))
      
      await expect(service.createContent(validInput))
        .rejects.toThrow('Failed to create content')
    })
  })
})
```

### 2.4 AI Service Unit Testing

```typescript
describe('AIContentGenerator', () => {
  let generator: AIContentGenerator
  let mockAIProvider: jest.Mocked<AIProvider>
  let mockCache: jest.Mocked<CacheService>
  
  beforeEach(() => {
    mockAIProvider = createMockAIProvider()
    mockCache = createMockCache()
    generator = new AIContentGenerator(mockAIProvider, mockCache)
  })
  
  it('generates content from template', async () => {
    const template = createTestTemplate()
    const context = createTestContext()
    const expectedPrompt = buildExpectedPrompt(template, context)
    
    mockAIProvider.complete.mockResolvedValue({
      text: 'Generated content',
      usage: { tokens: 100 }
    })
    
    const result = await generator.generateFromTemplate(template, context)
    
    expect(mockAIProvider.complete).toHaveBeenCalledWith(
      expect.stringContaining(expectedPrompt)
    )
    expect(result.content).toBe('Generated content')
    expect(result.tokensUsed).toBe(100)
  })
  
  it('uses cache for identical requests', async () => {
    const cachedResult = { content: 'Cached content', tokensUsed: 0 }
    mockCache.get.mockResolvedValue(cachedResult)
    
    const result = await generator.generateFromTemplate(template, context)
    
    expect(result).toEqual(cachedResult)
    expect(mockAIProvider.complete).not.toHaveBeenCalled()
  })
  
  it('handles AI provider errors gracefully', async () => {
    mockAIProvider.complete.mockRejectedValue(new Error('AI Error'))
    
    const result = await generator.generateFromTemplate(template, context)
    
    expect(result.error).toBeDefined()
    expect(result.fallback).toBe(true)
  })
})
```

---

## 3. Integration Testing

### 3.1 API Integration Tests

```typescript
// API Integration Test
describe('POST /api/content', () => {
  let app: Application
  let testUser: User
  let testBrand: Brand
  
  beforeAll(async () => {
    app = await createTestApp()
    await setupTestDatabase()
  })
  
  beforeEach(async () => {
    await cleanDatabase()
    testUser = await createTestUser({ role: 'editor' })
    testBrand = await createTestBrand({ ownerId: testUser.id })
  })
  
  afterAll(async () => {
    await teardownTestDatabase()
  })
  
  it('creates content with valid authentication', async () => {
    const token = generateAuthToken(testUser)
    const payload = {
      title: 'Integration Test Content',
      brandId: testBrand.id,
      templateId: 'template-123',
      fields: {
        body: 'Test content body'
      }
    }
    
    const response = await request(app)
      .post('/api/content')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Brand-Context', testBrand.id)
      .send(payload)
      .expect(201)
    
    expect(response.body).toMatchObject({
      success: true,
      data: expect.objectContaining({
        id: expect.any(String),
        title: payload.title,
        status: 'draft',
        brandId: testBrand.id
      })
    })
    
    // Verify database state
    const savedContent = await Content.findById(response.body.data.id)
    expect(savedContent).toBeDefined()
    expect(savedContent.createdBy).toBe(testUser.id)
  })
  
  it('enforces brand permissions', async () => {
    const otherBrand = await createTestBrand() // User has no access
    const token = generateAuthToken(testUser)
    
    await request(app)
      .post('/api/content')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Brand-Context', otherBrand.id)
      .send({ title: 'Unauthorized', brandId: otherBrand.id })
      .expect(403)
  })
  
  it('validates required fields', async () => {
    const token = generateAuthToken(testUser)
    
    const response = await request(app)
      .post('/api/content')
      .set('Authorization', `Bearer ${token}`)
      .send({}) // Missing required fields
      .expect(400)
    
    expect(response.body).toMatchObject({
      success: false,
      error: expect.objectContaining({
        code: 'VALIDATION_ERROR',
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: 'Title is required'
          })
        ])
      })
    })
  })
})
```

### 3.2 Database Integration Tests

```typescript
describe('ContentRepository Integration', () => {
  let repository: ContentRepository
  let dbConnection: Connection
  
  beforeAll(async () => {
    dbConnection = await createTestConnection()
    repository = new ContentRepository(dbConnection)
  })
  
  afterEach(async () => {
    await dbConnection.query('TRUNCATE TABLE content CASCADE')
  })
  
  afterAll(async () => {
    await dbConnection.close()
  })
  
  it('handles concurrent updates correctly', async () => {
    // Create initial content
    const content = await repository.create({
      title: 'Concurrent Test',
      brandId: 'brand-123',
      version: 1
    })
    
    // Simulate concurrent updates
    const update1 = repository.update(content.id, {
      title: 'Update 1',
      version: 1
    })
    
    const update2 = repository.update(content.id, {
      title: 'Update 2',
      version: 1
    })
    
    // One should succeed, one should fail
    const results = await Promise.allSettled([update1, update2])
    
    const succeeded = results.filter(r => r.status === 'fulfilled')
    const failed = results.filter(r => r.status === 'rejected')
    
    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(1)
    expect(failed[0].reason).toBeInstanceOf(OptimisticLockError)
  })
  
  it('maintains referential integrity', async () => {
    const brand = await createTestBrand()
    const content = await repository.create({
      title: 'Integrity Test',
      brandId: brand.id
    })
    
    // Try to delete brand (should fail due to content reference)
    await expect(
      dbConnection.query('DELETE FROM brands WHERE id = $1', [brand.id])
    ).rejects.toThrow(/foreign key constraint/)
    
    // Delete content first, then brand should succeed
    await repository.delete(content.id)
    await dbConnection.query('DELETE FROM brands WHERE id = $1', [brand.id])
  })
})
```

### 3.3 Service Integration Tests

```typescript
describe('Content Workflow Integration', () => {
  let contentService: ContentService
  let workflowService: WorkflowService
  let notificationService: NotificationService
  
  beforeEach(async () => {
    const container = await createTestContainer()
    contentService = container.get(ContentService)
    workflowService = container.get(WorkflowService)
    notificationService = container.get(NotificationService)
    
    jest.spyOn(notificationService, 'send')
  })
  
  it('completes full workflow lifecycle', async () => {
    // Create content
    const content = await contentService.create({
      title: 'Workflow Test',
      brandId: 'brand-123'
    })
    
    // Start workflow
    const workflow = await workflowService.start({
      contentId: content.id,
      workflowTemplateId: 'standard-review'
    })
    
    expect(workflow.status).toBe('active')
    expect(workflow.currentStep).toBe('brand-review')
    
    // Verify notification sent
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'task-assigned',
        recipientId: expect.any(String),
        data: expect.objectContaining({
          contentId: content.id,
          step: 'brand-review'
        })
      })
    )
    
    // Complete first step
    await workflowService.completeStep({
      workflowId: workflow.id,
      action: 'approve',
      comment: 'Looks good'
    })
    
    // Verify workflow advanced
    const updatedWorkflow = await workflowService.getById(workflow.id)
    expect(updatedWorkflow.currentStep).toBe('legal-review')
    
    // Complete workflow
    await workflowService.completeStep({
      workflowId: workflow.id,
      action: 'approve',
      comment: 'Legal approved'
    })
    
    // Verify content status updated
    const updatedContent = await contentService.getById(content.id)
    expect(updatedContent.status).toBe('approved')
  })
})
```

---

## 4. End-to-End Testing

### 4.1 Critical User Journeys

```typescript
// E2E Test: Content Creation Journey
test.describe('Content Creation Journey', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEditor(page)
    await navigateToDashboard(page)
  })
  
  test('creates content from template with AI', async ({ page }) => {
    // Navigate to content creation
    await page.click('text=Create Content')
    await page.waitForURL('**/content/new')
    
    // Select brand and template
    await page.selectOption('[data-testid=brand-select]', 'brand-123')
    await page.click('[data-testid=template-card-blog-post]')
    
    // Fill basic fields
    await page.fill('[data-testid=content-title]', 'E2E Test Blog Post')
    
    // Use AI generation
    await page.click('button:has-text("Generate with AI")')
    await page.waitForSelector('[data-testid=ai-loading]', { state: 'visible' })
    await page.waitForSelector('[data-testid=ai-loading]', { state: 'hidden' })
    
    // Verify AI generated content
    const bodyContent = await page.textContent('[data-testid=content-body]')
    expect(bodyContent).toBeTruthy()
    expect(bodyContent.length).toBeGreaterThan(100)
    
    // Save as draft
    await page.click('button:has-text("Save Draft")')
    await page.waitForSelector('[data-testid=save-success]')
    
    // Submit for review
    await page.click('button:has-text("Submit for Review")')
    await page.waitForSelector('[data-testid=workflow-started]')
    
    // Verify redirect to content list
    await page.waitForURL('**/content')
    await expect(page.locator('text=E2E Test Blog Post')).toBeVisible()
  })
  
  test('handles errors gracefully', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/content', route => route.abort())
    
    await page.click('text=Create Content')
    await page.fill('[data-testid=content-title]', 'Error Test')
    await page.click('button:has-text("Save Draft")')
    
    // Verify error message
    await expect(page.locator('[data-testid=error-message]')).toContainText(
      'Failed to save content. Please check your connection and try again.'
    )
    
    // Verify data preserved
    const titleValue = await page.inputValue('[data-testid=content-title]')
    expect(titleValue).toBe('Error Test')
  })
})
```

### 4.2 Cross-Browser Testing

```typescript
// Playwright cross-browser configuration
const browsers = ['chromium', 'firefox', 'webkit']

browsers.forEach(browserName => {
  test.describe(`Cross-browser: ${browserName}`, () => {
    test.use({ browserName })
    
    test('renders consistently across browsers', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Take visual snapshot
      await expect(page).toHaveScreenshot(`dashboard-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled'
      })
      
      // Test interactions
      await page.click('[data-testid=user-menu]')
      await expect(page.locator('[data-testid=user-dropdown]')).toBeVisible()
      
      // Test responsive behavior
      await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
      await expect(page.locator('[data-testid=mobile-menu]')).toBeVisible()
    })
  })
})
```

### 4.3 Mobile Testing

```typescript
test.describe('Mobile Experience', () => {
  test.use({
    ...devices['iPhone 12'],
    hasTouch: true
  })
  
  test('provides full functionality on mobile', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test mobile navigation
    await page.tap('[data-testid=mobile-menu]')
    await expect(page.locator('[data-testid=mobile-nav]')).toBeVisible()
    
    // Test touch interactions
    await page.tap('text=Content')
    await page.waitForURL('**/content')
    
    // Test swipe gestures
    const contentCard = page.locator('[data-testid=content-card]').first()
    await contentCard.scrollIntoViewIfNeeded()
    
    // Swipe to reveal actions
    await page.locator('[data-testid=content-card]').first().dispatchEvent('touchstart', {
      touches: [{ clientX: 300, clientY: 100 }]
    })
    await page.locator('[data-testid=content-card]').first().dispatchEvent('touchmove', {
      touches: [{ clientX: 100, clientY: 100 }]
    })
    await page.locator('[data-testid=content-card]').first().dispatchEvent('touchend')
    
    await expect(page.locator('[data-testid=swipe-actions]')).toBeVisible()
  })
  
  test('handles offline mode', async ({ page, context }) => {
    await page.goto('/dashboard')
    
    // Go offline
    await context.setOffline(true)
    
    // Try to navigate
    await page.click('text=Content')
    
    // Should show offline message
    await expect(page.locator('[data-testid=offline-banner]')).toBeVisible()
    await expect(page.locator('[data-testid=offline-banner]')).toContainText(
      'You are offline. Some features may be limited.'
    )
    
    // Cached data should still be visible
    await expect(page.locator('[data-testid=cached-content]')).toBeVisible()
  })
})
```

---

## 5. Performance Testing

### 5.1 Load Testing

```javascript
// k6 Load Test Script
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '5m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    errors: ['rate<0.01'],            // Error rate under 1%
  },
}

export function setup() {
  // Setup test data
  const authRes = http.post(`${__ENV.API_URL}/auth/login`, {
    email: 'loadtest@example.com',
    password: 'testpassword'
  })
  
  return {
    token: authRes.json('data.token'),
    brandId: 'test-brand-123'
  }
}

export default function(data) {
  const params = {
    headers: {
      'Authorization': `Bearer ${data.token}`,
      'Content-Type': 'application/json',
      'X-Brand-Context': data.brandId
    }
  }
  
  // Scenario: Browse content
  const browseRes = http.get(`${__ENV.API_URL}/content?page=1&limit=20`, params)
  check(browseRes, {
    'browse status is 200': (r) => r.status === 200,
    'browse response time OK': (r) => r.timings.duration < 300,
  })
  errorRate.add(browseRes.status !== 200)
  
  sleep(1)
  
  // Scenario: Create content
  const createRes = http.post(
    `${__ENV.API_URL}/content`,
    JSON.stringify({
      title: `Load Test Content ${Date.now()}`,
      brandId: data.brandId,
      templateId: 'template-123',
      fields: { body: 'Performance test content' }
    }),
    params
  )
  check(createRes, {
    'create status is 201': (r) => r.status === 201,
    'create response time OK': (r) => r.timings.duration < 500,
  })
  errorRate.add(createRes.status !== 201)
  
  sleep(2)
  
  // Scenario: AI generation
  if (Math.random() < 0.2) { // 20% of users use AI
    const aiRes = http.post(
      `${__ENV.API_URL}/content/generate`,
      JSON.stringify({
        templateId: 'template-123',
        inputs: { topic: 'Performance testing' }
      }),
      params
    )
    check(aiRes, {
      'AI status is 200': (r) => r.status === 200,
      'AI response time OK': (r) => r.timings.duration < 5000,
    })
    errorRate.add(aiRes.status !== 200)
  }
  
  sleep(3)
}

export function teardown(data) {
  // Cleanup test data
  console.log('Test completed')
}
```

### 5.2 Stress Testing

```javascript
// k6 Stress Test - Find breaking point
export const options = {
  stages: [
    { duration: '2m', target: 2000 },   // Beyond normal load
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 5000 },   // Extreme load
    { duration: '5m', target: 5000 },
    { duration: '2m', target: 10000 },  // Breaking point
    { duration: '5m', target: 10000 },
    { duration: '10m', target: 0 },     // Recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // Even p99 should be under 2s
  },
}

// Monitor system behavior under stress
export default function() {
  const responses = http.batch([
    ['GET', `${__ENV.API_URL}/content`],
    ['GET', `${__ENV.API_URL}/brands`],
    ['GET', `${__ENV.API_URL}/users/me`],
  ])
  
  responses.forEach(res => {
    check(res, {
      'status not 5xx': (r) => r.status < 500,
      'response received': (r) => r.body !== null,
    })
  })
}
```

### 5.3 Performance Profiling

```typescript
// Application Performance Profiling
import { performance } from 'perf_hooks'

class PerformanceProfiler {
  private marks: Map<string, number> = new Map()
  private measures: Map<string, number[]> = new Map()
  
  mark(name: string): void {
    this.marks.set(name, performance.now())
  }
  
  measure(name: string, startMark: string, endMark?: string): void {
    const start = this.marks.get(startMark)
    const end = endMark ? this.marks.get(endMark) : performance.now()
    
    if (!start) throw new Error(`Start mark ${startMark} not found`)
    
    const duration = end - start
    
    if (!this.measures.has(name)) {
      this.measures.set(name, [])
    }
    
    this.measures.get(name)!.push(duration)
  }
  
  getStats(measureName: string): PerformanceStats {
    const measures = this.measures.get(measureName) || []
    
    if (measures.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p95: 0, p99: 0 }
    }
    
    const sorted = [...measures].sort((a, b) => a - b)
    
    return {
      count: measures.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: measures.reduce((a, b) => a + b, 0) / measures.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
}

// Usage in tests
test('measures content generation performance', async () => {
  const profiler = new PerformanceProfiler()
  
  for (let i = 0; i < 100; i++) {
    profiler.mark('start')
    
    await contentService.generateWithAI({
      template: 'blog-post',
      inputs: { topic: `Test ${i}` }
    })
    
    profiler.measure('ai-generation', 'start')
  }
  
  const stats = profiler.getStats('ai-generation')
  
  expect(stats.avg).toBeLessThan(3000)    // Average under 3s
  expect(stats.p95).toBeLessThan(5000)    // 95th percentile under 5s
  expect(stats.p99).toBeLessThan(7000)    // 99th percentile under 7s
})
```

---

## 6. Security Testing

### 6.1 Static Security Testing (SAST)

```yaml
# SonarQube Security Rules
sonar.javascript.security.hotspots.enabled: true
sonar.typescript.security.hotspots.enabled: true

Security Rules:
  - SQL Injection Detection
  - XSS Vulnerability Detection
  - Path Traversal Detection
  - Insecure Random Detection
  - Hard-coded Secrets Detection
  - Insecure Deserialization
  - Command Injection
  - LDAP Injection
  - XML External Entity
  - Weak Cryptography
```

### 6.2 Dynamic Security Testing (DAST)

```python
# OWASP ZAP Security Test Script
import time
from zapv2 import ZAPv2

# Configure ZAP
zap = ZAPv2(proxies={'http': 'http://127.0.0.1:8080'})

def security_test_api():
    target = 'https://staging-api.mixerai.com'
    
    # Spider the API
    print('Spidering target {}'.format(target))
    scan_id = zap.spider.scan(target)
    
    while int(zap.spider.status(scan_id)) < 100:
        print('Spider progress %: {}'.format(zap.spider.status(scan_id)))
        time.sleep(1)
    
    # Active scan
    print('Active scanning target {}'.format(target))
    scan_id = zap.ascan.scan(target)
    
    while int(zap.ascan.status(scan_id)) < 100:
        print('Scan progress %: {}'.format(zap.ascan.status(scan_id)))
        time.sleep(5)
    
    # Get results
    alerts = zap.core.alerts(baseurl=target)
    
    high_risk = [alert for alert in alerts if alert['risk'] == 'High']
    medium_risk = [alert for alert in alerts if alert['risk'] == 'Medium']
    
    # Fail if high-risk issues found
    assert len(high_risk) == 0, f"Found {len(high_risk)} high-risk vulnerabilities"
    
    # Warn on medium-risk
    if medium_risk:
        print(f"Warning: Found {len(medium_risk)} medium-risk issues")
    
    # Generate report
    report = zap.core.htmlreport()
    with open('security-report.html', 'w') as f:
        f.write(report)
```

### 6.3 Penetration Testing

```typescript
// Security Test Cases
describe('Security Tests', () => {
  describe('Authentication Security', () => {
    test('prevents brute force attacks', async () => {
      const attempts = []
      
      // Try 6 failed logins (threshold is 5)
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'test@example.com',
              password: 'wrongpassword'
            })
        )
      }
      
      const results = await Promise.all(attempts)
      
      // First 5 should be 401
      results.slice(0, 5).forEach(res => {
        expect(res.status).toBe(401)
      })
      
      // 6th should be rate limited
      expect(results[5].status).toBe(429)
      expect(results[5].body.error.code).toBe('ACCOUNT_LOCKED')
    })
    
    test('prevents session hijacking', async () => {
      const { token } = await loginAsUser()
      
      // Try to use token from different IP
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Forwarded-For', '192.168.1.100') // Different IP
        .expect(401)
      
      expect(response.body.error.code).toBe('SESSION_INVALID')
    })
  })
  
  describe('Input Validation Security', () => {
    test('prevents SQL injection', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; UPDATE users SET role='admin' WHERE email='attacker@evil.com'"
      ]
      
      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/api/content?search=${encodeURIComponent(input)}`)
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200) // Should handle safely
        
        // Verify no SQL error exposed
        expect(response.body).not.toMatch(/SQL/i)
        expect(response.body).not.toMatch(/syntax/i)
      }
    })
    
    test('prevents XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>'
      ]
      
      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/content')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            title: payload,
            brandId: 'test-brand',
            body: payload
          })
          .expect(201)
        
        // Verify content is sanitized
        expect(response.body.data.title).not.toContain('<script>')
        expect(response.body.data.title).not.toContain('javascript:')
        expect(response.body.data.body).not.toContain('onerror=')
      }
    })
  })
  
  describe('Authorization Security', () => {
    test('prevents horizontal privilege escalation', async () => {
      const user1 = await createUser({ email: 'user1@test.com' })
      const user2 = await createUser({ email: 'user2@test.com' })
      
      const brand1 = await createBrand({ ownerId: user1.id })
      const brand2 = await createBrand({ ownerId: user2.id })
      
      const token1 = generateToken(user1)
      
      // User1 tries to access User2's brand
      await request(app)
        .get(`/api/brands/${brand2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(403)
      
      // User1 tries to modify User2's content
      await request(app)
        .put(`/api/content/${contentOfBrand2.id}`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ title: 'Hacked!' })
        .expect(403)
    })
    
    test('prevents vertical privilege escalation', async () => {
      const editor = await createUser({ role: 'editor' })
      const token = generateToken(editor)
      
      // Try to perform admin actions
      await request(app)
        .put('/api/users/other-user-id')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(403)
      
      await request(app)
        .delete('/api/brands/some-brand')
        .set('Authorization', `Bearer ${token}`)
        .expect(403)
    })
  })
})
```

---

## 7. AI/ML Testing

### 7.1 AI Model Testing

```typescript
describe('AI Content Generation Tests', () => {
  describe('Quality Assurance', () => {
    test('generates brand-aligned content', async () => {
      const brand = {
        name: 'TechCorp',
        toneOfVoice: 'Professional, innovative, forward-thinking',
        guardrails: [
          'Never mention competitors',
          'Always emphasize innovation',
          'Use data to support claims'
        ]
      }
      
      const result = await aiService.generateContent({
        template: 'blog-post',
        brand,
        inputs: { topic: 'Future of AI' }
      })
      
      // Verify tone alignment
      const toneAnalysis = await analyzeTone(result.content)
      expect(toneAnalysis.professional).toBeGreaterThan(0.7)
      expect(toneAnalysis.innovative).toBeGreaterThan(0.6)
      
      // Verify guardrails
      expect(result.content).not.toMatch(/competitor|rival|opposition/i)
      expect(result.content).toMatch(/innovat/i)
      expect(result.content).toMatch(/\d+%|\d+ percent|study|research/i)
    })
    
    test('maintains consistency across regenerations', async () => {
      const inputs = {
        template: 'product-description',
        brand: testBrand,
        inputs: { product: 'Smart Watch X1' }
      }
      
      // Generate multiple times
      const results = await Promise.all(
        Array(5).fill(null).map(() => aiService.generateContent(inputs))
      )
      
      // Extract key facts from each
      const facts = results.map(r => extractKeyFacts(r.content))
      
      // Verify consistency
      facts.forEach((factSet, i) => {
        facts.slice(i + 1).forEach(otherFactSet => {
          const similarity = calculateSimilarity(factSet, otherFactSet)
          expect(similarity).toBeGreaterThan(0.8) // 80% fact consistency
        })
      })
    })
  })
  
  describe('Performance Testing', () => {
    test('handles high concurrency', async () => {
      const requests = Array(50).fill(null).map((_, i) => 
        aiService.generateContent({
          template: 'social-post',
          brand: testBrand,
          inputs: { topic: `Test ${i}` }
        })
      )
      
      const start = Date.now()
      const results = await Promise.allSettled(requests)
      const duration = Date.now() - start
      
      const successful = results.filter(r => r.status === 'fulfilled')
      const failed = results.filter(r => r.status === 'rejected')
      
      expect(successful.length).toBeGreaterThan(45) // 90% success rate
      expect(duration).toBeLessThan(30000) // Complete within 30s
    })
    
    test('implements proper rate limiting', async () => {
      // Exhaust rate limit
      const requests = Array(60).fill(null).map(() => 
        aiService.generateContent(minimalInput)
      )
      
      const results = await Promise.allSettled(requests)
      const rateLimited = results.filter(
        r => r.status === 'rejected' && 
        r.reason.code === 'RATE_LIMITED'
      )
      
      expect(rateLimited.length).toBeGreaterThan(0)
      expect(rateLimited.length).toBeLessThan(20) // Some should succeed
    })
  })
  
  describe('Language Support', () => {
    const languages = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ar']
    
    languages.forEach(lang => {
      test(`generates quality content in ${lang}`, async () => {
        const result = await aiService.generateContent({
          template: 'blog-post',
          brand: { ...testBrand, language: lang },
          inputs: { topic: 'Sustainability' }
        })
        
        // Verify language
        const detectedLang = await detectLanguage(result.content)
        expect(detectedLang).toBe(lang)
        
        // Verify quality
        const quality = await assessContentQuality(result.content, lang)
        expect(quality.score).toBeGreaterThan(0.7)
        expect(quality.grammar).toBeGreaterThan(0.8)
        expect(quality.fluency).toBeGreaterThan(0.7)
      })
    })
  })
})
```

### 7.2 AI Bias Testing

```typescript
describe('AI Bias and Fairness Tests', () => {
  test('avoids gender bias in content', async () => {
    const topics = [
      'CEO leadership',
      'Nursing profession',
      'Engineering careers',
      'Parenting advice'
    ]
    
    for (const topic of topics) {
      const content = await aiService.generateContent({
        template: 'article',
        brand: neutralBrand,
        inputs: { topic }
      })
      
      const biasAnalysis = await analyzeBias(content.content)
      
      expect(biasAnalysis.genderBias).toBeLessThan(0.1)
      expect(biasAnalysis.pronounDistribution).toBeBalanced()
      expect(biasAnalysis.stereotypes).toBeEmpty()
    }
  })
  
  test('maintains cultural sensitivity', async () => {
    const culturalContexts = [
      { country: 'JP', topic: 'Business etiquette' },
      { country: 'SA', topic: 'Social gatherings' },
      { country: 'IN', topic: 'Festival celebrations' },
      { country: 'BR', topic: 'Team building' }
    ]
    
    for (const context of culturalContexts) {
      const content = await aiService.generateContent({
        template: 'guide',
        brand: { ...testBrand, country: context.country },
        inputs: { topic: context.topic }
      })
      
      const sensitivity = await analyzeCulturalSensitivity(
        content.content,
        context.country
      )
      
      expect(sensitivity.appropriateness).toBeGreaterThan(0.9)
      expect(sensitivity.offensiveContent).toBe(false)
      expect(sensitivity.culturallyAware).toBe(true)
    }
  })
})
```

---

## 8. User Acceptance Testing

### 8.1 UAT Test Scenarios

```yaml
UAT Test Plan:
  Participants:
    - 5 Brand Managers
    - 10 Content Creators
    - 3 Compliance Officers
    - 5 Regional Managers
    
  Duration: 2 weeks
  
  Test Scenarios:
    Brand Setup:
      - Create new brand from scratch
      - Import brand from website
      - Configure workflows
      - Invite team members
      
    Content Creation:
      - Create content using templates
      - Use AI generation
      - Edit and refine content
      - Submit for approval
      
    Workflow Management:
      - Review assigned tasks
      - Approve/reject content
      - Add feedback comments
      - Track progress
      
    Compliance:
      - Set up claims rules
      - Validate content compliance
      - Generate compliance reports
      
    Analytics:
      - View performance dashboards
      - Export reports
      - Track team productivity
```

### 8.2 UAT Feedback Collection

```typescript
interface UATFeedback {
  tester: {
    id: string
    role: string
    experience: string
  }
  
  scenario: {
    name: string
    duration: number
    completed: boolean
  }
  
  feedback: {
    ease_of_use: 1-5
    met_expectations: boolean
    issues_encountered: Issue[]
    suggestions: string[]
    would_recommend: boolean
  }
  
  metrics: {
    task_completion_rate: number
    time_on_task: number
    error_rate: number
    help_needed: number
  }
}

// UAT Success Criteria
const uatSuccessCriteria = {
  task_completion_rate: 0.9,      // 90% of tasks completed
  satisfaction_score: 4.0,         // 4+ out of 5
  critical_issues: 0,              // No blockers
  would_recommend: 0.8             // 80% would recommend
}
```

---

## 9. Test Automation

### 9.1 CI/CD Pipeline Tests

```yaml
# GitHub Actions CI Pipeline
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
          
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linting
        run: npm run lint
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run unit tests
        run: npm run test:unit -- --coverage
        env:
          NODE_ENV: test
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/test
          REDIS_URL: redis://localhost:6379
      
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
      
      - name: Run security scan
        run: npm audit --production
      
      - name: Build application
        run: npm run build
      
      - name: Run smoke tests
        run: npm run test:smoke
```

### 9.2 Test Data Management

```typescript
// Test Data Factory
class TestDataFactory {
  private faker = require('faker')
  
  createUser(overrides?: Partial<User>): User {
    return {
      id: this.faker.datatype.uuid(),
      email: this.faker.internet.email(),
      firstName: this.faker.name.firstName(),
      lastName: this.faker.name.lastName(),
      role: 'editor',
      createdAt: new Date(),
      ...overrides
    }
  }
  
  createBrand(overrides?: Partial<Brand>): Brand {
    return {
      id: this.faker.datatype.uuid(),
      name: this.faker.company.companyName(),
      description: this.faker.company.catchPhrase(),
      country: 'US',
      language: 'en',
      toneOfVoice: 'Professional and friendly',
      guardrails: [
        'Be inclusive',
        'Focus on benefits',
        'Use active voice'
      ],
      ...overrides
    }
  }
  
  createContent(overrides?: Partial<Content>): Content {
    return {
      id: this.faker.datatype.uuid(),
      title: this.faker.lorem.sentence(),
      body: this.faker.lorem.paragraphs(3),
      status: 'draft',
      brandId: this.faker.datatype.uuid(),
      createdBy: this.faker.datatype.uuid(),
      createdAt: new Date(),
      ...overrides
    }
  }
  
  async seedDatabase(counts: SeedCounts): Promise<void> {
    const users = await this.createUsers(counts.users)
    const brands = await this.createBrands(counts.brands)
    
    // Assign users to brands
    await this.assignUsersToBrands(users, brands)
    
    // Create content for each brand
    for (const brand of brands) {
      await this.createContentForBrand(brand, counts.contentPerBrand)
    }
  }
}
```

### 9.3 Test Reporting

```typescript
// Custom Test Reporter
class MixerAITestReporter {
  private results: TestResults = {
    passed: 0,
    failed: 0,
    skipped: 0,
    duration: 0,
    coverage: {},
    failures: []
  }
  
  onTestResult(test: Test, result: TestResult): void {
    if (result.status === 'passed') {
      this.results.passed++
    } else if (result.status === 'failed') {
      this.results.failed++
      this.results.failures.push({
        test: test.title,
        error: result.error,
        file: test.file,
        line: test.line
      })
    } else {
      this.results.skipped++
    }
  }
  
  onRunComplete(contexts: Set<Context>, results: AggregatedResult): void {
    this.results.duration = results.runtime
    this.results.coverage = results.coverage
    
    // Generate HTML report
    const html = this.generateHTMLReport()
    fs.writeFileSync('test-report.html', html)
    
    // Generate JSON for CI
    fs.writeFileSync('test-results.json', JSON.stringify(this.results, null, 2))
    
    // Send to monitoring
    this.sendToMonitoring(this.results)
    
    // Fail CI if needed
    if (this.results.failed > 0) {
      process.exit(1)
    }
  }
  
  private generateHTMLReport(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>MixerAI Test Report</title>
          <style>
            /* Styles for beautiful report */
          </style>
        </head>
        <body>
          <h1>Test Results</h1>
          <div class="summary">
            <div class="stat passed">Passed: ${this.results.passed}</div>
            <div class="stat failed">Failed: ${this.results.failed}</div>
            <div class="stat skipped">Skipped: ${this.results.skipped}</div>
          </div>
          <!-- Detailed results -->
        </body>
      </html>
    `
  }
}
```

---

## 10. Quality Metrics

### 10.1 Test Metrics Dashboard

```yaml
Key Metrics:
  Test Coverage:
    Target: 80%
    Current: 0%
    Trend: ↑
    
  Test Execution Time:
    Target: < 30 minutes
    Current: 0 minutes
    Trend: →
    
  Defect Escape Rate:
    Target: < 5%
    Current: 0%
    Trend: ↓
    
  Test Automation Rate:
    Target: 95%
    Current: 0%
    Trend: ↑
    
  Mean Time to Detect (MTTD):
    Target: < 1 hour
    Current: 0 hours
    Trend: ↓
    
  Mean Time to Resolve (MTTR):
    Target: < 4 hours
    Current: 0 hours
    Trend: ↓
```

### 10.2 Quality Gates

```typescript
interface QualityGates {
  preCommit: {
    linting: 'pass',
    typeCheck: 'pass',
    unitTests: 'pass',
    coverage: '>= 80%'
  },
  
  preMerge: {
    allTests: 'pass',
    securityScan: 'no high/critical',
    performance: 'no regression',
    documentation: 'updated'
  },
  
  preRelease: {
    e2eTests: 'pass',
    loadTests: 'pass',
    securityAudit: 'pass',
    uat: 'approved'
  },
  
  postRelease: {
    smokeTests: 'pass',
    monitoring: 'no alerts',
    errorRate: '< 0.1%',
    performance: 'within SLA'
  }
}
```

### 10.3 Continuous Improvement

```yaml
Test Improvement Process:
  Weekly:
    - Review failed tests
    - Update flaky tests
    - Add missing coverage
    - Optimize slow tests
    
  Monthly:
    - Analyze defect trends
    - Review test effectiveness
    - Update test strategies
    - Training sessions
    
  Quarterly:
    - Full test suite review
    - Tool evaluation
    - Process improvements
    - ROI analysis
    
Metrics for Improvement:
  - Test execution time reduction
  - False positive rate reduction
  - Coverage increase
  - Defect detection rate improvement
  - Automation percentage increase
```

---

## 📊 Testing Checklist

### Pre-Development
- [ ] Test plan reviewed and approved
- [ ] Test environments provisioned
- [ ] Test data strategy defined
- [ ] Automation framework selected
- [ ] CI/CD pipeline configured

### During Development
- [ ] Unit tests written with code
- [ ] Integration tests for APIs
- [ ] E2E tests for user journeys
- [ ] Performance benchmarks set
- [ ] Security tests automated

### Pre-Release
- [ ] All automated tests passing
- [ ] Performance tests completed
- [ ] Security audit passed
- [ ] UAT sign-off received
- [ ] Test report generated

### Post-Release
- [ ] Smoke tests passing
- [ ] Monitoring active
- [ ] Error rates acceptable
- [ ] Performance within SLA
- [ ] Lessons learned documented

---

[← Back to Non-Functional Requirements](./10-NON-FUNCTIONAL-REQUIREMENTS.md) | [Related: Implementation Roadmap](./12-IMPLEMENTATION-ROADMAP.md)