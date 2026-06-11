import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Login Status:', res.statusCode);
    const setCookie = res.headers['set-cookie'];
    if (!setCookie) {
      console.log('No cookie returned');
      console.log('Data:', data);
      return;
    }
    const cookie = setCookie.map(c => c.split(';')[0]).join('; ');
    
    const profileOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/profile',
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    };
    const profileReq = http.request(profileOptions, (profileRes) => {
        let profileData = '';
        profileRes.on('data', (chunk) => {
            profileData += chunk;
        });
        profileRes.on('end', () => {
            console.log('Profile Status:', profileRes.statusCode);
            console.log('Profile Body:', profileData);
        });
    });
    profileReq.end();
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(JSON.stringify({ email: "admin@college.edu", password: "Password123!" }));
req.end();
