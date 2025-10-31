import { maskPhoneNumber } from './utils';

interface LogOptions {
    sensitiveKeys?: string[];
}

export function logInfo(message: string, data?: any, options?: LogOptions): void {
    const maskedData = maskSensitiveData(data, options?.sensitiveKeys);
    console.info(message, maskedData || '');
}

export function logWarn(message: string, data?: any, options?: LogOptions): void {
    const maskedData = maskSensitiveData(data, options?.sensitiveKeys);
    console.warn(message, maskedData || '');
}

export function logError(message: string, error?: any, options?: LogOptions): void {
    const maskedError = maskSensitiveData(error, options?.sensitiveKeys);
    console.error(message, maskedError || '');
}

export function logDebug(message: string, data?: any, options?: LogOptions): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
        const maskedData = maskSensitiveData(data, options?.sensitiveKeys);
        console.debug(message, maskedData || '');
    }
}

/**
 * Mask sensitive data in logs
 * @param data The data to mask
 * @param sensitiveKeys The keys to mask
 * @returns The masked data
 */
function maskSensitiveData(data?: any, sensitiveKeys?: string[]): any {
    // Check if data is an object
    if (typeof data !== 'object' || !data) {
        return data;
    }

    // Always mask phone number fields
    const phoneNumberKeys = ['phoneNumber', 'phone', 'phone_number'];
    const keysToMask = sensitiveKeys || phoneNumberKeys;

    const maskedData = { ...data };
    for (const key of keysToMask) {
        if (key in maskedData) {
            // Mask phone numbers specifically
            if (phoneNumberKeys.includes(key) && typeof maskedData[key] === 'string') {
                maskedData[key] = maskPhoneNumber(maskedData[key]);
            } else {
                maskedData[key] = '***[REDACTED]***';
            }
        }
    }
    return maskedData;
}
