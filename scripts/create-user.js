#!/usr/bin/env node

require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with the service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Test User';

if (!email || !password) {
  console.error('Usage: node scripts/create-user.js <email> <password> [full_name]');
  process.exit(1);
}

async function createUser() {
  try {
    // 1. Create the user in Supabase Auth
    const { data: userData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
    });

    if (authError) {
      throw authError;
    }

    console.log('User created in Auth:', userData.user);
    const userId = userData.user.id;

    // 2. Add the user to the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          full_name: fullName,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`
        }
      ]);

    if (profileError) {
      throw profileError;
    }

    console.log('Profile created for user');

    // 3. Assign this user to the first brand with admin role for testing
    const { data: brands, error: brandsError } = await supabase
      .from('brands')
      .select('id')
      .limit(1);

    if (brandsError) {
      throw brandsError;
    }

    if (brands.length > 0) {
      const { error: permissionError } = await supabase
        .from('user_brand_permissions')
        .insert([
          {
            user_id: userId,
            brand_id: brands[0].id,
            role: 'admin'
          }
        ]);

      if (permissionError) {
        throw permissionError;
      }

      console.log('User assigned as admin to the first brand');
    }

    console.log('User setup completed successfully!');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`User ID: ${userId}`);

  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

createUser(); 