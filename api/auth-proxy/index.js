module.exports = async function (context, req) {
    context.log('Niagara credentials endpoint triggered');

    const origin = req.headers.origin || '*';

    // CORS headers
    context.res = {
        headers: {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        }
    };

    // Handle OPTIONS for CORS preflight
    if (req.method === 'OPTIONS') {
        context.res.status = 200;
        return;
    }

    try {
        const username = process.env.NIAGARA_USERNAME;
        const password = process.env.NIAGARA_PASSWORD;

        if (!username || !password) {
            context.log.error('Missing Niagara credentials in environment');
            context.res.status = 500;
            context.res.body = { 
                error: 'Server configuration error',
                message: 'Niagara credentials not configured. Add NIAGARA_USERNAME and NIAGARA_PASSWORD to Application Settings.'
            };
            return;
        }

        context.log('Credentials retrieved successfully');

        // Return credentials securely to the authenticated wrapper
        context.res.status = 200;
        context.res.body = {
            username: username,
            password: password
        };

    } catch (error) {
        context.log.error('Error:', error);
        context.res.status = 500;
        context.res.body = {
            error: error.message || 'Internal server error'
        };
    }
};