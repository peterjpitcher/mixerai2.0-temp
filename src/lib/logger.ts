const DEBUG = process.env.DEBUG_CLAIMS === '1';

export const logDebug = (...args: any[]) => {
  if (DEBUG) {
    // Use warn to comply with no-console rule allowing warn/error
    console.warn('[CLAIMS][DEBUG]', ...args);
  }
};

export const logError = (...args: any[]) => {
  console.error('[CLAIMS]', ...args);
};

