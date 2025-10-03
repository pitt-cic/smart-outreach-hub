#!/bin/bash

# Deploy Frontend to AWS Amplify
# This script pulls CloudFormation outputs and deploys the Vite frontend to Amplify

set -e

# Configuration
STACK_NAME="MarketingBackendStack"
FRONTEND_DIR="./frontend"
BUILD_DIR="$FRONTEND_DIR/dist"

echo "🚀 Starting frontend deployment to AWS Amplify..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI and configure it."
    exit 1
fi

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found. Please run this script from the project root."
    exit 1
fi

echo "📋 Fetching CloudFormation stack outputs..."

# Function to get stack output value
get_stack_output() {
    local output_key=$1
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null || echo ""
}

# Get all required outputs from CloudFormation
AMPLIFY_APP_ID=$(get_stack_output "AmplifyAppId")
API_GATEWAY_URL=$(get_stack_output "ApiGatewayUrl")
GRAPHQL_API_URL=$(get_stack_output "GraphQLApiUrl")
COGNITO_USER_POOL_ID=$(get_stack_output "CognitoUserPoolId")
COGNITO_USER_POOL_CLIENT_ID=$(get_stack_output "CognitoUserPoolClientId")
COGNITO_DOMAIN=$(get_stack_output "CognitoDomain")
AMPLIFY_DOMAIN_URL=$(get_stack_output "AmplifyDomainUrl")

# Validate required outputs
if [ -z "$AMPLIFY_APP_ID" ]; then
    echo "❌ Could not retrieve Amplify App ID from CloudFormation stack: $STACK_NAME"
    echo "   Make sure the stack has been deployed successfully."
    exit 1
fi

echo "✅ Retrieved stack outputs:"
echo "   Amplify App ID: $AMPLIFY_APP_ID"
echo "   API Gateway URL: $API_GATEWAY_URL"
echo "   GraphQL API URL: $GRAPHQL_API_URL"
echo "   Cognito User Pool ID: $COGNITO_USER_POOL_ID"
echo "   Cognito User Pool Client ID: $COGNITO_USER_POOL_CLIENT_ID"
echo "   Cognito Domain: $COGNITO_DOMAIN"
echo "   Expected Amplify URL: $AMPLIFY_DOMAIN_URL"

# Create .env.production file for the build
echo "📝 Creating production environment file..."
cat > "$FRONTEND_DIR/.env.production" << EOF
# Auto-generated production environment variables
# Generated on $(date)

VITE_API_URL=$API_GATEWAY_URL
VITE_GRAPHQL_API_URL=$GRAPHQL_API_URL
VITE_COGNITO_USER_POOL_ID=$COGNITO_USER_POOL_ID
VITE_COGNITO_USER_POOL_CLIENT_ID=$COGNITO_USER_POOL_CLIENT_ID
VITE_COGNITO_DOMAIN=$COGNITO_DOMAIN
VITE_NODE_ENV=production
EOF

echo "✅ Created $FRONTEND_DIR/.env.production"

# Build the frontend
echo "🔨 Building frontend application..."
cd "$FRONTEND_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Build the application
echo "🏗️  Running build command..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Go back to project root
cd ..

# Deploy to Amplify using AWS CLI
echo "🚀 Deploying to AWS Amplify..."

# Create a deployment package
DEPLOY_PACKAGE="amplify-deploy-$(date +%Y%m%d-%H%M%S).zip"
echo "📦 Creating deployment package: $DEPLOY_PACKAGE"

# Create _redirects file for SPA support (client-side routing)
echo "📝 Creating _redirects file for SPA support..."
cat > "$FRONTEND_DIR/dist/_redirects" << 'EOF'
/* /index.html 200
EOF

# Navigate into dist directory and zip its contents (not the dist folder itself)
cd "$FRONTEND_DIR/dist"
zip -r "../../$DEPLOY_PACKAGE" . -x "*.DS_Store"
cd ../..

# Start the deployment
echo "📤 Uploading to Amplify App: $AMPLIFY_APP_ID"

# Create deployment and get upload URL
echo "📤 Creating deployment..."
DEPLOYMENT_RESPONSE=$(aws amplify create-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "main" \
    --output json)

JOB_ID=$(echo "$DEPLOYMENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['jobId'])")
UPLOAD_URL=$(echo "$DEPLOYMENT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['zipUploadUrl'])")

if [ -z "$JOB_ID" ] || [ -z "$UPLOAD_URL" ]; then
    echo "❌ Failed to create Amplify deployment"
    echo "Response: $DEPLOYMENT_RESPONSE"
    rm -f "$DEPLOY_PACKAGE"
    exit 1
fi

echo "✅ Deployment created with Job ID: $JOB_ID"

# Upload the zip file to the presigned URL
echo "📤 Uploading deployment package..."
curl -X PUT -T "$DEPLOY_PACKAGE" "$UPLOAD_URL"

if [ $? -ne 0 ]; then
    echo "❌ Failed to upload deployment package"
    rm -f "$DEPLOY_PACKAGE"
    exit 1
fi

echo "✅ Deployment package uploaded successfully"

# Start the deployment
echo "🚀 Starting deployment..."
aws amplify start-deployment \
    --app-id "$AMPLIFY_APP_ID" \
    --branch-name "main" \
    --job-id "$JOB_ID"

if [ $? -ne 0 ]; then
    echo "❌ Failed to start deployment"
    rm -f "$DEPLOY_PACKAGE"
    exit 1
fi

echo "✅ Deployment started successfully"

# Monitor deployment status
echo "⏳ Monitoring deployment status..."
while true; do
    JOB_STATUS=$(aws amplify get-job \
        --app-id "$AMPLIFY_APP_ID" \
        --branch-name "main" \
        --job-id "$JOB_ID" \
        --query 'job.summary.status' \
        --output text)
    
    case $JOB_STATUS in
        "SUCCEED")
            echo "✅ Deployment completed successfully!"
            break
            ;;
        "FAILED"|"CANCELLED")
            echo "❌ Deployment failed with status: $JOB_STATUS"
            rm -f "$DEPLOY_PACKAGE"
            exit 1
            ;;
        "RUNNING"|"PENDING")
            echo "⏳ Deployment in progress... (Status: $JOB_STATUS)"
            sleep 5
            ;;
        *)
            echo "⚠️  Unknown deployment status: $JOB_STATUS"
            sleep 5
            ;;
    esac
done

# Clean up
rm -f "$DEPLOY_PACKAGE"

echo ""
echo "🎉 Frontend deployment completed successfully!"
echo ""
echo "📱 Application URLs:"
echo "   Frontend: $AMPLIFY_DOMAIN_URL"
echo "   API Gateway: $API_GATEWAY_URL"
echo "   GraphQL API: $GRAPHQL_API_URL"
echo ""
echo "🔐 Authentication:"
echo "   Cognito User Pool: $COGNITO_USER_POOL_ID"
echo "   Cognito Client ID: $COGNITO_USER_POOL_CLIENT_ID"
echo "   Cognito Domain: $COGNITO_DOMAIN"
echo ""
echo "✨ Your Smart Outreach Hub is now live!"