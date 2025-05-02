#!/usr/bin/env node

const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

// Get command line arguments
const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Test User';

if (!email || !password) {
  console.error('Usage: node scripts/create-local-user.js <email> <password> [full_name]');
  process.exit(1);
}

// Create a PostgreSQL client
const client = new Client({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mixerai'
});

// Function to create a user in the database
async function createLocalUser() {
  try {
    await client.connect();

    // Generate a UUID for the user
    const userId = uuidv4();

    // Insert into profiles table
    await client.query(`
      INSERT INTO profiles (id, full_name, avatar_url)
      VALUES ($1, $2, $3)
    `, [userId, fullName, `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`]);

    console.log(`User profile created with ID: ${userId}`);

    // Get the first brand to assign to this user
    const brandsResult = await client.query(`
      SELECT id FROM brands LIMIT 1
    `);

    if (brandsResult.rows.length > 0) {
      const brandId = brandsResult.rows[0].id;

      // Assign the user to the brand with admin role
      await client.query(`
        INSERT INTO user_brand_permissions (user_id, brand_id, role)
        VALUES ($1, $2, $3)
      `, [userId, brandId, 'admin']);

      console.log(`User assigned as admin to brand: ${brandId}`);
    }

    console.log('========================================');
    console.log('Local user created successfully!');
    console.log(`Email: ${email}`);
    console.log(`Full Name: ${fullName}`);
    console.log(`User ID: ${userId}`);
    console.log('========================================');
    console.log('NOTE: This is a local database user only.');
    console.log('For a real Supabase authentication user,');
    console.log('use the create-user.js script instead.');
    console.log('========================================');

  } catch (error) {
    console.error('Error creating local user:', error);
  } finally {
    await client.end();
  }
}

createLocalUser(); 