import mysql from "mysql2/promise";

// The connection pool is globally shared across the Next.js process
// Create pool only if DATABASE_URL is present
const databaseUrl = process.env.DATABASE_URL;

const pool = databaseUrl 
  ? mysql.createPool({
      uri: databaseUrl,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    })
  : null;

let _projectSchemaEnsured = false;

export async function ensureProjectFields() {
  if (_projectSchemaEnsured || !pool) return;

  // Safely attempt to add columns used for the extended roadmap item details.
  // These columns are optional and will be ignored if they already exist.
  try {
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS icon VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS priority VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS bu VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS owner VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS timeline VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS category VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS createdBy VARCHAR(255) NULL");
    await query("ALTER TABLE Project ADD COLUMN IF NOT EXISTS createdAt DATETIME NULL");
  } catch (error) {
    // Some MySQL versions may not support IF NOT EXISTS for columns.
    // Ignore failures so the app can still run if columns are managed externally.
    console.warn("Could not ensure project schema fields:", error);
  }

  _projectSchemaEnsured = true;
}

export async function query<T = unknown>(sql: string, params?: (string | number | boolean | Date | null)[]): Promise<T[]> {
  if (!pool) {
    console.error("Database connection pool not initialized. Is DATABASE_URL set?");
    throw new Error("Database connection error");
  }
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export default pool;
