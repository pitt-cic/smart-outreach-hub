import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { logError, logInfo } from '../../../shared/log-utils';

const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

export class LambdaService {
  static async asyncInvokeLambda(functionName: string, payload?: string): Promise<void> {
    try {
      const response = await lambdaClient.send(
        new InvokeCommand({
          FunctionName: functionName,
          InvocationType: 'Event', // Async invocation
          Payload: payload,
        })
      );

      if (response.StatusCode == 202) {
        logInfo(`Invoked ${functionName} successfully`, response);
      } else if (response.FunctionError) {
        logError(`Failed to invoke ${functionName}`, response.FunctionError);
      }
    } catch (error) {
      logError(`Failed to invoke ${functionName}`, error);
      throw error;
    }
  }
}
