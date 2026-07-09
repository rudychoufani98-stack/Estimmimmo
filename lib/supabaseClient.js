import { createClient } from "@supabase/supabase-js";

// URL + cle anon PUBLIQUES (concues pour vivre cote navigateur, protegees par RLS).
// Mises en dur comme filet de securite : l'auth ne peut plus jamais tomber en panne
// a cause d'un probleme de variable d'environnement ou de cache de build.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pjkxspeclcgtxhpitfyw.supabase.co";
const key =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqa3hzcGVjbGNndHhocGl0Znl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0MDkzMzksImV4cCI6MjA5ODk4NTMzOX0.V5_1LdK_EbJwpR8gWQCkSmFUgGGEaLMNkarbklarJXY";

export const supabase = createClient(url, key);
export const supabaseReady = true;
