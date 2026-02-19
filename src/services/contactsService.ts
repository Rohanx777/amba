// Contacts service — Supabase-first with SQLite offline cache
import { query, run } from './sqlite';
import { supabase } from './supabaseClient';

export type EmergencyContact = {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  relation?: string;
  is_primary?: number;
  avatar_uri?: string;    // local URI
  avatar_url?: string;    // Supabase column
  is_active_simulated?: number;
  created_at?: number | string;
};

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('91')) return `+${digits}`;
  if (digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.startsWith('+')) return `+${digits.replace(/^\+/, '')}`;
  return `+91${digits}`;
}

// ─── FETCH ────────────────────────────────────────────
// ─── FETCH ────────────────────────────────────────────
export async function fetchContacts(userId: string): Promise<EmergencyContact[]> {
  try {
    // 1. Try Supabase
    const { data: supaData, error: supaError } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!supaError && supaData && supaData.length > 0) {
      console.log(`[ContactsService] Fetched ${supaData.length} from Supabase.`);

      // Sync cloud data to local SQLite cache
      // We do this asynchronously so we don't block return
      (async () => {
        for (const c of supaData) {
          await run(
            'INSERT OR REPLACE INTO emergency_contacts (id, user_id, name, phone, relation, is_primary, avatar_uri, is_active_simulated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [c.id, c.user_id, c.name, c.phone, c.relation, c.is_primary ? 1 : 0, c.avatar_url || null, 0, Date.now()]
          );
        }
      })();

      // Map Supabase fields to app type
      return supaData.map((c: any) => ({
        ...c,
        avatar_uri: c.avatar_url,         // map cloud field to local field name
        is_primary: c.is_primary ? 1 : 0,
        is_active_simulated: 0,
      })) as EmergencyContact[];
    } else {
      console.log('[ContactsService] Supabase returned empty/error, checking SQLite fallback...');
    }
  } catch (e) {
    console.log('[ContactsService] Supabase contacts fetch failed, using local:', e);
  }

  // 2. Offline / Empty Cloud Fallback
  // If Supabase was empty or failed, we MUST check SQLite.
  try {
    const localData = await query<EmergencyContact>(
      'SELECT id, user_id, name, phone, relation, is_primary, avatar_uri, is_active_simulated, created_at FROM emergency_contacts WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    console.log(`[ContactsService] Fetched ${localData.length} from SQLite.`);
    return localData;
  } catch (err) {
    console.error('[ContactsService] SQLite fetch failed:', err);
    return [];
  }
}

// ─── ADD ──────────────────────────────────────────────
export async function addContact(userId: string, payload: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at'>) {
  const id = Math.random().toString(36).slice(2);
  const now = new Date().toISOString();
  const normalizedPhone = normalizePhone(payload.phone);

  try {
    // Write to Supabase first
    const { data, error } = await supabase
      .from('emergency_contacts')
      .upsert({
        id,
        user_id: userId,
        name: payload.name,
        phone: normalizedPhone,
        relation: payload.relation || null,
        is_primary: payload.is_primary ? true : false,
        avatar_url: payload.avatar_uri || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Cache locally
    await run(
      'INSERT OR REPLACE INTO emergency_contacts (id, user_id, name, phone, relation, is_primary, avatar_uri, is_active_simulated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, userId, payload.name, normalizedPhone, payload.relation || null, payload.is_primary ? 1 : 0, payload.avatar_uri || null, payload.is_active_simulated || 0, Date.now()]
    );

    return { id, user_id: userId, created_at: Date.now(), ...payload, phone: normalizedPhone } as EmergencyContact;
  } catch (e) {
    console.log('Supabase contact add failed, saving locally:', e);
  }

  // Offline fallback
  const created_at = Date.now();
  await run(
    'INSERT INTO emergency_contacts (id, user_id, name, phone, relation, is_primary, avatar_uri, is_active_simulated, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, userId, payload.name, normalizedPhone, payload.relation || null, payload.is_primary ? 1 : 0, payload.avatar_uri || null, payload.is_active_simulated || 0, created_at]
  );
  return { id, user_id: userId, created_at, ...payload, phone: normalizedPhone } as EmergencyContact;
}

// ─── UPDATE ───────────────────────────────────────────
export async function updateContact(id: string, payload: Partial<Omit<EmergencyContact, 'id' | 'user_id'>>, userId?: string) {
  if (!userId) return { id, ...(payload as any) } as EmergencyContact;

  // Build Supabase update payload
  const supaPatch: any = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) supaPatch.name = payload.name;
  if (payload.phone !== undefined) supaPatch.phone = normalizePhone(payload.phone);
  if (payload.relation !== undefined) supaPatch.relation = payload.relation;
  if (payload.is_primary !== undefined) supaPatch.is_primary = !!payload.is_primary;
  if (payload.avatar_uri !== undefined) supaPatch.avatar_url = payload.avatar_uri;

  try {
    await supabase.from('emergency_contacts').update(supaPatch).eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.log('Supabase contact update failed:', e);
  }

  // Build SQLite update
  const fields: string[] = [];
  const values: any[] = [];
  if (payload.name !== undefined) { fields.push('name = ?'); values.push(payload.name); }
  if (payload.phone !== undefined) { fields.push('phone = ?'); values.push(normalizePhone(payload.phone)); }
  if (payload.relation !== undefined) { fields.push('relation = ?'); values.push(payload.relation); }
  if (payload.is_primary !== undefined) { fields.push('is_primary = ?'); values.push(payload.is_primary); }
  if (payload.avatar_uri !== undefined) { fields.push('avatar_uri = ?'); values.push(payload.avatar_uri); }
  if (payload.is_active_simulated !== undefined) { fields.push('is_active_simulated = ?'); values.push(payload.is_active_simulated); }

  if (fields.length === 0) {
    const rows = await query<EmergencyContact>('SELECT * FROM emergency_contacts WHERE id = ?', [id]);
    return rows[0];
  }

  values.push(id, userId);
  await run(`UPDATE emergency_contacts SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`, values);
  const rows = await query<EmergencyContact>('SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?', [id, userId]);
  return rows[0] as EmergencyContact;
}

// ─── DELETE ───────────────────────────────────────────
export async function deleteContact(id: string, userId?: string) {
  if (!userId) return;

  try {
    await supabase.from('emergency_contacts').delete().eq('id', id).eq('user_id', userId);
  } catch (e) {
    console.log('Supabase contact delete failed:', e);
  }

  await run('DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?', [id, userId]);
}
