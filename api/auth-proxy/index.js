const https = require('https');

module.exports = async function (context, req) {
    context.log('Auth proxy function triggered');

    const action = req.query.action || 'login';
    const origin = req.headers.origin || 'https://meccaiot.platinumfm.com.au';

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        const username = process.env.MECCA_USERNAME;
        const password = process.env.MECCA_PASSWORD;

        if (!username || !password) {
            throw new Error('Missing credentials');
        }

        // LOGIN WITH COOKIE REWRITING
        if (action === 'login') {
            context.log('Login with cookie domain rewriting');

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
                    const cookies = res.headers['set-cookie'] || [];
                    
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        try {
                            resolve({ 
                                status: res.statusCode, 
                                data: JSON.parse(data),
                                cookies: cookies
                            });
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
                
                // REWRITE COOKIE DOMAINS for parent domain sharing
                if (apiResponse.cookies && apiResponse.cookies.length > 0) {
                    const rewrittenCookies = apiResponse.cookies.map(cookie => {
                        // Parse the cookie
                        let modifiedCookie = cookie;
                        
                        // Remove any existing Domain directive
                        modifiedCookie = modifiedCookie.replace(/;\s*Domain=[^;]+/gi, '');
                        
                        // Add parent domain (with leading dot for subdomain sharing)
                        modifiedCookie += '; Domain=.platinumfm.com.au';
                        
                        // Ensure Secure and SameSite=None for cross-subdomain
                        if (!modifiedCookie.includes('Secure')) {
                            modifiedCookie += '; Secure';
                        }
                        if (!modifiedCookie.includes('SameSite')) {
                            modifiedCookie += '; SameSite=None';
                        }
                        
                        context.log('Rewritten cookie:', modifiedCookie);
                        return modifiedCookie;
                    });
                    
                    // Set the cookies in response
                    context.res.headers['Set-Cookie'] = rewrittenCookies;
                }
                
                context.res.status = 200;
                context.res.body = {
                    ...apiResponse.data,
                    cookiesSet: apiResponse.cookies.length,
                    message: 'Cookies rewritten for parent domain'
                };
            } else {
                context.log('Authentication failed:', apiResponse.status);
                context.res.status = apiResponse.status;
                context.res.body = { error: 'Authentication failed' };
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