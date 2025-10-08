// Vercel Edge Functions
// https://vercel.com/docs/functions/edge-functions

// By removing the config, we default to the Node.js runtime (Serverless Function),
// which has a longer timeout than the Edge runtime.
// export const config = { runtime: 'edge' };

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // 1) Robust request body handling
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: { message: 'Invalid or empty JSON body' } }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }
  const { endpoint, payload } = body ?? {};
  if (!endpoint || payload == null) {
    return new Response(
      JSON.stringify({ error: { message: 'Missing "endpoint" or "payload"' } }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    );
  }

  // 2) Read API key, supporting both names from README and common practice
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: { message: 'API key is not configured on the server.' } }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  // 3) Safely process upstream request and response
  const url = `https://generativelanguage.googleapis.com/v1beta/${endpoint}`;
  const upstream = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text(); // Always fetch as text first to avoid parsing errors
  if (!upstream.ok) {
    // On error, try to parse JSON from the error response, if it fails, wrap the plain text
    let err;
    try { 
        err = JSON.parse(text); 
    } catch { 
        err = { error: { message: text || upstream.statusText } }; 
    }
    return new Response(JSON.stringify(err), {
      status: upstream.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  // On success, return the response text, ensuring it's at least an empty JSON object
  return new Response(text || '{}', { status: 200, headers: { 'content-type': 'application/json' } });
}