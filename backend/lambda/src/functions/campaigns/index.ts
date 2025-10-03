import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from 'aws-lambda';
import {parse} from 'papaparse';
// Import shared modules using relative paths
import * as database from '../../shared/database';
import * as utils from '../../shared/utils';

const {CustomerModel, CampaignModel, ChatMessageModel, CampaignCustomerModel, initializeDatabase} = database;
const {
    createSuccessResponse,
    createErrorResponse,
    logInfo,
    logError,
    normalizePhoneNumber,
    validatePhoneNumber
} = utils;

interface CSVRow {
    first_name: string;
    last_name: string;
    phone_number: string;
}

interface ContactInput {
    firstName: string;
    lastName: string;
    phoneNumber: string;
}

interface UploadResult {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: string[];
}

// Parse CSV upload request with base64 content
function parseCSVUploadRequest(event: APIGatewayProxyEvent): {
    campaignId: string,
    csvContent: string,
    filename: string
} {
    logInfo('Parsing JSON CSV upload request', {
        contentType: event.headers['content-type'] || event.headers['Content-Type'] || '',
        bodyLength: event.body?.length || 0
    });

    if (!event.body) {
        throw new Error('Request body is required');
    }

    let requestData;
    try {
        requestData = JSON.parse(event.body);
    } catch (parseError) {
        logError('Failed to parse JSON request body', parseError);
        throw new Error('Invalid JSON in request body');
    }

    const {campaignId, csvContent, filename} = requestData;

    if (!campaignId) {
        throw new Error('campaignId is required');
    }

    if (!csvContent) {
        throw new Error('csvContent is required');
    }

    if (!filename) {
        throw new Error('filename is required');
    }

    logInfo('Successfully parsed CSV upload request', {
        campaignId,
        filename,
        csvContentLength: csvContent.length
    });

    return {campaignId, csvContent, filename};
}

