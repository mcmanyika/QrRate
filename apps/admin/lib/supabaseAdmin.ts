import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE as string; // server only

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL not set');
if (!serviceRole) console.warn('SUPABASE_SERVICE_ROLE is not set (server actions will fail).');

export const supabaseAdmin = createClient(url, serviceRole, { auth: { persistSession: false } });


