#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {MarketingBackendStack} from '../lib/marketing-backend-stack';

const app = new cdk.App();

new MarketingBackendStack(app, 'MarketingBackendStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'SMS Marketing Campaign Backend Infrastructure',
});
