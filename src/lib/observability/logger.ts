type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const sanitizeValue = (value: unknown): unknown => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        sanitizeValue(nestedValue),
      ]),
    );
  }

  return value;
};

const logAtLevel = (level: LogLevel, payload: Record<string, unknown>) => {
  const consoleMethod = level === 'debug' ? 'log' : level;
  const output = {
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  };

  try {
    const method = console[consoleMethod as keyof typeof console];
    if (typeof method === 'function') {
      (method as (...args: unknown[]) => void).call(console, output);
    } else {
      console.log(output);
    }
  } catch {
    console.error({
      timestamp: new Date().toISOString(),
      level: 'error',
      namespace: payload.namespace ?? 'logger',
      message: 'Failed to emit structured log entry',
      context: output,
    });
  }
};

export const createLogger = (namespace: string) => {
  const log = (level: LogLevel, message: string, context?: LogContext) => {
    const payload: Record<string, unknown> = {
      namespace,
      message,
    };

    if (context && Object.keys(context).length > 0) {
      payload.context = sanitizeValue(context);
    }

    logAtLevel(level, payload);
  };

  return {
    debug: (message: string, context?: LogContext) => log('debug', message, context),
    info: (message: string, context?: LogContext) => log('info', message, context),
    warn: (message: string, context?: LogContext) => log('warn', message, context),
    error: (message: string, context?: LogContext) => log('error', message, context),
  };
};

export type Logger = ReturnType<typeof createLogger>;
