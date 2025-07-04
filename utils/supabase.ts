import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../database.types';

// The Supabase URL and public anonymous key must be hardcoded for client-side browser applications.
// Environment variables (process.env) are not accessible in the browser.
// The public 'anon' key is designed to be safely exposed in client-side code when
// you have appropriate Row Level Security (RLS) policies enabled on your tables.
const supabaseUrl = 'https://fqsosfhljszbxmztksne.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxc29zZmhsanN6YnhtenRrc25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2Mjg4NTYsImV4cCI6MjA2NzIwNDg1Nn0.p4Z_qvFbnmG1B8T6Rrt5ZC6kD0YLM2bXGYedurUhW_k';

if (!supabaseUrl || !supabaseAnonKey) {
  // This is a safety check. If the values above are ever removed or are invalid, this will throw a clear error.
  // If your application logs an error about "environment variables" it means an incorrect version of this file is being run.
  throw new Error("CRITICAL: Supabase URL or Anonymous Key is not configured correctly in utils/supabase.ts.");
}

// Initialize the Supabase client.
// This single client instance is then imported and used throughout the application.
export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey);