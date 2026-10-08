const supabaseUrl = () => String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = () => process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

export const isSupabaseConfigured = () => Boolean(supabaseUrl() && supabaseKey());

export async function fetchSchemesFromSupabase() {
  if (!isSupabaseConfigured()) return null;

  const response = await fetch(`${supabaseUrl()}/rest/v1/schemes?select=*&order=name.asc`, {
    headers: {
      apikey: supabaseKey(),
    },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase scheme catalog request failed (${response.status}): ${detail.slice(0, 240)}`);
  }

  return response.json();
}
