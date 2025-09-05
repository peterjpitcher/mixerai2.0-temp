#!/usr/bin/env node

/**
 * MixerAI 2.0 - Admin API Test Script
 * 
 * This script tests if the Supabase admin API works correctly
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
console.log(`URL: ${supabaseUrl}`);
console.log(`Service key (first 10 chars): ${supabaseServiceKey.substring(0, 10)}...`);

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAdminAPI() {
  console.log('\n=== Testing Supabase Admin API ===');
  
  // Test 1: List Users
  console.log('\n🔍 Test 1: Listing users...');
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ 
      page: 1, 
      perPage: 10
    });
    
    if (error) {
      console.error('❌ Failed to list users:', error.message);
      console.error('Error details:', error);
      console.error('This suggests your service role key may not have proper admin permissions');
      return false;
    }
    
    console.log(`✅ Successfully listed users. Found ${data.users.length} users.`);
    
    // Log user details (for debugging)
    console.log('Sample user data:');
    if (data.users.length > 0) {
      const user = data.users[0];
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Created: ${user.created_at}`);
      console.log(`  User metadata: ${JSON.stringify(user.user_metadata || {})}`);
    } else {
      console.log('  No users found');
    }
  } catch (error) {
    console.error('❌ Unexpected error listing users:', error);
    return false;
  }

  // Test 2: Create User
  console.log('\n🔍 Test 2: Creating a user...');
  
  const testTimestamp = Date.now();
  const testEmail = `test-admin-api-${testTimestamp}@example.com`;
  
  try {
    const { data, error } = await supabase.auth.admin.createUser({
      email: testEmail,
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin API Test User',
        role: 'viewer'
      }
    });
    
    if (error) {
      console.error('❌ Failed to create user:', error.message);
      console.error('Error details:', error);
      
      if (error.message.includes('already')) {
        console.log('User already exists - this could be a duplicate email');
      } else if (error.message.includes('permission') || error.message.includes('access')) {
        console.log('Permission issue - check service role key permissions');
      } else if (error.message.includes('database')) {
        console.log('Database error - could be trigger, foreign key, or RLS issue');
      }
      
      return false;
    }
    
    console.log('✅ Successfully created user!');
    console.log(`Created user with ID: ${data.user.id}`);
    console.log(`Email: ${data.user.email}`);
    
    // Test 3: Invite User (This is what the invitation system uses)
    console.log('\n🔍 Test 3: Inviting a user...');
    
    const inviteTimestamp = Date.now();
    const inviteEmail = `invite-test-${inviteTimestamp}@example.com`;
    
    try {
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: {
          full_name: 'Invite Test User',
          role: 'viewer'
        }
      });
      
      if (inviteError) {
        console.error('❌ Failed to invite user:', inviteError.message);
        console.error('Error details:', inviteError);
        
        // Check for specific errors
        if (inviteError.message.includes('Database error')) {
          console.log('\n🔍 Analyzing database error...');
          console.log('This is likely due to the trigger failing to create related records.');
          console.log('Check if these issues exist:');
          console.log('1. Missing profiles table or foreign key constraints');
          console.log('2. Trigger function has bugs or missing permissions');
          console.log('3. Row-level security (RLS) might be blocking operations');
          console.log('\nTo resolve:');
          console.log('- Check that the on_auth_user_created trigger exists and works');
          console.log('- Verify that the trigger has proper permissions');
          console.log('- Look for errors in the Supabase logs');
        }
        
        return false;
      }
      
      console.log('✅ Successfully invited user!');
      console.log(`Invited user with ID: ${inviteData.user.id}`);
      console.log(`Email: ${inviteData.user.email}`);
      
      return true;
    } catch (inviteError) {
      console.error('❌ Unexpected error inviting user:', inviteError);
      return false;
    }
  } catch (error) {
    console.error('❌ Unexpected error creating user:', error);
    return false;
  }
}

async function main() {
  const result = await testAdminAPI();
  
  if (result) {
    console.log('\n✅ Admin API tests PASSED');
    console.log('The Supabase admin API is working correctly');
    console.log('If the user invitation system is still failing, check:');
    console.log('1. Client-side form validation and error handling');
    console.log('2. The API route implementation in src/app/api/users/invite/route.ts');
    console.log('3. Database triggers and functions for profile creation');
  } else {
    console.log('\n❌ Admin API tests FAILED');
    console.log('Issues with the Supabase admin API were detected.');
    console.log('To fix this:');
    console.log('1. Verify your SUPABASE_SERVICE_ROLE_KEY is correct in .env');
    console.log('2. Check for database-related issues using supabase/migrations/diagnose-invitation-system.sql');
    console.log('3. If trigger issues persist, check if on_auth_user_created is correctly set up');
    console.log('4. Consider running supabase/migrations/fix-invitation-system-modified.sql again');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 