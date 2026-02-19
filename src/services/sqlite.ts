import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export type SQLResult<T = any> = T & { insertId?: number };

export interface User {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  created_at: number;
}

export interface AuthSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDB() {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('saferoute.db');
  return _db;
}

async function exec(sql: string, params: any[] = []) {
  const db = await getDB();
  return await db.runAsync(sql, params);
}

export async function initDB() {
  console.log("💾 SQLite: Initializing Database...");
  try {
    const db = await getDB();

    // 1. Users table
    await exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      password_hash TEXT NOT NULL,
      created_at INTEGER
    );`);

    // 2. Auth Sessions
    await exec(`CREATE TABLE IF NOT EXISTS auth_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );`);

    // 3. Profiles (Updated Schema)
    await exec(`CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY,
      full_name TEXT,
      dark_mode INTEGER DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER,
      medical_condition TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      is_onboarding_complete INTEGER DEFAULT 0
    );`);

    // 4. Emergency Contacts (Updated Schema)
    await exec(`CREATE TABLE IF NOT EXISTS emergency_contacts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      phone TEXT,
      relation TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at INTEGER,
      avatar_uri TEXT,
      relationship_label TEXT,
      is_active_simulated INTEGER DEFAULT 0
    );`);

    // 5. Saved Addresses
    await exec(`CREATE TABLE IF NOT EXISTS saved_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      label TEXT,
      address_text TEXT,
      latitude REAL,
      longitude REAL,
      created_at INTEGER
    );`);

    // 6. Alert History
    await exec(`CREATE TABLE IF NOT EXISTS alert_history (
      id TEXT PRIMARY KEY,
      type TEXT, 
      timestamp INTEGER,
      location_snapshot TEXT,
      is_synced INTEGER DEFAULT 0
    );`);

    // 7. App Settings
    await exec(`CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );`);

    // 8. Audio Logs (Updated Schema)
    await exec(`CREATE TABLE IF NOT EXISTS audio_logs (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      timestamp INTEGER,
      duration TEXT,
      uploaded INTEGER DEFAULT 0
    );`);

    // --- BRUTE FORCE MIGRATIONS (For existing installs) ---
    // If the tables already existed with old schema, these ensure columns are added.
    // We catch errors (like "duplicate column") silently.

    const runMigration = async (sql: string) => {
      try {
        await exec(sql);
        console.log(`✨ Migration success: ${sql}`);
      } catch (e: any) {
        // Ignore "duplicate column" error
        if (!e.message?.includes('duplicate column')) {
          console.log(`⚠️ Migration note: ${e.message}`);
        }
      }
    }

    await runMigration(`ALTER TABLE audio_logs ADD COLUMN uploaded INTEGER DEFAULT 0;`);
    await runMigration(`ALTER TABLE emergency_contacts ADD COLUMN avatar_uri TEXT;`);
    await runMigration(`ALTER TABLE emergency_contacts ADD COLUMN relationship_label TEXT;`);
    await runMigration(`ALTER TABLE emergency_contacts ADD COLUMN is_active_simulated INTEGER DEFAULT 0;`);
    await runMigration(`ALTER TABLE profiles ADD COLUMN is_onboarding_complete INTEGER DEFAULT 0;`);
    await runMigration(`ALTER TABLE profiles ADD COLUMN medical_condition TEXT;`);
    await runMigration(`ALTER TABLE profiles ADD COLUMN guardian_name TEXT;`);
    await runMigration(`ALTER TABLE profiles ADD COLUMN guardian_phone TEXT;`);

    // Insert defaults
    await exec(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ghost_mode', 'false');`);

    console.log("✅ SQLite: Initialization Complete");
    await verifySchema();
  } catch (error) {
    console.error("❌ SQLite: Critical Init Failure:", error);
  }
}

/**
 * Helper to verify schema changes by logging table info to console.
 * Call this manually or from initDB during development.
 */
export async function verifySchema() {
  if (__DEV__) console.log('--- Verifying Database Schema ---');
  try {
    const tables = ['emergency_contacts', 'alert_history', 'app_settings', 'audio_logs'];
    for (const table of tables) {
      const info = await query(`PRAGMA table_info(${table})`);
      console.log(`Table: ${table} `);
      console.log(info.map((col: any) => ` - ${col.name} (${col.type})`).join('\n'));
    }
  } catch (error) {
    console.error('Error verifying schema:', error);
  }
  if (__DEV__) console.log('--- Schema Verification Complete ---');
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDB();
  const result = await db.getAllAsync<T>(sql, params);
  return result || [];
}

