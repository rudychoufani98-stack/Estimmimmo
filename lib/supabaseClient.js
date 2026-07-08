import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// null si non configure -> l'UI affiche un etat degrade au lieu de planter
export const supabase = url && key ? createClient(url, key) : null;
export const supabaseReady = !!(url && key);
