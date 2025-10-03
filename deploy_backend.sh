#!/bin/bash

# Smart Outreach Hub Deployment Script
set -e

echo "📱 Smart Outreach Hub - Deployment"
echo "====================================================="

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

# Check if CDK is installed
if ! command -v cdk &> /dev/null; then
    echo "❌ AWS CDK not found. Installing..."
    npm install -g aws-cdk
fi

# Check if we're in the project root directory
if [ ! -f "backend/cdk.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if cdk.context.json exists
if [ ! -f "backend/cdk.context.json" ]; then
    echo "❌ cdk.context.json not found in backend directory"
    exit 1
else
    echo "✅ Found cdk.context.json"
    # Validate required context keys in cdk.context.json
    REQUIRED_KEYS=(
        "smsConfig:originationNumber"
        "smsConfig:phoneNumberId"
        "bedrockConfig:modelName"
        "pydanticConfig:logfireToken"
        "meetingConfig:calendlyUrl"
    )
    for KEY in "${REQUIRED_KEYS[@]}"; do
        if ! grep -q "\"$KEY\"" backend/cdk.context.json; then
            echo "❌ '$KEY' key not found in cdk.context.json"
            exit 1
        fi
    done
    echo "✅ All required keys found in cdk.context.json"
fi

echo "✅ Environment checks passed"
echo ""

read -p "Proceed with deployment? (y/n): " CONFIRM
if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Change to backend directory
cd backend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Bootstrap CDK if needed
echo "🚀 Bootstrapping CDK (if needed)..."
cdk bootstrap

# Deploy the stack
STACK_NAME="MarketingBackendStack"
echo "🚀 Deploying stack: $STACK_NAME"
cdk deploy

echo ""
echo "✅ Deployment completed successfully!"
echo ""