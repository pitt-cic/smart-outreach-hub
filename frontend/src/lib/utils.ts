import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import {format, formatDistanceToNow, isToday, isYesterday} from 'date-fns';
import {isValidPhoneNumber, parsePhoneNumberFromString} from 'libphonenumber-js';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

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

export function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);

    if (isToday(date)) {
        return format(date, 'h:mm a');
    }

    if (isYesterday(date)) {
        return `Yesterday ${format(date, 'h:mm a')}`;
    }

    // If within the last week, show day and time
    const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
        return format(date, 'EEE h:mm a');
    }

    // Otherwise show full date
    return format(date, 'MMM d, yyyy h:mm a');
}

export function formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp);
    return formatDistanceToNow(date, {addSuffix: true});
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'automated':
            return 'bg-gray-100 text-gray-800';
        case 'needs_response':
            return 'bg-red-100 text-red-800';
        case 'agent_responding':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function getStatusLabel(status: string): string {
    switch (status) {
        case 'automated':
            return 'Automated';
        case 'needs_response':
            return 'Needs Response';
        case 'agent_responding':
            return 'Agent Responding';
        default:
            return status;
    }
}

export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

export function downloadCSV(data: any[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV values
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        return new Promise((resolve, reject) => {
            if (document.execCommand('copy')) {
                resolve();
            } else {
                reject(new Error('Copy to clipboard failed'));
            }
            document.body.removeChild(textArea);
        });
    }
}

export function generateId(prefix: string = ''): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substr(2, 9);
    return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
}

export function parseCSVFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const csv = event.target?.result as string;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.trim());

                const data = lines.slice(1)
                    .filter(line => line.trim().length > 0)
                    .map(line => {
                        const values = line.split(',').map(v => v.trim());
                        const row: any = {};
                        headers.forEach((header, index) => {
                            row[header] = values[index] || '';
                        });
                        return row;
                    });

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}
