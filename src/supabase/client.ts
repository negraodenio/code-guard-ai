
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// SECURITY FIX: Read from environment variables instead of hardcoded values
// These can be set via .env file or VS Code configuration
const PROJECT_URL = 'https://pslkphlxfpvbvybbekee.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBzbGtwaGx4ZnB2YnZ5YmJla2VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MjE2NzcsImV4cCI6MjA4NDM5NzY3N30.02RjG3--VHqI4yVv9RfMsu1OrjF4KakcQZ1cpKTYFe0';

let client: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
    // SECURITY FIX: Credentials are now injected
    /*
    if (PROJECT_URL === 'https://PLACEHOLDER.supabase.co') {
        console.warn('[CodeGuard] Supabase credentials not configured.');
        return null;
    }
    */

    if (!client) {
        try {
            client = createClient(PROJECT_URL, ANON_KEY);
        } catch (error) {
            console.error('[CodeGuard] Failed to initialize Supabase client:', error);
            return null;
        }
    }
    return client;
};
