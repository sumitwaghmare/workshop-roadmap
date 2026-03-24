import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

async function run() {
  if (!databaseUrl) {
    console.error("DATABASE_URL not found");
    return;
  }

  const pool = mysql.createPool({
    uri: databaseUrl,
    waitForConnections: true,
  });

  try {
    const [rows] = await pool.execute("DESCRIBE Project");
    console.log("Current Project Columns:", rows.map(r => r.Field).join(", "));

    const columnsToAdd = [
      "icon VARCHAR(255) NULL",
      "priority VARCHAR(255) NULL",
      "bu VARCHAR(255) NULL",
      "owner VARCHAR(255) NULL",
      "timeline VARCHAR(255) NULL",
      "category VARCHAR(255) NULL",
      "createdBy VARCHAR(255) NULL",
      "createdAt DATETIME NULL",
      "pinnedHorizon INT NULL",
      "pinnedStatus VARCHAR(255) NULL",
      "spocCtg VARCHAR(255) NULL",
      "spocBu VARCHAR(255) NULL"
    ];

    for (const colDef of columnsToAdd) {
      const colName = colDef.split(" ")[0];
      const exists = rows.find(r => r.Field === colName);
      if (!exists) {
        console.log(`Adding column: ${colName}`);
        try {
          await pool.execute(`ALTER TABLE Project ADD COLUMN ${colDef}`);
          console.log(`Added column: ${colName}`);
        } catch (err) {
          console.error(`Failed to add ${colName}:`, err.message);
        }
      } else {
        console.log(`Column already exists: ${colName}`);
      }
    }
  } catch (error) {
    console.error("Database error:", error.message);
  } finally {
    await pool.end();
  }
}

run();
