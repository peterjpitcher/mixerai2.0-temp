// In-memory activity tracker for Azure OpenAI API calls
// No persistence required - just real-time monitoring

export interface ActivityRequest {
  id: string;
  timestamp: number;
  endpoint: string;
  status: 'pending' | 'success' | 'error' | 'rate_limited';
  duration?: number;
  rateLimitHeaders?: {
    remaining?: string;
    reset?: string;
    retryAfter?: string;
  };
}

export interface ActivityStats {
  activeRequests: number;
  requestsPerMinute: number;
  averageResponseTime: number;
  rateLimitStatus: 'normal' | 'warning' | 'critical';
  rateLimitInfo?: {
    remaining: number;
    resetIn: number; // seconds
  };
}

class ActivityTracker {
  private requests: Map<string, ActivityRequest> = new Map();
  private completedRequests: ActivityRequest[] = [];
  private readonly WINDOW_SIZE = 60000; // 60 seconds
  private readonly CLEANUP_INTERVAL = 5000; // Clean up every 5 seconds

  constructor() {
    // Periodically clean up old requests
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  startRequest(endpoint: string): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const request: ActivityRequest = {
      id,
      timestamp: Date.now(),
      endpoint,
      status: 'pending'
    };
    this.requests.set(id, request);
    return id;
  }

  completeRequest(id: string, status: 'success' | 'error' | 'rate_limited', rateLimitHeaders?: any) {
    const request = this.requests.get(id);
    if (!request) return;

    request.status = status;
    request.duration = Date.now() - request.timestamp;
    
    // Extract rate limit headers from Azure response
    if (rateLimitHeaders) {
      request.rateLimitHeaders = {
        remaining: rateLimitHeaders['x-ratelimit-remaining-requests'],
        reset: rateLimitHeaders['x-ratelimit-reset-requests'],
        retryAfter: rateLimitHeaders['retry-after']
      };
    }

    this.completedRequests.push(request);
    this.requests.delete(id);
  }

  getStats(): ActivityStats {
    const now = Date.now();
    const cutoff = now - this.WINDOW_SIZE;

    // Filter recent requests
    const recentRequests = this.completedRequests.filter(r => r.timestamp > cutoff);
    
    // Calculate metrics
    const activeRequests = this.requests.size;
    const requestsPerMinute = recentRequests.length;
    
    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, r) => sum + (r.duration || 0), 0) / recentRequests.length
      : 0;

    // Get latest rate limit info
    const latestRequest = recentRequests
      .filter(r => r.rateLimitHeaders?.remaining)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    let rateLimitStatus: 'normal' | 'warning' | 'critical' = 'normal';
    let rateLimitInfo;

    if (latestRequest?.rateLimitHeaders?.remaining) {
      const remaining = parseInt(latestRequest.rateLimitHeaders.remaining);
      
      if (remaining < 10) {
        rateLimitStatus = 'critical';
      } else if (remaining < 50) {
        rateLimitStatus = 'warning';
      }

      rateLimitInfo = {
        remaining,
        resetIn: latestRequest.rateLimitHeaders.reset 
          ? parseInt(latestRequest.rateLimitHeaders.reset) 
          : 60
      };
    }

    // Also check if we're getting rate limited
    const rateLimitedCount = recentRequests.filter(r => r.status === 'rate_limited').length;
    if (rateLimitedCount > 0) {
      rateLimitStatus = 'critical';
    }

    return {
      activeRequests,
      requestsPerMinute,
      averageResponseTime: Math.round(avgResponseTime),
      rateLimitStatus,
      rateLimitInfo
    };
  }

  private cleanup() {
    const cutoff = Date.now() - this.WINDOW_SIZE;
    this.completedRequests = this.completedRequests.filter(r => r.timestamp > cutoff);
  }
}

// Singleton instance
export const activityTracker = new ActivityTracker();