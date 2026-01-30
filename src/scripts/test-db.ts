import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function testConnection() {
    console.log('--- Database Connectivity Test ---');
    console.log('URL:', supabaseUrl ? 'Defined' : 'MISSING');
    console.log('Key:', supabaseKey ? 'Defined (Service Role)' : 'MISSING');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: Environment variables are missing.');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase.from('profiles').select('count');

        if (error) {
            console.error('Connection Error:', error.message);
            if (error.message.includes('404')) {
                console.error('Tip: Make sure the Master Migration was executed in the SQL Editor.');
            }
        } else {
            console.log('SUCCESS: Connection established!');
            console.log('Tables detected: Profiles is accessible.');
        }
    } catch (err: any) {
        console.error('Unexpected Error:', err.message);
    }
}

testConnection();
