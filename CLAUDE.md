# CLAUDE.md - Universal AI Assistant Development Guide v4.0

**CRITICAL: This file provides comprehensive guidance to AI assistants (Claude, GPT, Copilot, etc.) when working with code in the MixerAI 2.0 repository.**

---

# === PROJECT PROFILE (AI MUST load first) ===
```yaml
# MixerAI 2.0 - Multi-Tenant Content Management Platform
name: mixerai2.0
stack: node        # values: generic|node|python|go|java|dotnet|rust|mixed
runtime: node-20   # e.g., node-20|python-3.11|go-1.21|java-17|dotnet-8
package_manager: npm # npm|yarn|pnpm|pip|poetry|uv|cargo|maven|gradle|dotnet

commands:
  install: "npm install"
  build: "npm run build"           # Production build with 4GB memory
  test: "npm test"
  lint: "npm run lint"
  typecheck: "npm run check"       # ESLint + TypeScript checks
  format: "npm run lint:fix"
  start: "npm start"
  dev: "npm run dev"

paths:
  src: "./src"
  tests: "./src/**/__tests__"
  docs: "./docs"
  config: "./"

artifacts:
  server: true
  cli: false
  library: false
  frontend: true    # Next.js App Router
  mobile: false
  
quality_bars:
  coverage_min: 80
  complexity_max: 10
  duplication_max: 5
  p95_latency_ms: 300
  error_budget_pct: 1
  bundle_budget_kb: 200
  memory_budget_mb: 512
  
security:
  data_classes: ["public", "internal", "confidential", "pii"]
  secrets_scanning: true
  dependency_check: true
  sast_enabled: true
  row_level_security: true  # Supabase RLS
  
observability:
  logging_level: "info"
  tracing_enabled: true
  metrics_enabled: true
  health_endpoint: "/api/health"
  
release:
  strategy: "canary"
  feature_flags: true
  rollback_window: "30m"
  
conventions:
  naming: "camelCase"    # For JS/TS variables
  file_naming: "kebab-case"  # For file names
  indent: 2
  quotes: "single"
  semicolons: false

# MixerAI Specific Configuration
ai_integration:
  provider: "Azure OpenAI"
  models: ["gpt-4", "gpt-35-turbo"]
  fallback_enabled: true
  rate_limiting: "50 requests/15 minutes"

database:
  provider: "Supabase (PostgreSQL)"
  row_level_security: true
  multi_tenant: true
  brand_isolation: true
```

---

## 📑 Document Structure

**Section 1: Core Foundations**
- Project Profile & Configuration
- Agent Behaviour Contract
- Definition of Ready (DoR)
- Definition of Done (DoD)
- Ethics & Safety Stop Conditions

**Section 2: Development Workflow**
- Task Complexity Assessment
- Incremental Development Philosophy
- Priority & Focus Management
- Command Adapter Matrix
- Verification Pipeline

**Section 3: AI Optimization**
- Context Window Management
- Prompt Engineering Patterns
- Model-Specific Guidance
- Hallucination Prevention
- Cost Controls

**Section 4: Engineering Standards**
- Non-Functional Requirements
- Resilience Patterns
- Observability Blueprint
- Security & Governance
- API Contracts

**Section 5: Quality Assurance**
- Test Strategy
- Test Data Management
- Performance Validation
- Accessibility Standards
- Regression Prevention

**Section 6: Operations**
- Release Management
- Rollback Procedures
- Monitoring & Alerting
- Incident Response
- Documentation

---

## 🤖 Agent Behaviour Contract

### Core Directives
1. **Do ONLY what is asked** - No unsolicited improvements or additions
2. **Ask ONE clarifying question maximum** - If unclear, proceed with safest minimal implementation
3. **Record EVERY assumption** - Document in PR/commit messages
4. **One concern per changeset** - If second concern emerges, park it
5. **Fail safely** - When in doubt, stop and request human approval

### Source of Truth Hierarchy
```
1. Project Profile (above)
2. Explicit task instructions  
3. Existing code patterns
4. Industry best practices
5. Framework defaults
```

### Decision Recording
Every non-trivial decision MUST be documented:
```markdown
Decision: [what was decided]
Reason: [why this option]
Alternatives: [what else was considered]
Consequences: [impact and trade-offs]
```

### When Uncertain Protocol
```
1. Ask ONE precise, specific question
2. Wait 30 seconds for response
3. If no response: proceed with lowest-risk minimal change
4. Document assumption clearly
5. Add TODO marker for human review
```

---

## 🔴 CRITICAL: Pre-Development Discovery Protocol (MixerAI Specific)