export async function run(sql: string, params: any[] = []) {
  const db = await getDB();
  await db.runAsync(sql, params);
}

// Authentication functions
export async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + 'SafeRoute_Salt_2024' // Add a salt for security
  );
}

export async function generateToken(): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Math.random().toString() + Date.now().toString()
  );
}

export async function createUser(email: string, password: string, fullName: string): Promise<User> {

  const id = Crypto.randomUUID();

  const passwordHash = await hashPassword(password);

  const createdAt = Date.now();



  const db = await getDB();

  await db.runAsync(

    'INSERT INTO users (id, email, full_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',

    [id, email.toLowerCase(), fullName, passwordHash, createdAt]

  );



  return {

    id,

    email: email.toLowerCase(),

    full_name: fullName,

    password_hash: passwordHash,

    created_at: createdAt

  };

}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const passwordHash = await hashPassword(password);
  const users = await query<User>(
    'SELECT * FROM users WHERE email = ? AND password_hash = ?',
    [email.toLowerCase(), passwordHash]
  );

  return users.length > 0 ? users[0] : null;
}

export async function createSession(userId: string): Promise<string> {
  const sessionId = await generateToken();
  const token = await generateToken();
  const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days
  const createdAt = Date.now();

  const db = await getDB();
  await db.runAsync(
    'INSERT INTO auth_sessions (id, user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)',
    [sessionId, userId, token, expiresAt, createdAt]
  );

  return token;
}

export async function validateSession(token: string): Promise<User | null> {
  const now = Date.now();
  const sessions = await query<AuthSession & User & { user_created_at: number }>(
    `SELECT s.*, u.id, u.email, u.full_name, u.created_at as user_created_at 
     FROM auth_sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.token = ? AND s.expires_at > ? `,
    [token, now]
  );

  if (sessions.length === 0) return null;

  const session = sessions[0];
  return {
    id: session.user_id, // Use the user_id from the session, not the session's own id
    email: session.email,
    full_name: session.full_name,
    password_hash: '', // Don't return password hash
    created_at: session.user_created_at
  };
}

export async function invalidateSession(token: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM auth_sessions WHERE token = ?', [token]);
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await query<User>('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  return users.length > 0 ? users[0] : null;
}

export async function addEmergencyContact(contact: { id: string, name: string, phone: string, userId: string }) {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO emergency_contacts(id, user_id, name, phone, created_at) VALUES(?, ?, ?, ?, ?)`,
    [contact.id, contact.userId, contact.name, contact.phone, Date.now()]
  );
}

export async function getEmergencyContacts(userId: string): Promise<{ name: string, phone: string }[]> {
  const contacts = await query<{ name: string, phone: string }>(
    'SELECT name, phone FROM emergency_contacts WHERE user_id = ?',
    [userId]
  );
  return contacts;
}


export async function saveAudioLog(log: { id: string, uri: string, timestamp: number, duration: string, uploaded?: number }) {
  try {
    const db = await getDB();
    console.log(`💾 SQLite: Saving audio log ${log.id}...`);
    await db.runAsync(
      'INSERT INTO audio_logs (id, uri, timestamp, duration, uploaded) VALUES (?, ?, ?, ?, ?);',
      [log.id, log.uri, log.timestamp, log.duration, log.uploaded ?? 0]
    );
    console.log(`✅ SQLite: Audio log saved successfully.`);
  } catch (error) {
    console.error('❌ SQLite: Check audio logs error', error);
  }
}

export async function getAudioLogs(): Promise<{ id: string, uri: string, timestamp: number, duration: string, uploaded: number }[]> {
  try {
    const db = await getDB();
    console.log("📂 SQLite: Fetching audio logs...");
    const result = await db.getAllAsync<{ id: string, uri: string, timestamp: number, duration: string, uploaded: number }>('SELECT * FROM audio_logs ORDER BY timestamp DESC;');
    console.log(`📂 SQLite: Found ${result.length} logs.`);
    return result;
  } catch (error) {
    console.error('❌ SQLite: Get audio logs error', error);
    return [];
  }
}

export async function markAudioUploaded(id: string) {
  const db = await getDB();
  await db.runAsync('UPDATE audio_logs SET uploaded = 1 WHERE id = ?', [id]);
}

export async function deleteAudioLog(id: string) {
  const db = await getDB();
  await db.runAsync('DELETE FROM audio_logs WHERE id = ?', [id]);
}

// App Settings helpers (key-value store)
export async function saveSetting(key: string, value: string): Promise<void> {
  await run('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function getSetting(key: string): Promise<string | null> {
  const rows = await query<{ key: string; value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return rows.length > 0 ? rows[0].value : null;
}

