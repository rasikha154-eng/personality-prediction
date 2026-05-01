import bcrypt from 'bcryptjs';
import db from './db.js';

async function createTestUsers() {
  const testUsers = [
    { username: 'john_doe', email: 'john@example.com', password: 'Password@123' },
    { username: 'jane_smith', email: 'jane@example.com', password: 'Password@123' },
    { username: 'ali_khan', email: 'ali@example.com', password: 'Password@123' },
    { username: 'sara_malik', email: 'sara@example.com', password: 'Password@123' },
    { username: 'test_user', email: 'test@example.com', password: 'Password@123' },
  ];

  console.log('\n📝 Creating test users...\n');

  for (const user of testUsers) {
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [user.email]);
    
    if (existing) {
      console.log(`⏭️  ${user.email} - already exists`);
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 12);
    await db.run(
      'INSERT INTO users (username, email, password, is_admin) VALUES (?, ?, ?, ?)',
      [user.username, user.email, hashed, 0]
    );
    console.log(`✅ ${user.username} (${user.email}) - created`);
  }

  console.log('\n✨ Test users setup complete!\n');
}

createTestUsers().catch(err => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});