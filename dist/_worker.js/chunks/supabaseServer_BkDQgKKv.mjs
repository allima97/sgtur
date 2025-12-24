globalThis.process ??= {}; globalThis.process.env ??= {};
import { c as createClient } from './wrapper_6q0T_V9b.mjs';

const supabaseUrl = process.env.SUPABASE_URL || "https://ggqmvruerbaqxthhnxrm.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdncW12cnVlcmJhcXh0aGhueHJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDc2MzQ3OCwiZXhwIjoyMDgwMzM5NDc4fQ.2MwbrYwtD-HeeoCw4g5PBadXLpo0gY8eoRjLxQglOQQ";
const supabaseServer = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      persistSession: false
    }
  }
);

export { supabaseServer as s };
