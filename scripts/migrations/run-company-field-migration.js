#!/usr/bin/env node

/**
 * This script runs the migration to add the company field to the profiles table
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  process.exit(1);
}

async function runMigration() {
  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Connected to Supabase...');
    
    // Read the migration file
    const migrationFilePath = path.join(__dirname, '..', 'migrations', 'add_company_field.sql');
    const migrationSql = fs.readFileSync(migrationFilePath, 'utf8');
    
    console.log('Running migration to add company field to profiles table...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('pgaudit_exec_sql', {
      sql_query: migrationSql
    });
    
    if (error) {
      throw error;
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  }
}

runMigration(); 