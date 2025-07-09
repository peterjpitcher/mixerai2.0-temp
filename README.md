# MixerAI 2.0

MixerAI 2.0 is an application that creates AI-generated content with Azure OpenAI for digital marketing needs. It allows users to create and manage content for different brands using customizable workflows.

## Core Features Overview

- **AI Content Generation**: Leverages Azure OpenAI for high-quality marketing content.
- **Brand Management**: Organize content with brand-specific identities, tone, and guardrails.
- **Workflow Management**: Define and manage multi-step content approval processes.
- **User Management**: Role-based access control for team collaboration using Supabase Auth.
- **Content Template System**: Flexible templates for creating diverse content types.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase Account (for database and authentication)
- Azure OpenAI API key and configured deployment

### Environment Setup

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd MixerAI-2.0a # Or your repository directory name
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up environment variables**:
    -   Copy `.env.example` (if it exists) or create a new `.env` file.
    -   Populate it with your credentials for:
        -   Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
        -   Azure OpenAI: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`
        -   (Refer to `docs/database.md` and `docs/azure_openai_integration.md` for more details on these variables).
4.  **Database Setup**:
    -   Ensure your Supabase database schema is set up. You might need to apply migrations or run schema scripts. See `docs/database.md` and the `supabase-schema.sql` file.
5.  **Issue Reporter Setup** (Optional):
    -   If you want to enable screenshot uploads in the issue reporter, run:
    ```bash
    npm run setup:screenshots
    ```
    -   This creates a directory in your GitHub repo for storing issue screenshots.
6.  **Start the development server**:
    ```bash
    npm run dev
    ```
    The application should now be running, typically at `http://localhost:3000`.

## Documentation

For comprehensive information about the project, including architecture, features, and technical details, please see the main project documentation:

- **[Project Documentation](./DOCUMENTATION.md)**

Key topics covered in separate documents within the `/docs` directory include:

- [Authentication and User Management](./docs/authentication.md)
- [API Reference](./docs/api_reference.md)
- [Azure OpenAI Integration](./docs/azure_openai_integration.md)
- [Brand Management](./docs/brand_management.md)
- [Database Documentation](./docs/database.md)
- [Deployment and Operations Guide](./docs/deployment.md)
- [Navigation System](./docs/NAVIGATION_SYSTEM.md)
- [User Flows](./docs/user_flows.md)
- More specific topics are detailed within linked sections of the main [Project Documentation](./DOCUMENTATION.md).

### Other Resources

-   **Email Templates**: Located in `/docs/email-templates/`.
-   **Utility Scripts**: Various helper scripts are available in the `/scripts/` directory.

## License

This project is licensed under the MIT License (or your chosen license). 