// Handle CSV contact upload
async function handleContactUpload(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        logInfo('Processing contact upload request');

        // Initialize database
        initializeDatabase();

        // Parse the JSON request with base64 CSV content
        let requestData;
        try {
            requestData = parseCSVUploadRequest(event);
        } catch (parseError) {
            logError('Failed to parse CSV upload request', parseError);
            return createErrorResponse(
                'Invalid request format',
                400,
                {
                    message: parseError instanceof Error ? parseError.message : 'Unknown parsing error',
                    details: 'Ensure the request contains valid JSON with campaignId, csvContent, and filename'
                }
            );
        }

        const {campaignId, csvContent: base64Content, filename} = requestData;

        // Validate that the campaign exists
        const campaign = await CampaignModel.findById(campaignId);
        if (!campaign) {
            return createErrorResponse('Campaign not found', 404);
        }

        // Decode base64 CSV content
        let csvContent;
        try {
            csvContent = Buffer.from(base64Content, 'base64').toString('utf-8');
            logInfo('Successfully decoded base64 CSV content', {
                originalSize: base64Content.length,
                decodedSize: csvContent.length,
                filename,
                firstChars: csvContent.substring(0, 100)
            });
        } catch (decodeError) {
            logError('Failed to decode base64 CSV content', decodeError);
            return createErrorResponse('Invalid base64 CSV content', 400);
        }

        // Parse CSV
        logInfo('About to parse CSV content with papaparse');
        let parseResult;
        try {
            parseResult = parse<CSVRow>(csvContent, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header: string) => header.toLowerCase().trim(),
            });
            logInfo('Successfully parsed CSV with papaparse', {
                rowCount: parseResult.data.length,
                errorCount: parseResult.errors.length,
                headers: parseResult.meta?.fields || []
            });
        } catch (csvParseError) {
            logError('Failed to parse CSV with papaparse', csvParseError);
            return createErrorResponse('Failed to parse CSV file', 500);
        }

        if (parseResult.errors.length > 0) {
            logError('CSV parsing errors detected', {
                errorCount: parseResult.errors.length,
                errors: parseResult.errors.map((err: any) => err.message)
            });
            return createErrorResponse('CSV parsing errors', 400, {
                totalRows: 0,
                validRows: 0,
                invalidRows: 0,
                errors: parseResult.errors.map((err: any) => err.message),
            });
        }

        const csvData = parseResult.data;
        const validContacts: ContactInput[] = [];
        const errors: string[] = [];

        // Validate each row
        for (let i = 0; i < csvData.length; i++) {
            const row = csvData[i];
            const rowNum = i + 2; // +2 because CSV is 1-indexed and has header

            // Check required columns
            if (!row.first_name || row.first_name.trim().length === 0) {
                errors.push(`Row ${rowNum}: Missing first_name`);
                continue;
            }

            if (!row.last_name || row.last_name.trim().length === 0) {
                errors.push(`Row ${rowNum}: Missing last_name`);
                continue;
            }

            if (!row.phone_number || row.phone_number.trim().length === 0) {
                errors.push(`Row ${rowNum}: Missing phone_number`);
                continue;
            }

            // Validate and normalize phone number
            if (!validatePhoneNumber(row.phone_number)) {
                errors.push(`Row ${rowNum}: Invalid phone number format: ${row.phone_number}`);
                continue;
            }

            const normalizedPhone = normalizePhoneNumber(row.phone_number);

            // Check for duplicates in this upload
            const isDuplicate = validContacts.some(
                contact => contact.phoneNumber === normalizedPhone
            );

            if (isDuplicate) {
                errors.push(`Row ${rowNum}: Duplicate phone number: ${normalizedPhone}`);
                continue;
            }

            validContacts.push({
                firstName: row.first_name.trim(),
                lastName: row.last_name.trim(),
                phoneNumber: normalizedPhone,
            });
        }

        // Process valid contacts
        const processedContacts: ContactInput[] = [];
        let newCustomerCount = 0;
        let existingCustomerCount = 0;

        for (const contact of validContacts) {
            try {
                // Check if customer already exists
                const existingCustomer = await CustomerModel.findByPhoneNumber(contact.phoneNumber);

                if (!existingCustomer) {
                    // Create new customer (without changing status)
                    await CustomerModel.create({
                        phone_number: contact.phoneNumber,
                        first_name: contact.firstName,
                        last_name: contact.lastName,
                        status: 'automated', // Default status for new customers
                    });
                    newCustomerCount++;
                } else {
                    // Customer exists - don't change their status
                    existingCustomerCount++;
                }

                // Check if this customer is already in this campaign
                const existingCampaignCustomer = await CampaignCustomerModel.findByCampaignAndPhone(
                    campaignId,
                    contact.phoneNumber
                );

                if (!existingCampaignCustomer) {
                    // Add customer to campaign with 'pending' status
                    await CampaignCustomerModel.create({
                        campaign_id: campaignId,
                        phone_number: contact.phoneNumber,
                        status: 'pending',
                    });
                } else {
                    errors.push(`Row: ${contact.phoneNumber} is already in this campaign`);
                    continue;
                }

                processedContacts.push(contact);
            } catch (error) {
                logError(`Error processing contact ${contact.phoneNumber}`, error);
                errors.push(`Failed to process ${contact.phoneNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Update campaign total contacts count using the new table
        const totalCampaignCustomers = await CampaignCustomerModel.countByCampaignId(campaignId);

        // Update the campaign with the new total count
        await CampaignModel.update(campaignId, {
            total_contacts: totalCampaignCustomers,
        });

        const result: UploadResult = {
            totalRows: csvData.length,
            validRows: processedContacts.length,
            invalidRows: csvData.length - processedContacts.length,
            errors,
        };

        logInfo('Contact upload completed', {
            campaignId,
            totalRows: csvData.length,
            validContacts: processedContacts.length,
            newCustomers: newCustomerCount,
            existingCustomers: existingCustomerCount,
            totalCampaignCustomers: totalCampaignCustomers
        });

        logInfo('About to return success response', {result});
        return createSuccessResponse(result);

    } catch (error) {
        logError('Error processing CSV upload', error);
        return createErrorResponse(
            'Internal server error',
            500,
            {message: error instanceof Error ? error.message : 'Unknown error'}
        );
    }
}

// Main Lambda handler
export const handler = async (
    event: APIGatewayProxyEvent,
    context: Context
): Promise<APIGatewayProxyResult> => {

    // Handle CORS preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-API-Key',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Credentials': 'true',
            },
            body: '',
        };
    }

    try {
        logInfo('Incoming campaigns request', {
            httpMethod: event.httpMethod,
            path: event.path,
            headers: event.headers,
        });

        // Route based on path and method
        if (event.path.includes('/upload') && event.httpMethod === 'POST') {
            return await handleContactUpload(event);
        } else {
            return createErrorResponse('Not found', 404);
        }

    } catch (error) {
        logError('Campaigns Lambda error', error);

        return createErrorResponse(
            'Internal server error',
            500,
            process.env.NODE_ENV === 'development' ? {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
            } : undefined
        );
    }
};

// Health check handler
export const healthCheck = async (): Promise<APIGatewayProxyResult> => {
    try {
        initializeDatabase();

        return createSuccessResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'campaigns-lambda',
        });
    } catch (error) {
        logError('Health check failed', error);

        return createErrorResponse(
            'Service unhealthy',
            503,
            {
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
            }
        );
    }
};