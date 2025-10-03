#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {SmartOutreachHubBackendStack} from '../lib/smart-outreach-hub-backend-stack';

const app = new cdk.App();

new SmartOutreachHubBackendStack(app, 'SmartOutreachHubBackendStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
    description: 'Smart Outreach Hub Backend Infrastructure',
});
