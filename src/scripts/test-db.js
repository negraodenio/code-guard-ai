const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

async function testConnection() {
    console.log('--- Database Connectivity Test (JS) ---');

    if (!supabaseUrl || !supabaseKey) {
        console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY missing in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { data, error } = await supabase.from('profiles').select('*').limit(1);

        if (error) {
            console.error('❌ Connection Error:', error.message);
        } else {
            console.log('✅ SUCCESS: Connection established!');
            console.log('✅ Tables detected: Profiles is accessible.');
        }
    } catch (err) {
        console.error('❌ Unexpected Error:', err.message);
    }
}

testConnection();
