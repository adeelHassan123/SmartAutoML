import time
import logging
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class RateLimiter:
    def __init__(self, requests_per_minute: int = 100):
        if requests_per_minute <= 0:
            raise ValueError("requests_per_minute must be positive")
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)  # client_ip -> list of timestamps
        self.lock = Lock()

    def is_allowed(self, client_ip: str) -> bool:
        """Check if request from client_ip is allowed under rate limit."""
        try:
            current_time = time.time()
            window_start = current_time - 60  # 1 minute window

            # Validate client_ip
            if not client_ip or not isinstance(client_ip, str):
                client_ip = "unknown"

            # Remove old requests outside the window (thread-safe)
            with self.lock:
                old_list = self.requests.get(client_ip, [])
                old_count = len(old_list)
                filtered = [timestamp for timestamp in old_list if timestamp > window_start]
                self.requests[client_ip] = filtered
                removed_count = old_count - len(filtered)

            # Periodic cleanup for memory efficiency (keep only recent IPs)
            if len(self.requests) > 5000:  # Periodic cleanup threshold
                # Remove IPs with no recent requests
                with self.lock:
                    empty_ips = [ip for ip, timestamps in list(self.requests.items()) if not timestamps]
                    for ip in empty_ips:
                        try:
                            del self.requests[ip]
                        except KeyError:
                            continue

            # Check if under limit
            with self.lock:
                if len(self.requests[client_ip]) < self.requests_per_minute:
                    self.requests[client_ip].append(current_time)
                    return True

            # Log rate limit violation
            logger.warning(f"Rate limit exceeded for {client_ip}: {len(self.requests[client_ip])} requests in last minute")
            return False

        except Exception as e:
            logger.error(f"Rate limiter error for {client_ip}: {e}")
            # Allow request on error to avoid blocking legitimate traffic
            return True

    def reset(self):
        """Reset all rate limiting data (useful for testing)."""
        self.requests.clear()
        logger.info("Rate limiter reset")


# Global rate limiter instance
rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_ip = request.client.host if request.client else "unknown"

        if not rate_limiter.is_allowed(client_ip):
            raise HTTPException(
                status_code=429,
                detail="Too many requests. Please try again later."
            )

        response = await call_next(request)
        return response
