<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Anti-DDoS SOS Middleware
 *
 * Restricts SOS triggering to a maximum of 1 request per 120 seconds
 * per authenticated user ID or client IP address.
 */
class AntiDdosSosMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $identifier = $request->user()?->id ?? $request->header('X-User-Id') ?? $request->ip();
        $key = 'sos_throttle:' . $identifier;

        if (RateLimiter::tooManyAttempts($key, 1)) {
            $retryAfter = RateLimiter::availableIn($key);

            return response()->json([
                'success'     => false,
                'message'     => 'SOS rate limit exceeded. Please wait before sending another emergency signal.',
                'retry_after' => $retryAfter,
            ], 429);
        }

        RateLimiter::hit($key, 120);

        return $next($request);
    }
}
