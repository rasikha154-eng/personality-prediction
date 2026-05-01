import axios from 'axios';

(async () => {
  try {
    console.log('🔐 Logging in as admin...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@personality.com',
      password: 'Admin@1234'
    });
    
    const token = loginRes.data.token;
    console.log('✅ Token received:', token.substring(0, 20) + '...');
    
    console.log('\n📋 Fetching users...');
    const usersRes = await axios.get('http://localhost:5000/api/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, page_size: 10 }
    });
    
    console.log('✅ Users received:');
    console.table(usersRes.data.users);
    console.log(`Total: ${usersRes.data.total} users`);
    
  } catch (err) {
    console.error('❌ Error:', err.response?.data || err.message);
  }
})();
