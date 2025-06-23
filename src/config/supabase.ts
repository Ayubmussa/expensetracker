import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://azspcwkyrbhinewreupu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6c3Bjd2t5cmJoaW5ld3JldXB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAyNjA4ODcsImV4cCI6MjA2NTgzNjg4N30.kHokIgdTTJ8rM852ldQ5ISVURSlPQYfyD2OVBOfSY_o';

// Debug: Log Supabase configuration
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key length:', supabaseAnonKey?.length || 0);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  EXPENSES: 'expenses',
  CATEGORIES: 'categories',
} as const;
