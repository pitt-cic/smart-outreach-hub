import {createYoga} from 'graphql-yoga';
import {makeExecutableSchema} from '@graphql-tools/schema';
import {createServer} from 'http';
import {typeDefsString} from './schema';
import {resolvers} from './resolvers';
import {logInfo, logError} from '../shared/log-utils';
import {DatabaseUtils} from '../shared/dynamodb';

// Initialize database connection
try {
    DatabaseUtils.checkConnectionToDynamoDB();
    logInfo('Database initialized successfully');
} catch (error) {
    logError('Failed to initialize database', error);
    console.error('❌ Database initialization failed. Make sure AWS credentials are configured.');
    process.exit(1);
}

// Create executable schema with new .graphql files
const schema = makeExecutableSchema({
    typeDefs: typeDefsString,
    resolvers,
});

console.log('✅ Schema created successfully from .graphql files');

// Create Yoga instance
const yoga = createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    landingPage: true, // Enable GraphQL Playground
    context: ({request}) => ({
        request,
        // Add any additional context properties here
    }),
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
        credentials: true,
    },
});

// Create HTTP server
const server = createServer(yoga);

// Start server
const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(80));
    console.log('🚀 LOCAL GRAPHQL SERVER RUNNING');
    console.log('='.repeat(80));
    console.log('');
    console.log(`📊 GraphQL Endpoint:  http://localhost:${PORT}/graphql`);
    console.log(`🎮 GraphQL Playground: http://localhost:${PORT}/graphql`);
    console.log('');
    console.log('📝 Using:');
    console.log('   • Schema:    Merged from lambda/src/graphql/schema/**/*.graphql');
    console.log('   • Resolvers: Modular resolvers from lambda/src/graphql/resolvers/');
    console.log('   • AWS:       Real AWS services (DynamoDB, SQS, Lambda)');
    console.log('');
    console.log('💡 Tips:');
    console.log('   • Test queries in Postman: POST to http://localhost:4000/graphql');
    console.log('   • Or use the GraphQL Playground in your browser');
    console.log('   • Press Ctrl+C to stop the server');
    console.log('');
    console.log('='.repeat(80));
    console.log('');
    console.log('Ready to accept queries! 🎉');
    console.log('');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('');
    console.log('🛑 Shutting down local GraphQL server...');
    server.close(() => {
        console.log('✅ Server stopped gracefully');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('');
    console.log('🛑 Shutting down local GraphQL server...');
    server.close(() => {
        console.log('✅ Server stopped gracefully');
        process.exit(0);
    });
});
