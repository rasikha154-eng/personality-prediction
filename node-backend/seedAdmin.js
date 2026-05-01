import bcrypt from 'bcryptjs';
import db from './db.js';

async function seedAdmin() {
  const adminEmail = 'admin@personality.com';
  const adminPassword = 'Admin@1234';
  const adminUsername = 'admin';

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [adminEmail]);
  if (existing) {
    console.log('ℹ️  Admin user already exists.');
    console.log(`📧  Email: ${adminEmail}`);
    console.log(`🔑  Password: ${adminPassword}`);
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);
  await db.run(
    'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
    [adminUsername, adminEmail, hashed, 1]
  );

  console.log('\n✅ Admin user created!');
  console.log('══════════════════════════════');
  console.log(`📧  Email:    ${adminEmail}`);
  console.log(`🔑  Password: ${adminPassword}`);
  console.log('══════════════════════════════\n');
}

seedAdmin().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
