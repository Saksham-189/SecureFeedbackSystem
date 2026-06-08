const BASE_URL = 'http://localhost:5000/api';
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123'
};

async function runTest() {
  try {
    console.log('--- Registering new user ---');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const regData = await regRes.json();
    console.log('Register Response:', regData);

    console.log('\n--- Logging in ---');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    
    // Extract cookie
    const cookies = loginRes.headers.get('set-cookie');
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    console.log('Set-Cookie Header:', cookies);

    if (!cookies) {
      throw new Error('No cookie received from login!');
    }

    // Usually Set-Cookie contains the whole string, including HttpOnly etc. We just need the key=value part.
    const tokenCookie = cookies.split(';')[0];

    console.log('\n--- Accessing Protected Route WITH Cookie ---');
    const protectedRes = await fetch(`${BASE_URL}/test/protected`, {
      headers: {
        Cookie: tokenCookie
      }
    });
    const protectedData = await protectedRes.json();
    console.log('Protected Route Response:', protectedData);

    console.log('\n--- Accessing Protected Route WITHOUT Cookie ---');
    const protectedResNoCookie = await fetch(`${BASE_URL}/test/protected`);
    const protectedDataNoCookie = await protectedResNoCookie.json();
    console.log('Without Cookie Response:', protectedDataNoCookie);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

runTest();