### MANDATORY: Run This Before ANY Code Changes
```bash
# 1. Full System Health Check
npm run check           # TypeScript + ESLint
npm run test           # All tests must pass
npm run build          # Build must succeed

# 2. Database State Verification
node scripts/test-db-connection.js
npm run db:types       # Ensure types are current

# 3. AI Integration Check
node scripts/test-azure-openai.js

# 4. Authentication Test
node scripts/test-auth-flow.js

# 5. Document Current State
echo "=== Pre-Development State ===" > discovery-report.md
echo "Date: $(date)" >> discovery-report.md
echo "Branch: $(git branch --show-current)" >> discovery-report.md
echo "Last Commit: $(git log -1 --oneline)" >> discovery-report.md
npm run review >> discovery-report.md 2>&1
```

### Discovery Report Template
```markdown
## Discovery Report: [Feature/Fix Name]
Date: [ISO Date]
Developer: Claude

### System State
- [ ] All tests passing
- [ ] Build successful  
- [ ] No ESLint errors
- [ ] Database connection verified
- [ ] AI integration operational

### Feature Analysis
**Affected Areas:**
- Components: [List with file paths]
- API Routes: [List with endpoints]
- Database Tables: [List tables/columns]
- UI Routes: [List pages]

**Dependencies:**
- External APIs: [Azure OpenAI, Supabase, etc.]
- Internal Services: [List services]
- UI Components: [List shadcn/ui components used]

**Risk Assessment:**
- Breaking Changes: [List potential breaks]
- Performance Impact: [Database queries, API calls]
- Security Implications: [Auth, RLS, CSRF]
```

---

## ✅ Definition of Ready (DoR)

**MANDATORY before ANY coding begins:**

### Requirements Checklist
- [ ] **Problem statement written** - Clear description of issue/need
- [ ] **Success criteria defined** - Measurable definition of "done"
- [ ] **User story clear** - "As a... I want... So that..."
- [ ] **Acceptance criteria listed** - Specific testable requirements

### Technical Checklist  
- [ ] **Inputs/outputs identified** - Data flow documented
- [ ] **Data classes marked** - PII/confidential/internal/public
- [ ] **Dependencies identified** - External services/libraries needed
- [ ] **API contracts defined** - Request/response formats (if applicable)
- [ ] **Brand context considered** - Multi-tenant implications

### Risk & Quality Checklist
- [ ] **Failure modes listed** - What can go wrong?
- [ ] **Rollback strategy defined** - How to undo if needed
- [ ] **Test oracle defined** - What proves it works?
- [ ] **Performance targets set** - Latency/throughput requirements
- [ ] **Security requirements clear** - Auth/authz/encryption needs
- [ ] **RLS policies verified** - Row-level security implications

### DoR Validation Gate
```yaml
IF any_checklist_item == unchecked:
  status: NOT_READY
  action: Request missing information
ELSE:
  status: READY
  action: Proceed to implementation
```

---

## 🎯 Definition of Done (DoD)

**A feature is ONLY complete when ALL items pass:**

### Code Quality Gates
- ✅ **Builds successfully** - No compilation/build errors
- ✅ **All tests pass** - Unit, integration, and e2e tests green
- ✅ **Coverage meets minimum** - Per quality_bars.coverage_min
- ✅ **No linting errors** - Clean static analysis
- ✅ **Type checks pass** - TypeScript strict mode
- ✅ **Complexity within limits** - Per quality_bars.complexity_max

### Security Gates
- ✅ **No hardcoded secrets** - Verified by scanning
- ✅ **Dependencies secure** - No critical vulnerabilities
- ✅ **Input validation complete** - All user inputs sanitized with Zod
- ✅ **Auth checks in place** - Using withAuth middleware
- ✅ **RLS policies applied** - Supabase row-level security

### Performance Gates
- ✅ **Latency within budget** - P95 < quality_bars.p95_latency_ms
- ✅ **Memory within budget** - Peak < quality_bars.memory_budget_mb
- ✅ **Bundle size acceptable** - < quality_bars.bundle_budget_kb
- ✅ **No performance regression** - Compared to baseline
- ✅ **React Query configured** - Proper stale times

### Documentation Gates
- ✅ **Code commented** - Complex logic explained
- ✅ **API documented** - OpenAPI/comments as appropriate
- ✅ **README updated** - If new setup/config needed
- ✅ **ADR written** - For significant decisions

---

## 🛑 Ethics & Safety Stop Conditions

### HARD STOP - Require Human Approval
**AI MUST stop and request explicit approval before:**

1. **Data Destruction Risk**
   - Any operation that could DELETE user data
   - Schema migrations that drop columns/tables
   - Bulk update operations affecting > 1000 records
   - Modifications to Supabase RLS policies

2. **Security Degradation**
   - Disabling authentication/authorization
   - Removing encryption
   - Exposing internal APIs publicly
   - Handling data above current classification level
   - Modifying withAuth middleware
   - Changes to CSRF protection

