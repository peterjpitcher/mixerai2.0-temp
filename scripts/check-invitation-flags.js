#!/usr/bin/env node

/**
 * Script to check invitation feature flags in the current environment
 * 
 * Run this script in production, staging, or development environments
 * to verify the current configuration of invitation-related feature flags.
 */

// Helper to safely read environment variables with fallbacks
function getEnvVar(name, defaultValue = '') {
  return process.env[name] || defaultValue;
}

// Get feature flag from environment variables, with fallback
function getFeatureFlagValue(flagName, defaultValue = false) {
  const flagValue = process.env[`FEATURE_${flagName.toUpperCase()}`];
  
  if (flagValue === undefined) {
    return defaultValue;
  }
  
  return flagValue === 'true';
}

// Function to check all invitation-related flags
function checkInvitationFlags() {
  console.log('=========================================');
  console.log('INVITATION SYSTEM FEATURE FLAGS');
  console.log('=========================================');
  console.log('');
  
  const environment = getEnvVar('NODE_ENV', 'development');
  
  console.log(`Environment: ${environment}`);
  console.log('');
  
  // Check invitation-related feature flags
  const flags = {
    INVITE_RETRY_LOGIC: getFeatureFlagValue('INVITE_RETRY_LOGIC', false),
    INVITE_DIRECT_SQL: getFeatureFlagValue('INVITE_DIRECT_SQL', false),
    INVITE_ENHANCED_LOGGING: getFeatureFlagValue('INVITE_ENHANCED_LOGGING', true),
    INVITE_DRY_RUN: getFeatureFlagValue('INVITE_DRY_RUN', false)
  };
  
  // Display flag configuration
  console.log('Feature Flag Configuration:');
  console.log('---------------------------');
  
  Object.entries(flags).forEach(([name, value]) => {
    const status = value ? '✅ ENABLED' : '❌ DISABLED';
    const envVarName = `FEATURE_${name}`;
    const rawValue = getEnvVar(envVarName, 'not set');
    
    console.log(`${name}: ${status}`);
    console.log(`  Environment variable: ${envVarName}=${rawValue}`);
    console.log('');
  });
  
  // Check Supabase configuration
  console.log('Supabase Configuration:');
  console.log('----------------------');
  
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', 'not set');
  const hasAnonKey = !!getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const hasServiceKey = !!getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  const serviceKeyLength = getEnvVar('SUPABASE_SERVICE_ROLE_KEY', '').length;
  
  console.log(`NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 10)}...`);
  console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasAnonKey ? 'Set' : 'Not set'}`);
  console.log(`SUPABASE_SERVICE_ROLE_KEY: ${hasServiceKey ? 'Set' : 'Not set'} (length: ${serviceKeyLength})`);
  console.log('');
  
  // Recommendations
  console.log('Recommendations:');
  console.log('---------------');
  
  if (!flags.INVITE_RETRY_LOGIC) {
    console.log('❗ Enable INVITE_RETRY_LOGIC for better reliability');
  }
  
  if (!flags.INVITE_DIRECT_SQL) {
    console.log('❗ Enable INVITE_DIRECT_SQL to bypass Supabase Auth API failures');
  }
  
  if (!flags.INVITE_ENHANCED_LOGGING) {
    console.log('❗ Enable INVITE_ENHANCED_LOGGING for better debugging');
  }
  
  if (!hasServiceKey) {
    console.log('❗ SUPABASE_SERVICE_ROLE_KEY is not set - this is critical for invitations');
  } else if (serviceKeyLength < 10) {
    console.log('❗ SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)');
  }
  
  console.log('');
  console.log('=========================================');
}

// Execute the check
checkInvitationFlags(); 