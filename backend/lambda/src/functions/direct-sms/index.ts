import { SQSEvent } from 'aws-lambda';
import { logError } from '../../shared/log-utils';
import { HandleSQSEventResult, LambdaHandlerResult } from '../../shared/types';
import { createErrorResponse, createSuccessResponse } from '../../shared/utils';
import { processSQSRecord } from './utils';

export const handler = async (event: SQSEvent): Promise<LambdaHandlerResult> => {
  try {
    if ('Records' in event) {
      const results = await handleSQSEvent(event as SQSEvent);
      return createSuccessResponse(results, 200, true);
    }

    return createErrorResponse('Invalid event structure', 400, null, true);
  } catch (error) {
    logError('Error in direct SMS function', error);
    return createErrorResponse('Error while processing SQS event', 500, error, true);
  }
};

async function handleSQSEvent(event: SQSEvent): Promise<HandleSQSEventResult[]> {
  const results = await Promise.allSettled(event.Records.map(processSQSRecord));

  const eventResults: HandleSQSEventResult[] = results.map((result, index) => {
    return {
      itemIdentifier: event.Records[index].messageId,
      success: result.status === 'fulfilled',
      error: result.status === 'rejected' ? result.reason : undefined,
    };
  });

  return eventResults;
}
