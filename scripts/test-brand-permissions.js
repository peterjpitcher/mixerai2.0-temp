#!/usr/bin/env node

/**
 * Test script for debugging user permissions and brand management system
 * This script checks for common issues with brand creation, user role assignment,
 * and brand permissions enforcement.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test user emails (change these to match your test users)
const TEST_ADMIN_EMAIL = 'admin@example.com';
const TEST_EDITOR_EMAIL = 'editor@example.com';
const TEST_VIEWER_EMAIL = 'viewer@example.com';

async function runTests() {
  console.log('Starting brand permissions debugging...\n');

  try {
    // 1. Check user_brand_permissions table structure
    console.log('1. Checking user_brand_permissions table...');
    const { data: permissions, error: permError } = await supabase
      .from('user_brand_permissions')
      .select('*')
      .limit(5);
    
    if (permError) {
      console.error('Error fetching permissions:', permError);
    } else {
      console.log(`Found ${permissions.length} permission records`);
      if (permissions.length > 0) {
        console.log('Sample permission:', permissions[0]);
      }
    }

    // 2. Check for orphaned permissions (permissions without valid users or brands)
    console.log('\n2. Checking for orphaned permissions...');
    const { data: orphanedPerms, error: orphanedError } = await supabase
      .from('user_brand_permissions')
      .select(`
        id,
        user_id,
        brand_id,
        role,
        user:profiles!user_id(id, full_name),
        brand:brands!brand_id(id, name)
      `);

    if (orphanedError) {
      console.error('Error checking orphaned permissions:', orphanedError);
    } else {
      const orphaned = orphanedPerms.filter(p => !p.user || !p.brand);
      if (orphaned.length > 0) {
        console.log(`Found ${orphaned.length} orphaned permissions:`, orphaned);
      } else {
        console.log('No orphaned permissions found');
      }
    }

    // 3. Check for role mismatches
    console.log('\n3. Checking for role inconsistencies...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Total users: ${users.length}`);
      
      // Check each user's roles
      for (const user of users.slice(0, 5)) { // Check first 5 users
        const globalRole = user.user_metadata?.role;
        const { data: brandRoles, error: brandRolesError } = await supabase
          .from('user_brand_permissions')
          .select('brand_id, role, brands(name)')
          .eq('user_id', user.id);
        
        if (!brandRolesError && brandRoles) {
          console.log(`\nUser: ${user.email}`);
          console.log(`  Global role: ${globalRole || 'none'}`);
          console.log(`  Brand permissions: ${brandRoles.length}`);
          brandRoles.forEach(br => {
            console.log(`    - ${br.brands?.name || br.brand_id}: ${br.role}`);
          });
        }
      }
    }

    // 4. Check brand creation function
    console.log('\n4. Testing brand creation function...');
    const { data: funcTest, error: funcError } = await supabase.rpc('create_brand_with_permissions', {
      p_creator_user_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      p_brand_name: 'Test Brand ' + Date.now(),
      p_website_url: 'https://test.com',
      p_country: 'US',
      p_language: 'en'
    });

    if (funcError) {
      if (funcError.message.includes('violates foreign key constraint')) {
        console.log('Brand creation function exists but needs valid user ID');
      } else {
        console.error('Error testing brand creation:', funcError);
      }
    } else {
      console.log('Brand creation function works:', funcTest);
    }

    // 5. Check RLS policies
    console.log('\n5. Checking RLS policies...');
    
    // Test if RLS is enabled on critical tables
    const tables = ['brands', 'user_brand_permissions', 'content'];
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      console.log(`\nTable: ${table}`);
      if (error) {
        console.log('  RLS might be enabled (good) or table has issues:', error.message);
      } else {
        console.log('  Service role can access (expected)');
      }
    }

    // 6. Check for common issues
    console.log('\n6. Checking for common issues...');
    
    // Check for users with no brand permissions
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, full_name, email');
    
    if (allUsers) {
      for (const profile of allUsers) {
        const { data: userPerms } = await supabase
          .from('user_brand_permissions')
          .select('brand_id')
          .eq('user_id', profile.id);
        
        if (!userPerms || userPerms.length === 0) {
          console.log(`User ${profile.email} has no brand permissions`);
        }
      }
    }

    // 7. Check enum values
    console.log('\n7. Checking role enum values...');
    const { data: enumCheck, error: enumError } = await supabase
      .from('user_brand_permissions')
      .select('role')
      .limit(10);
    
    if (enumCheck) {
      const uniqueRoles = [...new Set(enumCheck.map(r => r.role))];
      console.log('Found role values:', uniqueRoles);
    }

    // 8. Test brand admin assignment during creation
    console.log('\n8. Checking if brand_admin role issue exists...');
    const { data: brandAdminCheck } = await supabase
      .from('user_brand_permissions')
      .select('*')
      .eq('role', 'brand_admin');
    
    if (brandAdminCheck && brandAdminCheck.length > 0) {
      console.log('WARNING: Found "brand_admin" role in database. This should be "admin"!');
      console.log('Affected records:', brandAdminCheck.length);
    } else {
      console.log('No "brand_admin" role found (good)');
    }

    console.log('\n\nDebugging complete!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the tests
runTests();