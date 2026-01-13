/**
 * Database schema initialization script
 * Runs all SQL migration files in sql/ directory
 */
const fs = require('fs');
const path = require('path');
const db = require('./src/db');

async function runMigrations() {
  try {
    const sqlDir = path.join(__dirname, 'sql');
    const files = fs.readdirSync(sqlDir).filter(f => f.endsWith('.sql')).sort();

    console.log('🔄 Running database migrations...');
    console.log(`Found ${files.length} migration files`);

    for (const file of files) {
      const filePath = path.join(sqlDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`\n📝 Executing ${file}...`);
      try {
        await db.query(sql);
        console.log(`✅ ${file} completed`);
      } catch (err) {
        console.error(`❌ ${file} failed:`, err.message);
      }
    }

    console.log('\n✨ Migrations completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

runMigrations();
