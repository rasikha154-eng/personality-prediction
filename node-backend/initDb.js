import db from './db.js';

async function initDb() {
  console.log(`\n🗄️  Initializing SQLite database`);

  // ── users table ──────────────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      username     TEXT NOT NULL UNIQUE,
      email        TEXT NOT NULL UNIQUE,
      password     TEXT NOT NULL,
      is_admin     INTEGER NOT NULL DEFAULT 0,
      is_active    INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Table: users');

  // ── test_results table ───────────────────────────────────────────
  await db.run(`
    CREATE TABLE IF NOT EXISTS test_results (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id          INTEGER NOT NULL,
      text_result      TEXT,
      voice_result     TEXT,
      face_result      TEXT,
      fusion_result    TEXT,
      modalities_used  TEXT,
      created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log('✅ Table: test_results');

  console.log('\n🎉 Database initialization complete!\n');
}

initDb().catch((err) => {
  console.error('❌ Database initialization failed:', err.message);
  process.exit(1);
});
