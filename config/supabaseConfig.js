const { createClient } = require('@supabase/supabase-js');

let supabaseClient;

async function initSupabase() {
    const supabaseUrl = process.env.SUPABASE_PROJECT_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Use service key for server-side operations

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_PROJECT_URL and SUPABASE_SERVICE_KEY are required');
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase connected');
    return supabaseClient;
}

function getSupabaseClient() {
    if (!supabaseClient) {
        throw new Error('Supabase not initialized. Call initSupabase() first.');
    }
    return supabaseClient;
}

module.exports = {
    initSupabase,
    getSupabaseClient
};
