const https = require('https');
const http = require('http');

module.exports = async function (context, req) {
    context.log('Auth proxy function processed a request.');

    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
    };

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: headers
        };
        return;
    }

    try {
        const action = req.query.action || (req.body && req.body.action);

        switch (action) {
            case 'login':
                await handleLogin(context, headers);
                break;
            
            case 'proxy':
                await handleProxy(context, req, headers);
                break;
            
            default:
                context.res = {
                    status: 400,
                    headers: headers,
                    body: JSON.stringify({ 
                        error: 'Invalid action. Use action=login or action=proxy' 
                    })
                };
        }
    } catch (error) {
        context.log.error('Error:', error);
        context.res = {
            status: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            })
        };
    }
};

async function handleLogin(context, headers) {
    // Get credentials from Azure Key Vault or App Settings
    const username = process.env.MECCA_USERNAME;
    const password = process.env.MECCA_PASSWORD;

    if (!username || !password) {
        context.res = {
            status: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Server configuration error: credentials not set' 
            })
        };
        return;
    }

    const loginData = JSON.stringify({
        username: username,
        password: password
    });

    const options = {
        hostname: 'api-mecca.platinumfm.com.au',
        port: 443,
        path: '/api/Users/Login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    try {
        const response = await makeRequest(options, loginData);
        
        context.res = {
            status: response.statusCode,
            headers: headers,
            body: response.body
        };
    } catch (error) {
        context.log.error('Login error:', error);
        context.res = {
            status: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Login failed',
                message: error.message 
            })
        };
    }
}

async function handleProxy(context, req, headers) {
    // Extract the target path and method
    const targetPath = req.query.path || (req.body && req.body.path);
    const targetMethod = req.query.method || req.method;
    const token = req.headers.authorization;

    if (!targetPath) {
        context.res = {
            status: 400,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Missing required parameter: path' 
            })
        };
        return;
    }

    const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    // Add authorization if provided
    if (token) {
        requestHeaders['Authorization'] = token;
    }

    const requestData = req.body ? JSON.stringify(req.body) : null;
    
    if (requestData) {
        requestHeaders['Content-Length'] = Buffer.byteLength(requestData);
    }

    const options = {
        hostname: 'api-mecca.platinumfm.com.au',
        port: 443,
        path: targetPath,
        method: targetMethod,
        headers: requestHeaders
    };

    try {
        const response = await makeRequest(options, requestData);
        
        context.res = {
            status: response.statusCode,
            headers: headers,
            body: response.body
        };
    } catch (error) {
        context.log.error('Proxy error:', error);
        context.res = {
            status: 500,
            headers: headers,
            body: JSON.stringify({ 
                error: 'Proxy request failed',
                message: error.message 
            })
        };
    }
}

function makeRequest(options, data) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: body
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(data);
        }

        req.end();
    });
}
