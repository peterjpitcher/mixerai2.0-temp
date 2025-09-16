#!/usr/bin/env node

// Simple script to check if claims junction tables exist
const { createClient } = require('@supabase/supabase-js')

async function checkClaimsMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing')

  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('Missing Supabase environment variables')
    return false
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Check if junction tables exist
    const tables = ['claim_products', 'claim_countries', 'claim_ingredients']
    const results = {}
    
    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('id').limit(1)
        results[table] = error ? 'missing' : 'exists'
      } catch (err) {
        results[table] = 'missing'
      }
    }
    
    console.log('Claims migration status:')
    console.log(results)
    
    const allExist = Object.values(results).every(status => status === 'exists')
    console.log(`Migration needed: ${!allExist}`)
    
    return allExist
  } catch (error) {
    console.error('Error checking migration:', error.message)
    return false
  }
}

checkClaimsMigration()