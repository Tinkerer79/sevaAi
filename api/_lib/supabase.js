import { decryptPrivate, encryptPrivate } from './pii.js';

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

export async function fetchDemoComplaintFromSupabase(complaintId) {
  if (!isSupabaseConfigured()) return null;

  const response = await fetch(
    `${supabaseUrl()}/rest/v1/demo_complaints?select=*&complaint_id=eq.${encodeURIComponent(complaintId)}&limit=1`,
    { headers: { apikey: supabaseKey() } },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase demo complaint request failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  const [row] = await response.json();
  return row || null;
}

export async function fetchDemoComplaintsFromSupabase() {
  if (!isSupabaseConfigured()) return null;
  const response = await fetch(
    `${supabaseUrl()}/rest/v1/demo_complaints?select=*&order=created_at.desc`,
    { headers: { apikey: supabaseKey() } },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase demo complaint list failed (${response.status}): ${detail.slice(0, 200)}`);
  }
  return response.json();
}

export async function verifySupabaseAdmin(accessToken) {
  if (!isSupabaseConfigured() || !accessToken) return false;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseKey(), Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return false;
  const user = await response.json();
  return user?.app_metadata?.role === 'admin';
}

// Only expose useful, low-risk profile hints to the AI. Never return or send
// email, phone, provider IDs, avatars, roles, or the original access token.
export async function fetchSupabaseChatProfile(accessToken) {
  if (!isSupabaseConfigured() || !accessToken) return null;
  const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseKey(), Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const user = await response.json();
  const metadata = user?.user_metadata || {};
  const rawName = String(metadata.full_name || metadata.name || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  const firstName = rawName.split(/\s+/)[0]?.slice(0, 40) || '';
  const districts = new Set([
    'Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam',
    'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati',
    'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul',
  ]);
  const district = districts.has(metadata.district) ? metadata.district : '';
  if (!firstName && !district) return null;
  return { firstName, district };
}

async function rpc(name, params, accessToken = '') {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const headers = { apikey: supabaseKey(), 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${supabaseUrl()}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.details || `Supabase RPC ${name} failed (${response.status}).`);
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}

export const submitComplaintToSupabase = (fields) => rpc('submit_complaint', fields);
export const fetchComplaintTrackingFromSupabase = (complaintId) =>
  rpc('get_complaint_tracking', { p_complaint_id: complaintId });
export const fetchAdminComplaintsFromSupabase = (accessToken) =>
  rpc('admin_list_complaints', {}, accessToken);
export const rpcAdminComplaintDetail = (accessToken, complaintId) =>
  rpc('admin_complaint_detail', { p_complaint_id: complaintId }, accessToken);
export const rpcAdminUpdateComplaint = (accessToken, complaintId, fields) =>
  rpc('admin_update_complaint', {
    p_complaint_id: complaintId,
    p_status: fields.status || null,
    p_priority: fields.priority || null,
    p_dept_name: fields.dept_name || null,
    p_note: fields.note || null,
  }, accessToken);

export async function listAiConversations(accessToken) {
  const data = await rpc('ai_list_conversations', {}, accessToken);
  return {
    conversations: (data?.conversations || []).map(({ title_encrypted, ...item }) => ({
      ...item,
      title: decryptPrivate(title_encrypted, 'chat:title'),
    })),
  };
}

export async function getAiConversation(accessToken, conversationId) {
  const data = await rpc('ai_get_conversation', { p_conversation_id: conversationId }, accessToken);
  if (!data) return null;
  return {
    conversation: {
      ...data.conversation,
      title: decryptPrivate(data.conversation.title_encrypted, 'chat:title'),
    },
    messages: (data.messages || []).map(({ content_encrypted, ...item }) => ({
      ...item,
      content: decryptPrivate(content_encrypted, `chat:${item.role}`),
    })),
  };
}

export const saveAiChatTurn = (accessToken, conversationId, userMessage, assistantMessage) =>
  rpc('ai_save_chat_turn', {
    p_conversation_id: conversationId || null,
    p_title_encrypted: encryptPrivate(userMessage.slice(0, 120), 'chat:title'),
    p_user_encrypted: encryptPrivate(userMessage, 'chat:user'),
    p_assistant_encrypted: encryptPrivate(assistantMessage, 'chat:model'),
  }, accessToken);
export const deleteAiConversation = (accessToken, conversationId) =>
  rpc('ai_delete_conversation', { p_conversation_id: conversationId }, accessToken);
