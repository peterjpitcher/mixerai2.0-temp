# MixerAI 2.0

MixerAI 2.0 is an application that creates AI-generated content with Azure OpenAI for digital marketing needs. It allows users to create and manage content for different brands using customizable workflows.

## Features

- **AI Content Generation**: Create high-quality marketing content using Azure OpenAI
- **Brands Management**: Organize content by brands with brand-specific parameters
- **Workflow Management**: Define approval processes for content creation
- **User Management**: Role-based access control for team collaboration
- **Clean Navigation**: Simplified URL structure with consistent navigation system

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or Supabase)
- Azure OpenAI API key

### Environment Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update with your credentials:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Documentation

For more detailed information, see the following documentation:

- [Main Documentation](./docs/DOCUMENTATION.md)
- [Content Generation](./docs/CONTENT_GENERATION.md)
- [Navigation Updates](./docs/NAVIGATION_UPDATES.md)
- [Database Setup](./docs/DATABASE_SETUP.md)
- [User Management](./docs/USER_MANAGEMENT.md)

## Recent Updates

- **Navigation System**: Moved from nested `/dashboard/*` routes to root-level URLs for simpler navigation
- **Content Generation**: Added AI-powered content generation with Azure OpenAI
- **API Improvements**: Enhanced API routes with proper error handling and consistent response formats
- **User Management**: Improved user invitation system with required job title field
- **Database Migrations**: Added migrations to handle job_title field in profiles table

## Core Features

### Content Generation

MixerAI 2.0 leverages Azure OpenAI to generate high-quality marketing content. The content generation feature allows users to:

- Generate content based on brand-specific tone and style
- Create different types of content (articles, product descriptions)
- Customize content with keywords and specific instructions
- Save generated content to the database
- Integrate with approval workflows

For detailed documentation on the content generation feature, see [docs/CONTENT_GENERATION.md](docs/CONTENT_GENERATION.md).

### Brands Management

Brands represent the entities for which content is created. Each brand includes:
- Name and basic information
- Brand identity description
- Tone of voice guidelines
- Content guardrails

### User Management

Users can access multiple brands with different permission levels:
- Admin: Full access to all features
- Editor: Can create and edit content
- Viewer: Can only view content

The user management system features:
- User invitation via email
- Profile management with required fields (including job title)
- Role-based permissions
- Brand-specific access control

For detailed documentation on user management, see [docs/USER_MANAGEMENT.md](docs/USER_MANAGEMENT.md).

### Workflow Management

Workflows define how content is created and approved for each brand and content type:
- Customizable by brand and content type
- Multiple approval steps with role assignments
- Status tracking for content in the workflow

## License

This project is licensed under the MIT License

## OpenAI Testing Tools

MixerAI 2.0 includes a comprehensive set of tools for testing and debugging the Azure OpenAI integration.

### Testing Page

Access the testing tools at `/openai-test` in your running application. The testing page includes:

- Brand identity generation testing
- Content generation testing
- Direct API testing
- Environment configuration display
- System status monitoring

### Features

- Detect whether content is truly AI-generated or using templates
- Test various API endpoints directly
- View detailed error information and response times
- Configure and test with different parameters

### Documentation

For detailed information on using the OpenAI testing tools, see [OPENAI_TESTING_TOOLS.md](docs/OPENAI_TESTING_TOOLS.md) in the docs directory. 