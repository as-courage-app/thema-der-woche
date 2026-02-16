import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXTPUBLICSUPABASEURL ||
  '';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXTPUBLICSUPABASEANONKEY ||
  '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