3. **Privacy Violation Risk**
   - Logging PII data
   - Sending PII to external services (including Azure OpenAI)
   - Storing PII in new locations
   - Changing data retention policies

4. **Legal/Compliance Risk**
   - Using GPL/AGPL code in proprietary projects
   - Violating documented compliance requirements
   - Processing data across regulatory boundaries

5. **Availability Risk**
   - Changes that could cause > 1 minute downtime
   - Modifications to critical path code
   - Database migrations on > 1GB tables
   - Rate limit changes that could cause DoS
   - Azure OpenAI quota modifications

### Stop Condition Protocol
```
WHEN stop_condition_detected:
  1. HALT all changes
  2. Document the risk clearly
  3. Request explicit approval with:
     - Risk description
     - Potential impact
     - Mitigation options
  4. Wait for human decision
  5. Proceed ONLY with written approval
```

---

## 🔧 Essential Commands (MixerAI Specific)

### Development
```bash
npm run dev              # Start development server
npm run build            # Production build with 4GB memory
npm start                # Start production server
```

### Code Quality
```bash
npm run check            # Run ESLint + TypeScript checks
npm run lint             # Run Next.js linting
npm run lint:fix         # Auto-fix linting issues
npm run review           # Comprehensive review (deps, lint, types, build)
npm run review:fix       # Auto-fix ESLint then run review
```

### Testing
```bash
npm test                 # Run test suite
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:openai      # Test Azure OpenAI integration
```

### Database
```bash
npm run db:types                      # Regenerate TypeScript types from DB
node scripts/test-db-connection.js    # Test database connectivity
./scripts/init-database.sh            # Initialize database
./scripts/reset-database.sh           # Reset database
```

### Bundle Analysis & Performance
```bash
npm run analyze          # Analyze bundle size
npm run build:profile    # Build with profiling enabled
```

---

## 🏛️ High-Level Architecture (MixerAI Specific)

### Technology Stack
- **Framework**: Next.js 14 with App Router (React 18)
- **Language**: TypeScript (strict mode)
- **Database**: PostgreSQL via Supabase with Row-Level Security
- **Authentication**: Supabase Auth with custom session management
- **AI**: Azure OpenAI for content generation
- **UI**: shadcn/ui components (Radix UI + Tailwind CSS)
- **Data Fetching**: TanStack Query v5 + SWR
- **Forms**: React Hook Form + Zod validation
- **Email**: Resend for transactional emails

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (RESTful)
│   ├── auth/              # Authentication pages
│   └── dashboard/         # Protected application pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── content/          # Content management
│   └── dashboard/        # Dashboard features
├── lib/                   # Core utilities
│   ├── auth/             # Auth middleware & permissions
│   ├── azure/            # Azure OpenAI integration
│   ├── supabase/         # Database clients
│   └── utils/            # General utilities
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks
```

### Multi-Tenant Architecture
- Brand-based isolation with RLS policies
- User permissions scoped to brands
- Hierarchical role system (admin > manager > user)
- All API routes require brand context

### AI Integration Points
- Content generation (multiple types)
- Title/headline generation
- Alt text generation
- Content transcreation
- Metadata generation
- Claims analysis and simplification

### Rate Limiting Structure
- Auth endpoints: 10 requests/15 minutes
- AI endpoints: 50 requests/15 minutes  
- General API: 100 requests/15 minutes
- Implemented via middleware with Redis-backed storage

---

## 📊 Command Adapter Matrix

### Stack-Agnostic Command Mapping
**AI MUST use this table to translate commands based on Project Profile `stack` value:**

| Intent | Node (MixerAI) | Python | Go | Java | .NET | Rust |
|--------|------|--------|----|----|------|------|
| **Install** | `npm install` | `pip install -r requirements.txt` | `go mod download` | `./gradlew dependencies` | `dotnet restore` | `cargo fetch` |
| **Build** | `npm run build` | `python -m build` | `go build ./...` | `./gradlew build` | `dotnet build` | `cargo build --release` |
| **Test** | `npm test` | `pytest` | `go test ./...` | `./gradlew test` | `dotnet test` | `cargo test` |
| **Lint** | `npm run lint` | `ruff check .` | `golangci-lint run` | `./gradlew check` | `dotnet format --verify` | `cargo clippy` |
| **Format** | `npm run lint:fix` | `black . && isort .` | `gofmt -w .` | `./gradlew spotlessApply` | `dotnet format` | `cargo fmt` |
| **Type Check** | `npm run check` | `mypy . or pyright` | N/A | N/A | N/A | `cargo check` |
| **Run Dev** | `npm run dev` | `python app.py` | `go run .` | `./gradlew bootRun` | `dotnet run` | `cargo run` |
| **Package** | `npm pack` | `python -m build` | `go build -o app` | `./gradlew jar` | `dotnet publish` | `cargo build --release` |
| **Clean** | `rm -rf node_modules dist .next` | `rm -rf __pycache__ dist` | `go clean` | `./gradlew clean` | `dotnet clean` | `cargo clean` |
| **Audit** | `npm audit` | `pip-audit` | `go list -m all \| nancy` | `./gradlew dependencyCheck` | `dotnet list package --vulnerable` | `cargo audit` |

---

## 🔍 Task Complexity Assessment

### Complexity Scoring Matrix
| Factor | Weight | Score 1 | Score 3 | Score 5 |
|--------|--------|---------|---------|---------|
| **Files Modified** | 2x | 1 file | 2-5 files | 6+ files |
| **Lines of Code** | 1x | < 50 | 50-200 | > 200 |
| **External Dependencies** | 3x | None | 1-2 | 3+ |
| **Data Migration** | 5x | None | Schema change | Data transform |
| **Breaking Changes** | 4x | None | Internal only | Public API |
| **Security Surface** | 3x | None | Auth check | New auth flow |
| **AI Integration** | 3x | None | Single call | Complex flow |
| **Multi-tenant Impact** | 4x | None | Single brand | All brands |

### Complexity Response Protocol
```
Total Score = Σ(Factor Weight × Factor Score)

