export function logInfo(message: string, data?: any): void {
  console.info(message, data ? JSON.stringify(data, null, 2) : '');
}

export function logWarn(message: string, data?: any): void {
  console.warn(message, data ? JSON.stringify(data, null, 2) : '');
}

export function logError(message: string, error?: any): void {
  console.error(message, error);
}

export function logDebug(message: string, data?: any): void {
  if (process.env.LOG_LEVEL === 'DEBUG') {
    console.debug(message, data ? JSON.stringify(data, null, 2) : '');
  }
}
