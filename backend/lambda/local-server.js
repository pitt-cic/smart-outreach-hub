const express = require('express');
const cors = require('cors');
const path = require('path');

// Mock AWS Lambda context
const createMockContext = () => ({
    functionName: 'marketing-graphql-api',
    functionVersion: '$LATEST',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:marketing-graphql-api',
    memoryLimitInMB: '1024',
    awsRequestId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    logGroupName: '/aws/lambda/marketing-graphql-api',
    logStreamName: `2024/01/01/[$LATEST]${Math.random().toString(36).substr(2, 9)}`,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
});

// Mock AWS SDK for local development
process.env.AWS_REGION = 'us-east-1';
process.env.NODE_ENV = 'development';
process.env.LOG_LEVEL = 'DEBUG';
process.env.CALENDLY_URL = "https://calendly.com/XXXX/15min"

// Initialize Express app
const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());

// Skip body parsing for campaigns routes to preserve multipart data
app.use((req, res, next) => {
    if (req.path.startsWith('/campaigns')) {
        // For campaigns, we'll handle raw body parsing manually
        next();
    } else {
        // For other routes, use normal JSON parsing
        express.json({ limit: '10mb' })(req, res, next);
    }
});

app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`\n🔍 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    console.log('📋 Headers:', JSON.stringify(req.headers, null, 2));
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    }
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'graphql-lambda-local',
        version: '1.0.0',
    });
});

// GraphQL endpoint
app.all('/graphql', async (req, res) => {
    try {
        console.log('🚀 Processing GraphQL request...');
        
        // For local development, import TypeScript directly
        try {
            require('ts-node/register');
            
            // Clear cache for hot reload
            const handlerPath = path.resolve(__dirname, 'src/functions/graphql/index.ts');
            delete require.cache[handlerPath];
            
            const { handler } = require('./src/functions/graphql/index.ts');
            await processRequest(handler, req, res);
            
        } catch (tsError) {
            console.error('❌ TypeScript compilation failed:', tsError.message);
            res.status(500).json({
                error: 'TypeScript compilation failed',
                message: tsError.message,
                stack: process.env.NODE_ENV === 'development' ? tsError.stack : undefined,
            });
        }
        
    } catch (error) {
        console.error('❌ Error processing GraphQL request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

async function processRequest(handler, req, res) {
    // Create API Gateway event object
    const event = {
        httpMethod: req.method,
        path: req.path,
        headers: req.headers,
        multiValueHeaders: {},
        queryStringParameters: req.query && Object.keys(req.query).length > 0 ? req.query : null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
            requestId: `local-${Date.now()}`,
            stage: 'local',
            resourcePath: req.path,
            httpMethod: req.method,
            requestTime: new Date().toISOString(),
            protocol: 'HTTP/1.1',
            resourceId: 'local',
            accountId: '123456789012',
            apiId: 'local',
            identity: {
                userAgent: req.headers['user-agent'],
                sourceIp: req.ip,
            },
        },
        body: req.rawBody || (req.body ? (Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : JSON.stringify(req.body))) : null),
        isBase64Encoded: false,
    };

    const context = createMockContext();

    console.log('📤 Invoking Lambda handler with event:', JSON.stringify(event, null, 2));

    try {
        const result = await handler(event, context);
        
        console.log('✅ Lambda handler response:', JSON.stringify(result, null, 2));

        // Set response headers
        if (result.headers) {
            Object.entries(result.headers).forEach(([key, value]) => {
                res.set(key, value);
            });
        }

        // Set status code and body
        res.status(result.statusCode || 200);
        
        if (result.body) {
            if (result.headers && result.headers['Content-Type'] === 'application/json') {
                res.json(JSON.parse(result.body));
            } else {
                res.send(result.body);
            }
        } else {
            res.send('');
        }

    } catch (handlerError) {
        console.error('❌ Lambda handler error:', handlerError);
        res.status(500).json({
            error: 'Lambda handler error',
            message: handlerError.message,
            stack: process.env.NODE_ENV === 'development' ? handlerError.stack : undefined,
        });
    }
}

// GraphQL health check
app.get('/graphql/health', async (req, res) => {
    try {
        const handlerPath = path.join(__dirname, 'dist/functions/graphql/index.js');
        
        // Check if we can load the handler
        if (!require('fs').existsSync(handlerPath)) {
            return res.status(503).json({
                status: 'unhealthy',
                error: 'Lambda handler not compiled',
                message: 'Run: npm run build',
            });
        }

        const { healthCheck } = require(handlerPath);
        
        if (healthCheck) {
            const result = await healthCheck();
            res.status(result.statusCode || 200).json(JSON.parse(result.body || '{}'));
        } else {
            res.json({
                status: 'healthy',
                message: 'GraphQL Lambda handler loaded successfully',
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error('❌ Health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Campaigns endpoints
app.post('/campaigns/upload', async (req, res) => {
    try {
        console.log('🚀 Processing campaigns upload request...');
        
        // Collect raw body data for multipart handling
        let body = '';
        req.setEncoding('utf8');
        
        for await (const chunk of req) {
            body += chunk;
        }
        
        // For local development, import TypeScript directly
        try {
            require('ts-node/register');
            
            // Clear cache for hot reload
            const handlerPath = path.resolve(__dirname, 'src/functions/campaigns/index.ts');
            delete require.cache[handlerPath];
            
            const { handler } = require('./src/functions/campaigns/index.ts');
            
            // Create a modified req object with the raw body
            req.rawBody = body;
            await processRequest(handler, req, res);
            
        } catch (tsError) {
            console.error('❌ TypeScript compilation failed:', tsError.message);
            res.status(500).json({
                error: 'TypeScript compilation failed',
                message: tsError.message,
                stack: process.env.NODE_ENV === 'development' ? tsError.stack : undefined,
            });
        }
        
    } catch (error) {
        console.error('❌ Error processing campaigns upload request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

app.post('/campaigns/send', async (req, res) => {
    try {
        console.log('🚀 Processing campaigns send request...');
        
        // For local development, import TypeScript directly
        try {
            require('ts-node/register');
            
            // Clear cache for hot reload
            const handlerPath = path.resolve(__dirname, 'src/functions/campaigns/index.ts');
            delete require.cache[handlerPath];
            
            const { handler } = require('./src/functions/campaigns/index.ts');
            await processRequest(handler, req, res);
            
        } catch (tsError) {
            console.error('❌ TypeScript compilation failed:', tsError.message);
            res.status(500).json({
                error: 'TypeScript compilation failed',
                message: tsError.message,
                stack: process.env.NODE_ENV === 'development' ? tsError.stack : undefined,
            });
        }
        
    } catch (error) {
        console.error('❌ Error processing campaigns send request:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
    }
});

// Campaigns health check
app.get('/campaigns/health', async (req, res) => {
    try {
        const handlerPath = path.join(__dirname, 'dist/functions/campaigns/index.js');
        
        // Check if we can load the handler
        if (!require('fs').existsSync(handlerPath)) {
            return res.status(503).json({
                status: 'unhealthy',
                error: 'Campaigns Lambda handler not compiled',
                message: 'Run: npm run build',
            });
        }

        const { healthCheck } = require(handlerPath);
        
        if (healthCheck) {
            const result = await healthCheck();
            res.status(result.statusCode || 200).json(JSON.parse(result.body || '{}'));
        } else {
            res.json({
                status: 'healthy',
                message: 'Campaigns Lambda handler loaded successfully',
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error('❌ Campaigns health check error:', error);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString(),
        });
    }
});

// Start server
app.listen(port, () => {
    console.log('\n🚀 Lambda Functions Local Server');
    console.log('==================================');
    console.log(`📡 Server running on http://localhost:${port}`);
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log('\n📊 GraphQL API:');
    console.log(`🔗 GraphQL endpoint: http://localhost:${port}/graphql`);
    console.log(`🏥 GraphQL health: http://localhost:${port}/graphql/health`);
    console.log('\n📋 Campaigns API:');
    console.log(`📤 Upload endpoint: http://localhost:${port}/campaigns/upload`);
    console.log(`🚀 Send endpoint: http://localhost:${port}/campaigns/send`);
    console.log(`🏥 Campaigns health: http://localhost:${port}/campaigns/health`);
    console.log('\n📝 Setup Instructions:');
    console.log('1. Install dependencies: npm install');
    console.log('2. Compile all functions: npm run build');
    console.log('3. Initialize test DB (if needed): node dist/shared/init-db.js');
    console.log('\n💡 Tips:');
    console.log('- Code changes require recompilation (npm run build)');
    console.log('- Server automatically reloads handlers on each request');
    console.log('- Set LOG_LEVEL=DEBUG for verbose logging');
    console.log('\n🧪 Test Commands:');
    console.log(`curl http://localhost:${port}/health`);
    console.log(`curl http://localhost:${port}/graphql/health`);
    console.log(`curl http://localhost:${port}/campaigns/health`);
    console.log(`curl -X POST http://localhost:${port}/graphql -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'`);
    console.log(`curl -X POST http://localhost:${port}/campaigns/send -H "Content-Type: application/json" -d '{"campaignId":"test"}'`);
    console.log('\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Shutting down Lambda Functions Local Server...');
    process.exit(0);
});

module.exports = app;