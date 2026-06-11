import http from 'http';

const fetchCsrf = () => new Promise((resolve, reject) => {
    http.get('http://localhost:5000/api/csrf-token', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
            token: JSON.parse(data).csrfToken,
            cookie: res.headers['set-cookie'] ? res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : ''
        }));
    }).on('error', reject);
});

const login = (csrf, cookie) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrf,
            'Cookie': cookie
        }
    };
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            const setCookie = res.headers['set-cookie'];
            resolve({
                status: res.statusCode,
                cookie: setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : ''
            });
        });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ email: "admin@college.edu", password: "Password123!" }));
    req.end();
});

const getProfile = (cookie) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/profile',
        method: 'GET',
        headers: { 'Cookie': cookie }
    };
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            resolve({ status: res.statusCode, data });
        });
    });
    req.on('error', reject);
    req.end();
});

async function run() {
    const { token, cookie: csrfCookie } = await fetchCsrf();
    console.log("CSRF Token:", token);
    
    const { status, cookie: authCookie } = await login(token, csrfCookie);
    console.log("Login Status:", status);
    
    const fullCookie = csrfCookie + (authCookie ? '; ' + authCookie : '');
    const profile = await getProfile(fullCookie);
    
    console.log("Profile Status:", profile.status);
    console.log("Profile Data:", profile.data.substring(0, 500));
}

run();
