const https = require('https');

module.exports = async function (context, req) {
    context.log('Auth proxy function triggered');

    const action = req.query.action || 'login';

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        // Get credentials from environment variables
        const username = process.env.MECCA_USERNAME;
        const password = process.env.MECCA_PASSWORD;

        if (!username || !password) {
            throw new Error('Server configuration error: Missing credentials');
        }

        // NEW ACTION: Return credentials securely
        if (action === 'getcredentials') {
            context.log('Returning credentials for browser-side auth');
            context.res.status = 200;
            context.res.body = {
                username: username,
                password: password
            };
            return;
        }

        // EXISTING ACTION: Login (kept for backwards compatibility)
        if (action === 'login') {
            context.log('Login action - authenticating with MECCA API');

            const loginData = JSON.stringify({
                username: username,
                password: password
            });

            const options = {
                hostname: 'api-mecca.platinumfm.com.au',
                path: '/api/Users/Login',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(loginData)
                }
            };

            const apiResponse = await new Promise((resolve, reject) => {
                const apiReq = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve({ status: res.statusCode, data: JSON.parse(data) });
                        } catch (e) {
                            reject(new Error('Invalid API response'));
                        }
                    });
                });

                apiReq.on('error', reject);
                apiReq.write(loginData);
                apiReq.end();
            });

            if (apiResponse.status === 200) {
                context.log('Authentication successful');
                context.res.status = 200;
                context.res.body = apiResponse.data;
            } else {
                context.log('Authentication failed:', apiResponse.status);
                context.res.status = apiResponse.status;
                context.res.body = { error: 'Authentication failed', details: apiResponse.data };
            }
            return;
        }

        // EXISTING ACTION: Proxy (kept for backwards compatibility)
        if (action === 'proxy') {
            const path = req.query.path || '/';
            const method = req.query.method || 'GET';
            const token = req.headers['authorization'];

            if (!token) {
                context.res.status = 401;
                context.res.body = { error: 'No authorization token provided' };
                return;
            }

            const options = {
                hostname: 'api-mecca.platinumfm.com.au',
                path: path,
                method: method,
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                }
            };

            const apiResponse = await new Promise((resolve, reject) => {
                const apiReq = https.request(options, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        resolve({ status: res.statusCode, data: data });
                    });
                });

                apiReq.on('error', reject);
                
                if (req.body && method !== 'GET') {
                    apiReq.write(JSON.stringify(req.body));
                }
                
                apiReq.end();
            });

            context.res.status = apiResponse.status;
            try {
                context.res.body = JSON.parse(apiResponse.data);
            } catch (e) {
                context.res.body = apiResponse.data;
            }
            return;
        }

        context.res.status = 400;
        context.res.body = { error: 'Invalid action' };

    } catch (error) {
        context.log.error('Error:', error);
        context.res.status = 500;
        context.res.body = {
            error: error.message || 'Internal server error'
        };
    }
};