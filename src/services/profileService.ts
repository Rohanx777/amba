// SQLite-backed profile service
import { query, run } from './sqlite';

export type Profile = {
  id: string; // auth user id
  full_name?: string;
  avatar_url?: string;
  dark_mode?: boolean;
  medical_condition?: string;
  guardian_name?: string;
  guardian_phone?: string;
  is_onboarding_complete?: boolean;
  created_at?: number;
  updated_at?: number;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await query<Profile>('SELECT * FROM profiles WHERE user_id = ? LIMIT 1', [userId]);
  // SQLite stores boolean as 0/1, need to cast for safety if needed, but JS treats 1 as truthy
  return rows[0] || null;
}

export async function upsertProfile(userId: string, patch: Partial<Profile>) {
  const now = Date.now();
  const existing = await getProfile(userId);
  if (existing) {
    await run(
      `UPDATE profiles SET 
       full_name = COALESCE(?, full_name), 
       dark_mode = COALESCE(?, dark_mode), 
       medical_condition = COALESCE(?, medical_condition),
       guardian_name = COALESCE(?, guardian_name),
       guardian_phone = COALESCE(?, guardian_phone),
       is_onboarding_complete = COALESCE(?, is_onboarding_complete),
       updated_at = ? 
       WHERE user_id = ?`,
      [
        patch.full_name,
        patch.dark_mode ? 1 : 0,
        patch.medical_condition,
        patch.guardian_name,
        patch.guardian_phone,
        patch.is_onboarding_complete ? 1 : 0,
        now,
        userId
      ]
    );
  } else {
    await run(
      `INSERT INTO profiles (user_id, full_name, dark_mode, medical_condition, guardian_name, guardian_phone, is_onboarding_complete, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        patch.full_name || null,
        patch.dark_mode ? 1 : 0,
        patch.medical_condition || null,
        patch.guardian_name || null,
        patch.guardian_phone || null,
        patch.is_onboarding_complete ? 1 : 0,
        now,
        now
      ]
    );
  }
  return (await getProfile(userId)) as Profile;
}