0-10 points:  SIMPLE → Implement directly
11-30 points: MEDIUM → Break into 2-3 subtasks  
31-50 points: COMPLEX → Require design doc first
51+ points:   EPIC → Decompose into multiple PRs
```

---

## 🏗️ Implementation Patterns (MixerAI Specific)

### API Route Pattern (ALWAYS use this)
```typescript
// src/app/api/[resource]/route.ts
import { withAuth } from '@/lib/auth/middleware';
import { handleApiError } from '@/lib/api-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Define schema
const RequestSchema = z.object({
  // Define your schema
});

export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    // 1. Validate permissions
    if (!user.hasPermission('read:resource')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse and validate input
    const params = RequestSchema.parse(await req.json());

    // 3. Database operation with RLS
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase
      .from('table')
      .select('*')
      .eq('user_id', user.id);

    if (error) throw error;

    // 4. Return standardized response
    return NextResponse.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
});
```

### Component Pattern (With Error Handling)
```typescript
// src/app/dashboard/[feature]/page.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function FeaturePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['feature-data'],
    queryFn: async () => {
      const res = await fetch('/api/feature');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error.message || 'Something went wrong'}
        </AlertDescription>
      </Alert>
    );
  }

  return <YourComponent data={data} />;
}
```

### Database Operation Pattern
```typescript
// Always use transactions for related operations
const { data, error } = await supabase.rpc('transaction_wrapper', {
  operations: async (tx) => {
    // Operation 1
    const { data: item } = await tx
      .from('items')
      .insert({ name: 'Test' })
      .select()
      .single();

    // Operation 2 (depends on operation 1)
    await tx
      .from('item_metadata')
      .insert({ item_id: item.id, key: 'status', value: 'active' });

    return item;
  }
});
```

---

## 🏗️ Incremental Development Protocol

### The 3-Change Rule
**NEVER make more than 3 changes without validation**

```bash
change_count = 0
WHILE work_remaining:
  make_single_atomic_change()
  change_count++
  
  IF change_count >= 3:
    run_validation_suite()
    commit_if_green()
    change_count = 0
```

### Validation Suite (MixerAI)
```bash
# 1. Syntax/Compile Check
npm run build || exit 1

# 2. Type Check
npm run check || exit 1  

# 3. Lint Check
npm run lint || exit 1

# 4. Test Check
npm test || exit 1

# 5. Security Check
grep -r "password\|secret\|key" --exclude-dir=.git . || true

# 6. Commit if all pass
git add -A && git commit -m "checkpoint: ${description}"
```

---

## 🛡️ Non-Functional Requirements (NFR) Pack

### 1. Reliability Requirements
```yaml
availability_target: 99.9%  # Three 9s
recovery_time_objective: < 5 minutes
recovery_point_objective: < 1 hour
data_durability: 99.999999999%  # 11 9s

patterns_required:
  - Retry with exponential backoff
  - Circuit breaker for external calls
  - Graceful degradation
  - Health checks
  - Timeout on all I/O
  - Azure OpenAI fallback
```

### 2. Performance Requirements  
```yaml
response_time:
  p50: < 100ms
  p95: < 300ms
  p99: < 1000ms

throughput:
  minimum: 100 rps
  target: 1000 rps
  peak: 5000 rps

resource_limits:
  cpu: 2 cores
  memory: 512MB
  disk_io: 100 MB/s
  
next_js_specific:
  bundle_size: < 200KB
  first_contentful_paint: < 1.8s
  time_to_interactive: < 3.8s
