import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Check environment variables
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';
    const useLocalGeneration = process.env.USE_LOCAL_GENERATION === 'true';
    const debugMode = process.env.DEBUG_MODE === 'true';

    // Check Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    let supabaseConnected = false;
    
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data, error } = await supabase.from('brands').select('id').limit(1);
        supabaseConnected = !error;
      } catch (error) {
        console.error('Supabase connection error:', error);
      }
    }

    // Check for direct database connection
    const directDbConnected = Boolean(
      process.env.POSTGRES_HOST && 
      process.env.POSTGRES_PORT && 
      process.env.POSTGRES_USER && 
      process.env.POSTGRES_PASSWORD && 
      process.env.POSTGRES_DB
    );

    // Check template availability
    const localTemplatesAvailable = true; // Should always be available as fallback

    // Format response with available environment info
    return NextResponse.json({
      success: true,
      azureOpenAIEnabled: Boolean(azureEndpoint && azureApiKey && azureDeployment),
      azureEndpoint: azureEndpoint ? `${azureEndpoint}` : null,
      azureApiKey: Boolean(azureApiKey),
      azureDeployment,
      azureApiVersion,
      useLocalGeneration,
      supabaseConnected,
      supabaseUrl: Boolean(supabaseUrl),
      databaseProvider: supabaseConnected ? 'Supabase' : (directDbConnected ? 'Direct PostgreSQL' : 'None'),
      localTemplatesAvailable,
      directDbConnected,
      debugMode,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error checking environment:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to check environment: ${error.message}`
      },
      { status: 500 }
    );
  }
} 