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

## Recent Updates

- **Navigation System**: Moved from nested `/dashboard/*` routes to root-level URLs for simpler navigation
- **Content Generation**: Added AI-powered content generation with Azure OpenAI
- **API Improvements**: Enhanced API routes with proper error handling and consistent response formats

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

### Workflow Management

Workflows define how content is created and approved for each brand and content type:
- Customizable by brand and content type
- Multiple approval steps with role assignments
- Status tracking for content in the workflow

## License

This project is licensed under the MIT License 