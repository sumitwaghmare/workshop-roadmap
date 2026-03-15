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

export async function query<T = unknown>(sql: string, params?: (string | number | boolean | Date | null)[]): Promise<T[]> {
  if (!pool) {
    console.error("Database connection pool not initialized. Is DATABASE_URL set?");
    throw new Error("Database connection error");
  }
  const [rows] = await pool.execute(sql, params);
  return rows as T[];
}

export default pool;
