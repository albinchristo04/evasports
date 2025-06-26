// functions/api/vapid-public-key.ts

interface EventContext<Env = any, Params = any, Data = any> {
  request: Request;
  env: Env;
}

type PagesFunction<
  Env = any,
  Params = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;

interface Env {
  VAPID_PUBLIC_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context;

  if (!env.VAPID_PUBLIC_KEY) {
    console.error('VAPID_PUBLIC_KEY not configured in server environment.');
    return new Response(JSON.stringify({ error: "VAPID public key not configured on server." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ publicKey: env.VAPID_PUBLIC_KEY }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
