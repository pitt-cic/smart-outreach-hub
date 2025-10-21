import {ChatMessage, MutationResolvers} from '../../../types/generated';
import {logError, logInfo, normalizePhoneNumber, validatePhoneNumber} from '../../../../shared/utils';
import {ValidationError} from '../../../../shared/types';
import {invokePythonAgent} from '../../shared/helpers';

export const simulateInboundMessage: MutationResolvers['simulateInboundMessage'] = async (_parent, {
    phoneNumber,
    message
}) => {
    try {
        logInfo('Processing inbound message through AI agent', {phoneNumber, message});

        if (!validatePhoneNumber(phoneNumber)) {
            throw new ValidationError('Invalid phone number format', 'phoneNumber');
        }

        if (!message || message.trim().length === 0) {
            throw new ValidationError('Message is required', 'message');
        }

        const normalizedPhone = normalizePhoneNumber(phoneNumber);
        const trimmedMessage = message.trim();
        const aiResponse = await invokePythonAgent(normalizedPhone, trimmedMessage);

        const responseMessage: ChatMessage = {
            id: `ai-response-${Date.now()}`,
            phoneNumber: normalizedPhone,
            campaignId: undefined,
            message: aiResponse,
            direction: 'outbound',
            timestamp: new Date().toISOString(),
            responseType: 'automated'
        };

        logInfo('AI agent processing completed', {
            phoneNumber,
            aiResponseLength: aiResponse.length,
            messageId: responseMessage.id
        });

        return responseMessage;

    } catch (error) {
        logError('Error processing inbound message through AI agent', error);
        throw error;
    }
};
