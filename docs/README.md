# MixerAI 2.0 Documentation

MixerAI 2.0 is an AI-powered content generation platform that leverages Azure OpenAI to create high-quality marketing content with brand-specific identities, workflows, and approval processes.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase Account (for database and authentication)
- Azure OpenAI API key and configured deployment

### Installation
```bash
git clone <repository-url>
cd MixerAI2.0
npm install
```

### Environment Setup
```bash
# Azure OpenAI
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Start Development Server
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Core Features

- **AI Content Generation**: Azure OpenAI integration for marketing content
- **Brand Management**: Multi-brand support with identity, tone, and guardrails
- **Workflow Management**: Multi-step approval processes with user assignments
- **Template System**: Flexible content templates with dynamic fields
- **User Management**: Role-based access control with brand permissions
- **Claims Management**: Product claims with market-specific overrides

## 📚 Documentation Structure

This documentation is organized into focused categories for easy navigation:

### Documentation Categories

| Category | Path | Description |
|----------|------|-------------|
| **Architecture** | [/architecture](./architecture/) | System architecture, directory structure, API design |
| **Standards** | [/standards](./standards/) | UI standards, email templates, brand guidelines |
| **Guides** | [/guides](./guides/) | User guide, implementation guide, best practices |
| **Infrastructure** | [/infrastructure](./infrastructure/) | Redis, database, deployment setup |
| **Features** | [/features](./features/) | Claims, content generation, templates |
| **Testing** | [/testing](./testing/) | Test plans, reports, manual testing |
| **QA** | [/qa](./qa/) | QA resources, issue tracking, implementation guides |
| **API** | [/api](./api/) | API documentation and architecture |
| **Setup** | [/setup](./setup/) | Installation, migration, storage configuration |
| **PRD** | [/PRD](./PRD/) | Complete product requirements documentation |
| **Project Overview** | [/project-overview](./project-overview/) | Platform overview and executive summaries |
| **Communications** | [/communications](./communications/) | External communications and announcements |

### Key Documents

- **[Documentation Index](./index.md)** - Complete navigation of all documentation
- **[System Architecture](./architecture/system-architecture.md)** - Complete technical architecture
- **[Implementation Guide](./guides/implementation-guide.md)** - Development standards and patterns
- **[UI Standards](./standards/consolidated-ui-standards.md)** - UI/UX component guidelines
- **[User Guide](./guides/user-guide.md)** - End-user documentation

## Quick Navigation

### For Users
- [Getting Started Guide](./guides/user-guide.md#getting-started)
- [Brand Management](./guides/user-guide.md#brand-management)
- [Content Creation](./guides/user-guide.md#content-creation)
- [Workflow Setup](./guides/user-guide.md#workflow-management)

### For Developers
- [System Architecture](./architecture/system-architecture.md)
- [Implementation Standards](./guides/implementation-guide.md)
- [UI Component Guidelines](./standards/consolidated-ui-standards.md)
- [API Architecture](./api/api-architecture-review.md)
- [API Error Reference](./architecture/api-errors-fix-guide.md)

### For QA Teams
- [QA Onboarding](./qa/qa-onboarding-checklist.md)
- [Test Plans](./qa/comprehensive-test-plan.md)
- [Manual Testing](./testing/manual-testing-checklist.md)
- [Issue Guidelines](./qa/github-issue-guidelines.md)

### For Administrators
- [Infrastructure Setup](./infrastructure/infrastructure-redis-setup.md)
- [Storage Configuration](./setup/storage-setup.md)
- [Migration Guide](./setup/migration-path-update-summary.md)
- [Directory Organization](./architecture/directory-structure.md)
- [Email Templates](./standards/email-template-standards.md)

## Support

- **Implementation Help**: Review [Implementation Guide](./guides/implementation-guide.md)
- **Architecture Questions**: See [System Architecture](./architecture/system-architecture.md)
- **UI/UX Standards**: Check [UI Standards](./standards/consolidated-ui-standards.md)
- **Security Issues**: See [SECURITY.md](../SECURITY.md) in project root

## License

This project is licensed under the MIT License.