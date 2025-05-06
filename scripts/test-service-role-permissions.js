#!/usr/bin/env node

/**
 * MixerAI 2.0 - Service Role Permissions Test Script
 * 
 * This script tests if the Supabase service role has proper permissions on auth.users table
 */
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Create Supabase client with service role
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase URL or service role key');
  console.error('Please ensure your .env file contains:');
  console.error('NEXT_PUBLIC_SUPABASE_URL=<your supabase URL>');
  console.error('SUPABASE_SERVICE_ROLE_KEY=<your service role key>');
  process.exit(1);
}

console.log('🔑 Supabase configuration found');

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testServiceRolePermissions() {
  console.log('=== Testing Service Role Permissions ===');
  
  // Test 1: Check if service role can read users table
  console.log('\n🔍 Test 1: Reading from users table...');
  try {
    // Try with the 'users' table instead of 'auth.users'
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (error) {
      console.error('❌ Failed to read from users table:', error.message);
      console.error('Error details:', error);
      
      // Try again with a direct RPC call instead
      console.log('Trying alternate approach to access auth users...');
      const { data: authUsers, error: rpcError } = await supabase.rpc('get_auth_user_by_email', {
        p_email: 'test@example.com'
      });
      
      if (rpcError) {
        console.error('❌ Failed to access auth users via RPC:', rpcError.message);
        return false;
      } else {
        console.log('✅ Successfully accessed auth users via RPC function');
      }
    } else {
      console.log('✅ Successfully read from users table:', users.length > 0 ? users[0] : 'No users found');
    }
  } catch (error) {
    console.error('❌ Unexpected error reading users:', error);
    return false;
  }

  // Test 2: Check if we can use the auth.admin API directly
  console.log('\n🔍 Test 2: Testing auth.admin API access...');
  try {
    // Just list users instead of creating one to avoid side effects
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    
    if (error) {
      console.error('❌ Failed to access auth.admin API:', error.message);
      console.error('Error details:', error);
      console.error('This suggests your service role key may not have proper admin permissions');
      return false;
    }
    
    console.log('✅ Successfully accessed auth.admin API');
    console.log(`Found ${data.users.length} users`);
  } catch (error) {
    console.error('❌ Unexpected error accessing auth.admin API:', error);
    return false;
  }

  // Test 3: Check if we can use direct RPC functions
  console.log('\n🔍 Test 3: Testing RPC function access...');
  try {
    // Try to call the function we created in our fix script
    const { data, error } = await supabase.rpc('handle_new_user');
    
    // This will likely fail with a specific error about arguments,
    // but we want to see if it's a permissions error or just a usage error
    if (error) {
      if (error.message.includes('permission denied') || 
          error.message.includes('not authorized') ||
          error.message.includes('access')) {
        console.error('❌ Permission denied when accessing RPC function:', error.message);
        console.error('This suggests your service role lacks EXECUTE permission on functions');
        return false;
      } else {
        // This is expected - we're just checking if we can access the function at all
        console.log('✅ Service role can access RPC functions (argument error is expected)');
      }
    } else {
      console.log('✅ Successfully called RPC function');
    }
  } catch (error) {
    console.error('❌ Unexpected error accessing RPC function:', error);
    return false;
  }

  // Test 4: Create a test user directly using the admin API
  console.log('\n🔍 Test 4: Testing direct user creation with admin API...');
  
  const testId = Date.now();
  const testEmail = `api-test-${testId}@example.com`;
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: {
        full_name: 'API Test User',
        role: 'viewer'
      }
    });
    
    if (error) {
      console.error('❌ Failed to create user via admin API:', error.message);
      console.error('Error details:', error);
      return false;
    }
    
    console.log('✅ Successfully created user via admin API');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error creating user via admin API:', error);
    return false;
  }
}

async function main() {
  console.log('=== MixerAI 2.0 Service Role Permissions Test ===');
  console.log(`URL: ${supabaseUrl}`);
  
  const result = await testServiceRolePermissions();
  
  if (result) {
    console.log('\n✅ Service role permissions test PASSED');
    console.log('Your service role appears to have proper permissions');
    console.log('If you are still having issues with user invitations, check:');
    console.log('1. The auth.admin.inviteUserByEmail function specifically');
    console.log('2. Any RLS policies on profiles or other tables');
    console.log('3. Your email templates in the Supabase dashboard');
  } else {
    console.log('\n❌ Service role permissions test FAILED');
    console.log('Some permissions tests failed. Please check the Supabase dashboard and ensure:');
    console.log('1. Your service role key is valid and up-to-date');
    console.log('2. The service_role user has proper grants on auth.users table');
    console.log('3. The auth schema is accessible to the service_role');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 