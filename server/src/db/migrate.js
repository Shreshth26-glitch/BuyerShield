import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations(direction = 'up') {
  const client = await pool.connect();
  try {
    console.log(`\n========================================`);
    console.log(`BuyerShield Database Migration: [${direction.toUpperCase()}]`);
    console.log(`========================================`);

    const fileName = direction === 'down' ? '001_initial_schema_down.sql' : '001_initial_schema.sql';
    const filePath = path.join(__dirname, 'migrations', fileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${filePath}`);
    }

    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`Executing ${fileName}...`);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`✓ Migration [${direction.toUpperCase()}] applied successfully.\n`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`✗ Migration failed:`, err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

const direction = process.argv[2] || 'up';
runMigrations(direction);
