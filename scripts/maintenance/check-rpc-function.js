#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkRPCFunction() {
  try {
    console.log('Checking if update_brand_with_agencies RPC function exists...\n');

    // Query to check if the function exists
    const { data, error } = await supabase
      .rpc('pg_catalog.pg_proc')
      .select('proname')
      .eq('proname', 'update_brand_with_agencies');

    if (error) {
      // Try a simpler approach - just call the function with dummy data
      console.log('Could not query pg_proc, trying to call function directly...\n');
      
      const { data: rpcData, error: rpcError } = await supabase.rpc('update_brand_with_agencies', {
        p_brand_id_to_update: '00000000-0000-0000-0000-000000000000',
        p_name: 'Test',
        p_website_url: '',
        p_additional_website_urls: [],
        p_country: 'US',
        p_language: 'en',
        p_brand_identity: '',
        p_tone_of_voice: '',
        p_guardrails: '',
        p_brand_color: '#000000',
        p_master_claim_brand_id: null,
        p_selected_agency_ids: [],
        p_new_custom_agency_names: [],
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_logo_url: null
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        console.error('\nError details:', JSON.stringify(rpcError, null, 2));
        
        // Check if it's a "function does not exist" error
        if (rpcError.message && rpcError.message.includes('function') && rpcError.message.includes('does not exist')) {
          console.error('\n❌ The update_brand_with_agencies function does not exist or has incorrect parameters.');
          console.error('\nPlease run the migrations to create/update the function:');
          console.error('./scripts/run-migrations.sh');
        }
      } else {
        console.log('✅ Function exists and can be called (though it may have returned an error due to invalid data)');
      }
    } else {
      console.log('✅ Function exists in database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRPCFunction();