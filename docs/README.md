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

## Documentation Structure

This documentation is organized into focused guides:

| Document | Description |
|----------|-------------|
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture and development patterns |
| **[USER_GUIDE.md](./USER_GUIDE.md)** | Complete user documentation and features |
| **[API_REFERENCE.md](./API_REFERENCE.md)** | API endpoints and integration guide |
| **[DATABASE.md](./DATABASE.md)** | Database schema and data management |
| **[AUTHENTICATION.md](./AUTHENTICATION.md)** | User authentication and permissions |
| **[AZURE_OPENAI.md](./AZURE_OPENAI.md)** | AI integration and content generation |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Production deployment and operations |
| **[SECURITY.md](./SECURITY.md)** | Security policies and vulnerability reporting |
| **[DEVELOPMENT.md](./DEVELOPMENT.md)** | Developer setup and coding guidelines |
| **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** | Common issues and solutions |

## Quick Navigation

### For Users
- [Getting Started Guide](./USER_GUIDE.md#getting-started)
- [Brand Management](./USER_GUIDE.md#brand-management)
- [Content Creation](./USER_GUIDE.md#content-creation)
- [Workflow Setup](./USER_GUIDE.md#workflow-management)

### For Developers
- [Project Architecture](./ARCHITECTURE.md)
- [API Integration](./API_REFERENCE.md)
- [Database Setup](./DATABASE.md)
- [Development Environment](./DEVELOPMENT.md)

### For Administrators
- [Deployment Guide](./DEPLOYMENT.md)
- [User Management](./AUTHENTICATION.md)
- [Security Configuration](./SECURITY.md)

## Support

- **Documentation Issues**: Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Security Issues**: See [SECURITY.md](./SECURITY.md) for reporting procedures
- **Development Help**: Review [DEVELOPMENT.md](./DEVELOPMENT.md) and [ARCHITECTURE.md](./ARCHITECTURE.md)

## License

This project is licensed under the MIT License.