```

### 3. Security Requirements
```yaml
authentication: Supabase Auth required
authorization: Role-based with brand context
encryption:
  at_rest: AES-256
  in_transit: TLS 1.3+
  
input_validation:
  - Zod schemas for all inputs
  - Parameterized queries only
  - Content-Security-Policy headers
  - CORS properly configured
  
secrets_management:
  - No hardcoded secrets
  - Environment variables only
  - Rotate every 90 days
  
row_level_security:
  - All tables have RLS enabled
  - Policies enforce brand isolation
  - User access scoped to permissions
```

### 4. Accessibility Requirements
```yaml
standard: WCAG 2.1 Level AA
requirements:
  - Keyboard navigation for all features
  - Screen reader compatibility  
  - Color contrast ratio ≥ 4.5:1
  - Focus indicators visible
  - Alt text for all images (125 char limit)
  - ARIA labels where needed
  - Skip navigation links
  - Responsive design (mobile-first)
```

---

## 🔐 AI-Specific Safety & Governance (MixerAI)

### Azure OpenAI Integration
```typescript
// Safety wrapper for AI calls
import { generateContent } from '@/lib/azure/openai';

async function safeAIGeneration(prompt: string, userId: string) {
  try {
    // 1. Sanitize input
    const sanitized = sanitizePrompt(prompt);
    
    // 2. Check rate limits
    await checkRateLimit(userId, 'ai-generation');
    
    // 3. Generate with timeout
    const result = await Promise.race([
      generateContent(sanitized),
      timeout(30000) // 30s timeout
    ]);
    
    // 4. Validate output
    if (!isValidContent(result)) {
      throw new Error('Invalid AI output');
    }
    
    return result;
  } catch (error) {
    // 5. Fallback to template
    return generateFromTemplate(prompt);
  }
}
```

### Data Governance Matrix
| Data Class | Can Log? | Can Store? | Can Transmit? | Retention |
|------------|----------|------------|---------------|-----------|
| Public | ✅ Yes | ✅ Yes | ✅ Yes | Indefinite |
| Internal | ✅ Yes | ✅ Yes | ⚠️ Internal only | 2 years |
| Confidential | ⚠️ Masked | ✅ Encrypted | ⚠️ Encrypted | 1 year |
| PII | ❌ No | ⚠️ Encrypted | ⚠️ With consent | 90 days |

### Cost Control Guardrails
```yaml
per_task_limits:
  max_tokens: 4000
  max_cost: $0.50
  timeout: 30s
  
per_day_limits:
  max_tokens: 500000
  max_cost: $25.00
  
abort_conditions:
  - usage > 120% of limit
  - repeated_errors > 3
  - infinite_loop_detected
```

---

## 🔑 Key Utilities & Helpers (MixerAI Specific)

### Authentication & Authorization
- `withAuth()` - Middleware wrapper for protected routes
- `checkPermission()` - Verify user permissions
- `createSupabaseServerClient()` - Server-side Supabase client
- `getCurrentUser()` - Get authenticated user from session

### API Utilities
- `handleApiError()` - Standardized error handling
- `rateLimit()` - Rate limiting middleware
- `validateRequest()` - Zod schema validation wrapper
- `apiFetch()` - Secure fetch wrapper with CSRF protection

### AI Integration
- `generateContent()` - Main content generation with Azure OpenAI
- `streamContent()` - Streaming AI responses
- `calculateTokens()` - Token estimation
- **Fallback Behavior**: When Azure OpenAI is unavailable, the system automatically falls back to template-based generation

### Database Helpers
- `withTransaction()` - Database transaction wrapper
- `withRetry()` - Retry logic for database operations

### UI Utilities
- `cn()` - Classname utility (clsx + tailwind-merge)
- `formatDate()` - Date formatting helper
- `truncate()` - Text truncation utility

---

## 📡 Observability Blueprint

### Structured Logging Standard
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO|WARN|ERROR|DEBUG",
  "service": "mixerai2.0",
  "trace_id": "uuid-v4",
  "span_id": "uuid-v4",
  "user_id_hash": "sha256(user_id)",
  "brand_id": "brand-uuid",
  "event": "descriptive.event.name",
  "data_class": "public|internal|confidential|pii",
  "duration_ms": 123,
  "error": null,
  "metadata": {}
}
```

### Four Golden Signals
```yaml
latency:
  metric: response_time_ms
  dimensions: [endpoint, method, status_code, brand_id]
  
traffic:
  metric: requests_per_second
  dimensions: [endpoint, method, user_type, brand_id]
  
errors:
  metric: error_rate
  dimensions: [endpoint, error_type, severity, brand_id]
  
saturation:
  metric: resource_utilization_percent
  dimensions: [cpu, memory, disk, network, database_connections]
```

---

## 💪 Resilience Patterns

