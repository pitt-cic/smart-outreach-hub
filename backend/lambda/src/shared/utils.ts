import {isValidPhoneNumber, parsePhoneNumberFromString} from 'libphonenumber-js';

// Re-export initializeDatabase from database module
export {initializeDatabase} from './database';

export function formatPhoneNumber(phoneNumber: string): string {
    try {
        const parsed = parsePhoneNumberFromString(phoneNumber, 'US');
        if (parsed && parsed.isValid()) {
            return parsed.formatNational();
        }
        return phoneNumber;
    } catch (error) {
        return phoneNumber;
    }
}

export function validatePhoneNumber(phoneNumber: string): boolean {
    return isValidPhoneNumber(phoneNumber, 'US');
}

export function normalizePhoneNumber(phoneNumber: string): string {
    try {
        const parsed = parsePhoneNumberFromString(phoneNumber, 'US');
        if (parsed && parsed.isValid()) {
            return parsed.format('E.164');
        }
        return phoneNumber;
    } catch (error) {
        return phoneNumber;
    }
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
        return text;
    }
    return text.slice(0, maxLength) + '...';
}

export function generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

// Logging utilities for Lambda
export function logInfo(message: string, data?: any): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export function logWarn(message: string, data?: any): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
}

export function logError(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`, error);
}

export function logDebug(message: string, data?: any): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
        console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
}

// Lambda response helpers
export function createSuccessResponse(data: any, statusCode: number = 200) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({success: true, data})
    };
}

export function createErrorResponse(message: string, statusCode: number = 500, details?: any) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key',
            'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT,DELETE'
        },
        body: JSON.stringify({
            success: false,
            error: message,
            details: details || undefined
        })
    };
}

// Template processing utilities
export function hasPersonalizationPlaceholders(template: string): boolean {
    const placeholderRegex = /\{\{(first_name|last_name)\}\}/;
    return placeholderRegex.test(template);
}

export function personalizeMessage(template: string, firstName: string, lastName: string): string {
    let result = template;
    result = result.replace(/\{\{first_name\}\}/g, firstName || 'Customer');
    result = result.replace(/\{\{last_name\}\}/g, lastName || 'Customer');
    return result;
}
