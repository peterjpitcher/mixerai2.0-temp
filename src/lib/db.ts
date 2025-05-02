import { Pool, QueryResult } from 'pg';

// Check if we should use direct PostgreSQL connection
const useDirectPostgres = process.env.USE_DIRECT_POSTGRES === 'true';

// Create a PostgreSQL connection pool only if direct connection is enabled
const pool = useDirectPostgres ? new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'mixerai',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
}) : null;

// Test the connection on startup only if direct connection is enabled
if (useDirectPostgres && pool) {
  pool.query('SELECT NOW()', (err: Error | null, res: QueryResult<any>) => {
    if (err) {
      console.error('Error connecting to PostgreSQL database:', err);
    } else {
      console.log('Successfully connected to PostgreSQL database at:', res.rows[0].now);
    }
  });
} else {
  console.log('Direct PostgreSQL connection is disabled. Using Supabase for database access.');
}

// Query function that returns a promise
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  if (!useDirectPostgres || !pool) {
    throw new Error('Direct PostgreSQL connection is disabled. Use Supabase client instead.');
  }

  try {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  }
}

// Get a PostgreSQL client from the pool
export async function getClient() {
  if (!useDirectPostgres || !pool) {
    throw new Error('Direct PostgreSQL connection is disabled. Use Supabase client instead.');
  }
  return await pool.connect();
}

export default {
  query,
  getClient
}; 