### 1. Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let baseDelay = 100;
  const maxDelay = 10000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = delay * (0.75 + Math.random() * 0.5);
      await new Promise(resolve => setTimeout(resolve, jitter));
    }
  }
  throw new Error('Max retry attempts reached');
}
```

### 2. Azure OpenAI Circuit Breaker
```typescript
class AzureOpenAICircuitBreaker {
  private failures = 0;
  private lastFailure: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async call(operation: () => Promise<any>) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure!.getTime() > 30000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await operation();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = new Date();
      
      if (this.failures >= 5) {
        this.state = 'OPEN';
      }
      throw error;
    }
  }
}
```

---

## 🧪 Test Strategy & Data Management

### Test Pyramid Distribution (MixerAI)
```
       /\        5% - E2E Tests (Critical user journeys)
      /  \
     /    \     15% - Integration Tests (API, DB, Azure OpenAI)
    /      \
   /        \   30% - Component Tests (React components)
  /          \
 /____________\ 50% - Unit Tests (Utilities, hooks)
```

### Test Data Management Rules
```yaml
forbidden:
  - Real production data in tests
  - Actual PII in fixtures
  - Hardcoded test credentials
  - Real Azure OpenAI API calls in unit tests

required:
  - Synthetic data generation
  - Deterministic seeds
  - Isolated test databases
  - Mocked external services
  - Test brand contexts
```

### MixerAI Test Utilities
```bash
# Add test user with brand
./scripts/add-test-user.sh

# Create sample brands
./scripts/create-sample-brands.sh

# Reset test database
./scripts/reset-database.sh

# Test AI integration
node scripts/test-azure-openai.js
```

---

## 🚀 Release Management & Rollback

### Release Gate Checklist (MixerAI)
```yaml
pre_release_gates:
  - [ ] All tests passing
  - [ ] Security scan clean
  - [ ] Performance benchmarks met
  - [ ] Documentation updated
  - [ ] Migration scripts tested
  - [ ] Rollback plan documented
  - [ ] Monitoring alerts configured
  - [ ] Feature flags configured
  - [ ] Azure OpenAI quotas verified
  - [ ] Supabase RLS policies reviewed

smoke_tests:
  - [ ] Service starts successfully
  - [ ] Health check responds 200
  - [ ] Core API endpoints work
  - [ ] Database connections work
  - [ ] Azure OpenAI integration works
  - [ ] Authentication flow works
  - [ ] Multi-tenant isolation verified
```

### Rollback Playbook
```bash
# 1. Detect issue
alert: "Error rate > 5% for 2 minutes"

# 2. Assess impact
check: logs, metrics, traces

# 3. Decision point (< 2 min)
IF user_impact > threshold:
  execute: rollback
ELSE:
  execute: hotfix

# 4. Rollback procedure
rollback_steps:
  1. Switch traffic to previous version
  2. Verify health checks pass
  3. Confirm error rate drops
  4. Document incident
  5. Root cause analysis

# 5. MixerAI rollback commands
npm run deploy:rollback
vercel rollback
```

---

## 📝 Architecture Decision Records (ADR)

### ADR Template (15-minute limit)
```markdown
# ADR-[YYYY-MM-DD]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[1-2 sentences on why this decision is needed]

## Problem
[What specific problem are we solving?]

## Options Considered
1. **Option A**: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]

2. **Option B**: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]

3. **Option C**: [Brief description]
   - Pros: [Benefits]
   - Cons: [Drawbacks]

## Decision
[Which option and why - 1-2 sentences]

## Consequences
- Positive: [What improves]
- Negative: [What trade-offs]
- Risks: [What could go wrong]

## Test Strategy
[How we'll validate this works]

## Rollback Plan
[How to undo if needed]
```

---

## 🔌 API Contracts & Stability

### API Versioning Strategy (MixerAI)
```yaml
versioning:
  strategy: URL  # /api/v1/, /api/v2/
  format: "v[MAJOR]"
  
  compatibility:
    breaking_changes: New major version
    new_features: Same version, additive only
    bug_fixes: Same version, no changes
    deprecation: 6 months notice minimum
```

### API Contract Template
```yaml
endpoint: /api/v1/resource
method: POST
auth: Bearer token required (Supabase JWT)

request:
  headers:
    Content-Type: application/json
    X-Request-ID: uuid (required)
    X-Idempotency-Key: string (required for mutations)
    X-Brand-ID: uuid (required for multi-tenant)
    
  body:
    type: object
    required: [field1, field2]
    properties:
      field1: string, max 255
      field2: number, > 0
      field3: enum [a, b, c] (optional)

response:
  success:
    status: 201
    body:
      id: string
      created_at: ISO8601
      data: object
      
  errors:
    400: Validation error
    401: Unauthorized
    403: Forbidden
    404: Not found
    409: Conflict (duplicate)
    429: Rate limited
    500: Internal error
    503: Service unavailable
```

---

## 📋 PR/Change Templates

### Pull Request Template (MixerAI)
```markdown
## What Changed
[1-2 sentences describing the change]

## Why
[Link to issue/ticket and brief context]

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation only
- [ ] Performance improvement
- [ ] Refactoring
- [ ] Security fix

## Assumptions Made
- [List any assumptions that influenced implementation]
- [Document decisions not evident in code]

## Risk Assessment
**Risk Level**: [Low | Medium | High]
**Potential Impact**: [What could go wrong]
**Rollback Plan**: [How to undo]

## Testing Evidence
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] Performance impact measured
- [ ] Multi-tenant isolation verified
- [ ] AI fallback tested

