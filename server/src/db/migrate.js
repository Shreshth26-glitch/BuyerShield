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

    // Ensure schema_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Check if initial schema was already applied previously without migration tracking
    const usersTableCheck = await client.query(`
      SELECT 1 FROM information_schema.tables WHERE table_name = 'users';
    `);
    if (usersTableCheck.rows.length > 0) {
      await client.query(`
        INSERT INTO schema_migrations (version) VALUES ('001_initial_schema.sql') ON CONFLICT DO NOTHING;
      `);
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir);

    const appliedRes = await client.query('SELECT version FROM schema_migrations');
    const appliedSet = new Set(appliedRes.rows.map((r) => r.version));

    if (direction === 'up') {
      const pendingFiles = files
        .filter((f) => f.endsWith('.sql') && !f.endsWith('_down.sql') && !appliedSet.has(f))
        .sort();

      if (pendingFiles.length === 0) {
        console.log(`Database is up to date. No pending migrations.\n`);
        return;
      }

      console.log(`Applying ${pendingFiles.length} pending migration(s):`);
      for (const fileName of pendingFiles) {
        const filePath = path.join(migrationsDir, fileName);
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`\nApplying: ${fileName}...`);
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [fileName]);
        await client.query('COMMIT');
        console.log(`✓ Applied ${fileName}`);
      }
      console.log(`\n✓ All pending migrations applied successfully.\n`);
    } else {
      // Down migrations
      const appliedFiles = Array.from(appliedSet).sort().reverse();
      if (appliedFiles.length === 0) {
        console.log(`No applied migrations to roll back.\n`);
        return;
      }

      const lastApplied = appliedFiles[0];
      const baseName = lastApplied.replace('.sql', '');
      const downFile = `${baseName}_down.sql`;
      const downPath = path.join(migrationsDir, downFile);

      if (!fs.existsSync(downPath)) {
        throw new Error(`Down migration file not found: ${downFile}`);
      }

      const sql = fs.readFileSync(downPath, 'utf8');
      console.log(`Rolling back: ${lastApplied} using ${downFile}...`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE version = $1', [lastApplied]);
      await client.query('COMMIT');
      console.log(`✓ Rolled back ${lastApplied}\n`);
    }
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
