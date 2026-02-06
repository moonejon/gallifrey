/**
 * Supabase Configuration for Gallifrey Social Feed POC
 *
 * This file sets up the Supabase client with proper TypeScript types
 * and React Native compatibility.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase configuration
 * Environment variables are prefixed with EXPO_PUBLIC_ to be accessible in the app
 */
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.\n' +
      'Required: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase client instance
 *
 * Configured with:
 * - AsyncStorage for session persistence
 * - Auto-refresh for token management
 * - Proper URL polyfill for React Native
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Not needed for mobile
  },
});

/**
 * Helper to check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey);
}

/**
 * Get the Supabase URL (for debugging)
 */
export function getSupabaseUrl(): string {
  return supabaseUrl || '';
}

/**
 * Type-safe Supabase client
 * Once you run `npm run supabase:types`, you can import Database type:
 *
 * import type { Database } from '@/types/supabase';
 * export const supabase = createClient<Database>(...);
 */
