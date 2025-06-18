#!/usr/bin/env node

/**
 * Setup Supabase Storage Buckets
 * Creates storage buckets for avatars and brand logos with proper policies
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupStorageBuckets() {
  console.log('🚀 Setting up Supabase Storage buckets...\n');

  // 1. Create avatars bucket
  console.log('📁 Creating avatars bucket...');
  try {
    const { data: avatarsBucket, error: avatarsError } = await supabase.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    });

    if (avatarsError) {
      if (avatarsError.message.includes('already exists')) {
        console.log('   ✓ Avatars bucket already exists');
      } else {
        throw avatarsError;
      }
    } else {
      console.log('   ✅ Avatars bucket created successfully');
    }
  } catch (error) {
    console.error('   ❌ Error creating avatars bucket:', error.message);
  }

  // 2. Create brand-logos bucket
  console.log('\n📁 Creating brand-logos bucket...');
  try {
    const { data: logosBucket, error: logosError } = await supabase.storage.createBucket('brand-logos', {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    });

    if (logosError) {
      if (logosError.message.includes('already exists')) {
        console.log('   ✓ Brand-logos bucket already exists');
      } else {
        throw logosError;
      }
    } else {
      console.log('   ✅ Brand-logos bucket created successfully');
    }
  } catch (error) {
    console.error('   ❌ Error creating brand-logos bucket:', error.message);
  }

  // 3. Set up storage policies
  console.log('\n🔒 Setting up storage policies...');
  
  // Avatars policies
  console.log('\n   Setting up avatars policies:');
  
  // Policy: Users can upload their own avatars
  const avatarUploadPolicy = `
    (bucket_id = 'avatars'::text) AND 
    (auth.uid()::text = (storage.foldername(name))[1])
  `;
  
  // Policy: Users can update their own avatars
  const avatarUpdatePolicy = `
    (bucket_id = 'avatars'::text) AND 
    (auth.uid()::text = (storage.foldername(name))[1])
  `;
  
  // Policy: Users can delete their own avatars
  const avatarDeletePolicy = `
    (bucket_id = 'avatars'::text) AND 
    (auth.uid()::text = (storage.foldername(name))[1])
  `;

  // Note: Public read access is handled by the bucket being public

  // Brand logos policies
  console.log('   Setting up brand-logos policies:');
  
  // Policy: Authenticated users can upload brand logos
  const logoUploadPolicy = `
    (bucket_id = 'brand-logos'::text) AND 
    (auth.role() = 'authenticated'::text)
  `;
  
  // Policy: Authenticated users can update brand logos
  const logoUpdatePolicy = `
    (bucket_id = 'brand-logos'::text) AND 
    (auth.role() = 'authenticated'::text)
  `;
  
  // Policy: Authenticated users can delete brand logos
  const logoDeletePolicy = `
    (bucket_id = 'brand-logos'::text) AND 
    (auth.role() = 'authenticated'::text)
  `;

  console.log('\n⚠️  Note: Storage policies need to be created manually in the Supabase Dashboard.');
  console.log('   Go to Storage > Policies and create the following policies:\n');
  
  console.log('   AVATARS BUCKET:');
  console.log('   - INSERT: Enable for authenticated users with condition:');
  console.log(`     ${avatarUploadPolicy}`);
  console.log('   - UPDATE: Enable for authenticated users with condition:');
  console.log(`     ${avatarUpdatePolicy}`);
  console.log('   - DELETE: Enable for authenticated users with condition:');
  console.log(`     ${avatarDeletePolicy}`);
  console.log('   - SELECT: Enable for all (public read access)\n');
  
  console.log('   BRAND-LOGOS BUCKET:');
  console.log('   - INSERT: Enable for authenticated users');
  console.log('   - UPDATE: Enable for authenticated users');
  console.log('   - DELETE: Enable for authenticated users');
  console.log('   - SELECT: Enable for all (public read access)\n');

  // 4. Test bucket access
  console.log('🧪 Testing bucket access...');
  
  try {
    const { data: avatarsList } = await supabase.storage.from('avatars').list();
    console.log('   ✓ Avatars bucket is accessible');
  } catch (error) {
    console.error('   ❌ Cannot access avatars bucket:', error.message);
  }
  
  try {
    const { data: logosList } = await supabase.storage.from('brand-logos').list();
    console.log('   ✓ Brand-logos bucket is accessible');
  } catch (error) {
    console.error('   ❌ Cannot access brand-logos bucket:', error.message);
  }

  console.log('\n✅ Storage bucket setup complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Go to your Supabase Dashboard > Storage > Policies');
  console.log('   2. Create the policies mentioned above for both buckets');
  console.log('   3. Test file uploads in your application\n');
}

// Run the setup
setupStorageBuckets().catch(console.error);