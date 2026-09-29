const BASE_PATH = window.location.hostname === '127.0.0.1' 
    ? '' 
    : '/pokemon-shinydb';
    
const SUPABASE_URL     = 'https://ulodbnhhwhuwzzhqaoio.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_aDErnNbA8kzvSRxSP1KLuQ_UZZSWjQz';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