### Test Results
```
npm run check: ✅
npm run test: ✅
npm run build: ✅
```

## Quality Gates Status
- [ ] Build passes: ✅
- [ ] Tests pass: ✅  
- [ ] Coverage > 80%: ✅
- [ ] No security issues: ✅
- [ ] Performance acceptable: ✅
- [ ] Documentation updated: ✅
- [ ] RLS policies verified: ✅

## Deployment Notes
[Any special deployment steps or considerations]
```

---

## 🔄 Verification Pipeline (MixerAI)

### Universal Pipeline Order
```yaml
pipeline:
  1_lint:
    command: npm run lint
    fail_fast: true
    
  2_typecheck:
    command: npm run check
    fail_fast: true
    
  3_security:
    command: "npm audit"
    fail_fast: true
    
  4_unit_tests:
    command: npm test
    fail_fast: true
    coverage_threshold: 80
    
  5_integration_tests:
    command: "npm test -- --testPathPattern=integration"
    fail_fast: false
    
  6_build:
    command: npm run build
    fail_fast: true
    
  7_performance:
    command: "npm run analyze"
    fail_threshold: "20% regression"
    
  8_smoke:
    command: "npm start && curl http://localhost:3000/api/health"
    timeout: 30s
```

---

## 🌐 Context Window Management

### Optimal Context Loading Strategy (MixerAI)
```yaml
context_priority:
  1_critical:  # Always include
    - Current task description
    - Error messages/stack traces
    - Direct dependencies
    - Supabase schema for affected tables
    
  2_important:  # Include if space
    - Related React components
    - API route handlers
    - Recent git history
    - Test files
    
  3_helpful:  # Include if ample space
    - UI component documentation
    - Azure OpenAI configuration
    - Similar examples
    - Historical context
    
  4_optional:  # Only if requested
    - Full codebase structure
    - External documentation
    - Performance metrics
    - Bundle analysis
```

---

## 🚦 Quick Reference Card

### Before Starting ANY Task
```bash
1. Load Project Profile (top of this doc)
2. Check Definition of Ready
3. Assess complexity score
4. Review relevant patterns
5. Create checkpoint: git commit -m "checkpoint: before [task]"
```

### During Development Loop
```bash
while not_done:
  1. Make 1-3 atomic changes
  2. Run: npm run lint
  3. Run: npm run check
  4. Run: npm test
  5. If all pass: git commit -m "checkpoint: [description]"
  6. If > 1 hour: document progress
```

### Before Marking Complete
```bash
1. Run full verification pipeline
2. Check all quality gates
3. Update documentation
4. Create PR with template
5. Verify rollback plan exists
```

### If Something Goes Wrong
```bash
1. Stop immediately
2. Check git status
3. Identify last working commit
4. Rollback: git reset --hard [commit]
5. Document what failed
6. Try smaller incremental approach
```

---

## 🐛 Bug Fixing Workflow (MixerAI Specific)

### QA Issue Resolution Process
When working on issues reported by QA:

#### 1. Issue Discovery
```bash
# List all open issues
gh issue list --repo gmi-common/mixerai2.0

# View specific issue details
gh issue view [issue-number] --repo gmi-common/mixerai2.0
```

#### 2. Run Discovery Protocol for Each Issue
- Run full pre-development discovery
- Create issue-specific discovery report
- Analyze the bug reproduction steps
- Identify affected components

#### 3. Implementation Process
1. Create a todo list for all issues to track
2. For each issue:
   - Mark as in_progress in todo list
   - Reproduce the issue locally
   - Implement the fix
   - Run verification tests
   - Mark as completed in todo list

#### 4. Issue Labeling
```bash
# Create 'Ready for QA' label if it doesn't exist
gh label create "Ready for QA" --description "Fix implemented and ready for QA testing" --color 0E8A16

# Label issue when fix is complete
gh issue edit [issue-number] --add-label "Ready for QA"
```

---

## 🚑 Troubleshooting Guide (MixerAI Specific)

### Build Errors
```bash
# Memory issues during build
NODE_OPTIONS="--max-old-space-size=8192" npm run build

