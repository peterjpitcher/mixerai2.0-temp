/**
 * Environment variable validation for production deployments
 * This ensures all required environment variables are present
 */

type RequiredEnvKeys = {
  AZURE_OPENAI_API_KEY: string | undefined;
  AZURE_OPENAI_ENDPOINT: string | undefined;
  AZURE_OPENAI_DEPLOYMENT_NAME: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY: string | undefined;
};

type OptionalEnvKeys = {
  NEXT_PUBLIC_APP_URL: string | undefined;
  GITHUB_TOKEN: string | undefined;
  GITHUB_OWNER: string | undefined;
  GITHUB_REPO: string | undefined;
  NEXT_PUBLIC_GITHUB_OWNER: string | undefined;
  NEXT_PUBLIC_GITHUB_REPO: string | undefined;
  PROXY_ALLOWED_HOSTS: string | undefined;
};

type ServerEnv = Readonly<RequiredEnvKeys & OptionalEnvKeys>;

const requiredEnvVars: RequiredEnvKeys = {
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

const optionalEnvVars: OptionalEnvKeys = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_OWNER: process.env.GITHUB_OWNER,
  GITHUB_REPO: process.env.GITHUB_REPO,
  NEXT_PUBLIC_GITHUB_OWNER: process.env.NEXT_PUBLIC_GITHUB_OWNER,
  NEXT_PUBLIC_GITHUB_REPO: process.env.NEXT_PUBLIC_GITHUB_REPO,
  PROXY_ALLOWED_HOSTS: process.env.PROXY_ALLOWED_HOSTS,
};

function buildEnv(): ServerEnv {
  return Object.freeze({
    ...requiredEnvVars,
    ...optionalEnvVars,
  });
}

function validateEnv(env: ServerEnv) {
  const missingVars: string[] = [];

  for (const [key, value] of Object.entries(env)) {
    if (key in requiredEnvVars && !value) {
      missingVars.push(key);
    }
  }

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please check your .env file or Vercel environment settings.'
    );
  }
}

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('getServerEnv is only available in server environments');
  }

  if (!cachedEnv) {
    const env = buildEnv();
    if (process.env.NODE_ENV === 'production') {
      validateEnv(env);
    }
    cachedEnv = env;
  }

  return cachedEnv;
}

export function getOptionalEnv(key: keyof OptionalEnvKeys): string | undefined {
  const env = getServerEnv();
  return env[key];
}
