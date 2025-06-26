// functions/api/push-subscribe.ts

import { StoredPushSubscription } from '../../types'; // Assuming types.ts is two levels up

// Minimal KVNamespace type for local TypeScript checking
// In Cloudflare environment, this is provided globally.
interface KVNamespace {
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<any | null>; // Simplified 'any' for general use
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expiration?: number, expirationTtl?: number, metadata?: any }): Promise<void>;
  delete(key: string): Promise<void>;
}


interface EventContext<Env = any, Params = any, Data = any> {
  request: Request;
  env: Env;
  waitUntil: (promise: Promise<any>) => void;
}

type PagesFunction<
  Env = any,
  Params = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

interface Env {
  PUSH_SUBSCRIPTIONS_KV: KVNamespace;
}

interface SubscribeRequestBody {
  subscription: PushSubscriptionJSON; // Standard PushSubscription object from browser
  matchId: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (!env.PUSH_SUBSCRIPTIONS_KV) {
    console.error('PUSH_SUBSCRIPTIONS_KV not bound to the function environment.');
    return new Response(JSON.stringify({ error: 'Subscription storage not configured on server.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json() as SubscribeRequestBody;
    const { subscription, matchId } = body;

    if (!subscription || !subscription.endpoint || !matchId) {
      return new Response(JSON.stringify({ error: 'Missing subscription details or matchId.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const kvKey = `match_${matchId}_subscriptions`;
    let subscriptionsForMatch: StoredPushSubscription[] = await env.PUSH_SUBSCRIPTIONS_KV.get(kvKey, 'json') || [];

    // Check if this subscription endpoint already exists for this match to avoid duplicates
    const existingSub = subscriptionsForMatch.find(sub => sub.endpoint === subscription.endpoint);
    if (!existingSub) {
      subscriptionsForMatch.push(subscription as StoredPushSubscription); // Cast to our stored type if necessary
      
      // KV an item to be stored. Max size is 25MB.
      // Store for a reasonable time, e.g., 30 days if not renewed (push services handle expiration too)
      // For matches, expiration could be tied to match end + buffer.
      // For now, let's set a generic expiration (e.g., 90 days in seconds)
      // Or no expiration, relying on push service to invalidate. For simplicity now, no explicit KV expiration.
      context.waitUntil(env.PUSH_SUBSCRIPTIONS_KV.put(kvKey, JSON.stringify(subscriptionsForMatch)));
      
      console.log(`Subscription added for match ${matchId}: ${subscription.endpoint}`);
    } else {
      console.log(`Subscription already exists for match ${matchId}: ${subscription.endpoint}`);
    }

    return new Response(JSON.stringify({ success: true, message: 'Subscription received.' }), {
      status: 201, // Created or OK
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error processing push subscription:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to process subscription.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Optional: Handle non-POST requests
export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response("This endpoint expects POST requests to manage push subscriptions.", {
    status: 405, // Method Not Allowed
    headers: { 'Content-Type': 'text/plain' },
  });
};