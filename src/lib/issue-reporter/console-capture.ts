export interface ConsoleLog {
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: string;
  stack?: string;
}

export interface NetworkLog {
  method: string;
  url: string;
  status?: number;
  timestamp: string;
  duration?: number;
  error?: string;
}

class ConsoleCapture {
  private static instance: ConsoleCapture;
  private consoleLogs: ConsoleLog[] = [];
  private networkLogs: NetworkLog[] = [];
  private maxLogs = 100;
  private maxNetworkLogs = 50;
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    info: typeof console.info;
  };
  private originalFetch: typeof fetch | null = null;
  private isInitialized = false;

  private constructor() {
    this.originalConsole = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
    };
    // Only access window in browser environment
    if (typeof window !== 'undefined') {
      this.originalFetch = window.fetch;
    }
  }

  static getInstance(): ConsoleCapture {
    if (!ConsoleCapture.instance) {
      ConsoleCapture.instance = new ConsoleCapture();
    }
    return ConsoleCapture.instance;
  }

  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Intercept console methods
    (['log', 'warn', 'error', 'info'] as const).forEach((method) => {
      console[method] = (...args: unknown[]) => {
        const log: ConsoleLog = {
          level: method,
          message: args
            .map((arg) => {
              try {
                return typeof arg === 'object' 
                  ? JSON.stringify(arg, null, 2) 
                  : String(arg);
              } catch {
                return String(arg);
              }
            })
            .join(' '),
          timestamp: new Date().toISOString(),
        };

        // Capture stack trace for errors
        if (method === 'error') {
          log.stack = new Error().stack;
        }

        this.consoleLogs.push(log);

        // Maintain buffer size
        if (this.consoleLogs.length > this.maxLogs) {
          this.consoleLogs.shift();
        }

        // Call original method
        return this.originalConsole[method].apply(console, args);
      };
    });

    // Intercept fetch for network logging
    if (this.originalFetch) {
      window.fetch = async (...args: Parameters<typeof fetch>) => {
      const startTime = Date.now();
      const [input, init] = args;
      const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
      const method = init?.method || 'GET';

      const networkLog: NetworkLog = {
        method,
        url,
        timestamp: new Date().toISOString(),
      };

        try {
          const response = await this.originalFetch!.apply(window, args);
          networkLog.status = response.status;
          networkLog.duration = Date.now() - startTime;
          
          this.networkLogs.push(networkLog);
          if (this.networkLogs.length > this.maxNetworkLogs) {
            this.networkLogs.shift();
          }

          return response;
        } catch (error) {
          networkLog.error = error instanceof Error ? error.message : 'Unknown error';
          networkLog.duration = Date.now() - startTime;
          
          this.networkLogs.push(networkLog);
          if (this.networkLogs.length > this.maxNetworkLogs) {
            this.networkLogs.shift();
          }

          throw error;
        }
      };
    }

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.consoleLogs.push({
        level: 'error',
        message: `Unhandled error: ${event.message}`,
        timestamp: new Date().toISOString(),
        stack: event.error?.stack,
      });

      if (this.consoleLogs.length > this.maxLogs) {
        this.consoleLogs.shift();
      }
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.consoleLogs.push({
        level: 'error',
        message: `Unhandled promise rejection: ${event.reason}`,
        timestamp: new Date().toISOString(),
        stack: event.reason?.stack,
      });

      if (this.consoleLogs.length > this.maxLogs) {
        this.consoleLogs.shift();
      }
    });

    this.isInitialized = true;
  }

  getConsoleLogs(): ConsoleLog[] {
    return [...this.consoleLogs];
  }

  getNetworkLogs(): NetworkLog[] {
    return [...this.networkLogs];
  }

  clearLogs(): void {
    this.consoleLogs = [];
    this.networkLogs = [];
  }

  destroy(): void {
    if (!this.isInitialized) return;

    // Restore original console methods
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;

    // Restore original fetch
    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch;
    }

    this.isInitialized = false;
  }
}

export const consoleCapture = ConsoleCapture.getInstance();