# Clear all caches
rm -rf .next node_modules/.cache
npm run build

# TypeScript errors
npm run check
npm run db:types  # Regenerate DB types if needed
```

### Database Connection Issues
```bash
# Test Supabase connection
node scripts/test-db-connection.js

# Check environment variables
env | grep SUPABASE
env | grep POSTGRES

# Reset local database
./scripts/reset-database.sh

# View detailed logs
DEBUG=supabase:* npm run dev
```

### Authentication Problems
```bash
# Test auth flow
node scripts/test-auth-flow.js

# Clear auth cookies (in browser DevTools)
# Application > Cookies > Clear all

# Add test user
./scripts/add-test-user.sh

# Check session
# Browser DevTools > Application > Local Storage > supabase.auth.token
```

### AI Integration Issues
```bash
# Test Azure OpenAI
node scripts/test-azure-openai.js

# Force fallback mode
FORCE_OPENAI_FALLBACK=true npm run dev

# Check rate limits
# Look for 429 errors in Network tab

# Verify credentials
env | grep AZURE_OPENAI
```

### Common Error Messages & Solutions

#### "Invalid hook call"
- Check for duplicate React versions: `npm ls react`
- Ensure hooks are only called from React components

#### "Hydration failed"
- Check for date/time rendering without proper formatting
- Ensure consistent server/client rendering
- Use `suppressHydrationWarning` sparingly

#### "NEXT_REDIRECT"
- This is normal behavior for Next.js redirects
- Not an actual error, just informational

#### "Too many re-renders"
- Check for setState calls in render
- Verify useEffect dependencies
- Use React DevTools Profiler

---

## 📜 Universal Principles Summary

### The 10 Commandments of AI-Assisted Development
1. **Thou shalt make no change without understanding context**
2. **Thou shalt not commit secrets or PII**
3. **Thou shalt test every change before proceeding**
4. **Thou shalt document every assumption**
5. **Thou shalt prefer small increments over big bangs**
6. **Thou shalt respect existing patterns**
7. **Thou shalt handle errors gracefully**
8. **Thou shalt measure before optimizing**
9. **Thou shalt make rollback possible**
10. **Thou shalt stop when uncertain and ask**

---

## 🎯 Important Instruction Reminders

### Core Principles
1. **Do what has been asked; nothing more, nothing less**
2. **NEVER create files unless they're absolutely necessary** for achieving the goal
3. **ALWAYS prefer editing an existing file** to creating a new one
4. **NEVER proactively create documentation files** (*.md) or README files unless explicitly requested

### When Working on Tasks
- Focus on the specific task at hand
- Don't add "nice to have" features unless requested
- Don't refactor unrelated code unless it's blocking the task
- Don't create helper files unless the implementation requires it
- Don't write documentation unless asked

### Communication
- Be concise and direct
- Report what was done, not what could be done
- If something can't be done, explain why briefly
- Don't suggest additional improvements unless asked
- Keep status updates factual and brief

### Before Creating Any File Ask Yourself:
1. Did the user explicitly ask for this file?
2. Is this file absolutely necessary for the feature to work?
3. Can I implement this by modifying an existing file instead?
4. Am I creating this just to be "helpful" or "complete"?

If the answer to #4 is yes, or #1 and #2 are no - DON'T CREATE THE FILE.

---

## 🗂️ Directory Organization & Maintenance

### Directory Structure Rules
1. **NO temporary files in root** - All work files, reports, and temporary SQL files should be in appropriate subdirectories or deleted after use
2. **Documentation belongs in /docs** - All .md files (except README.md, SECURITY.md, CLAUDE.md) should be in the docs directory
3. **Keep backups out of git** - Backup directories should be in .gitignore
4. **Clean up after yourself** - Remove test files, temporary reports, and work-in-progress files before committing

### File Naming Conventions
- Use kebab-case for all files: `user-profile.tsx`, not `userProfile.tsx`
- Date-prefixed files should use ISO format: `2025-07-04-report.md`
- Test files: `[name].test.ts` or `[name].spec.ts`
- Type definition files: `[name].types.ts`

### Date Handling
**CRITICAL**: Never hardcode dates or rely on AI to know the current date. Always get dates programmatically:

```typescript
// ❌ WRONG - AI doesn't know the actual date
const reportDate = '2025-07-04';

// ✅ CORRECT - Always get date programmatically
const reportDate = new Date().toISOString().split('T')[0];
const timestamp = new Date().toISOString();
```

---

**Version**: 4.0.0-mixerai  
**Last Updated**: 2025-08-26  
**Status**: Production Ready  
**License**: MIT  

**Remember**: This is a living document. Update based on learnings. Quality > Speed. Safety > Features.

---

*End of Document*