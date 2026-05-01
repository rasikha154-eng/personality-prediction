import pool from './db.js';

(async () => {
  console.log('\n🔍 Debugging getAllUsers query...\n');
  
  try {
    // Test 1: Get total users count
    console.log('Test 1: Total users count');
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) AS total FROM users');
    console.log(`✅ Total users: ${total}\n`);

    // Test 2: Simple select without joins
    console.log('Test 2: Simple user list');
    const [simpleUsers] = await pool.execute('SELECT id, username, email, is_admin FROM users LIMIT 5');
    console.log(`✅ Found ${simpleUsers.length} users:`);
    simpleUsers.forEach(u => console.log(`  - ID: ${u.id}, Username: ${u.username}, Email: ${u.email}`));
    console.log('');

    // Test 3: With LEFT JOIN and GROUP BY (exact query from controller)
    console.log('Test 3: With LEFT JOIN and GROUP BY');
    const query = `
      SELECT u.id, u.username, u.email, u.is_admin, u.is_active, u.created_at,
             COUNT(t.id) AS total_tests
      FROM users u
      LEFT JOIN test_results t ON t.user_id = u.id
      GROUP BY u.id 
      ORDER BY u.created_at DESC 
      LIMIT 10 OFFSET 0
    `;
    const [joinedUsers] = await pool.execute(query);
    console.log(`✅ Found ${joinedUsers.length} users with joins:`);
    joinedUsers.forEach(u => console.log(`  - ID: ${u.id}, Username: ${u.username}, Tests: ${u.total_tests}`));
    console.log('');

    console.log('✨ Debug complete!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
