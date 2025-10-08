// Vercel Edge Functions
// https://vercel.com/docs/functions/edge-functions

export const config = {
  runtime: 'edge',
};

// This is the API proxy.
// It takes the request from the browser, adds the secret API key,
// and forwards it to the Google AI API.
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }
  
  try {
    const { endpoint, payload } = await request.json();

    if (!process.env.API_KEY) {
      return new Response(JSON.stringify({ error: { message: 'API key is not configured on the server.' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Construct the correct Google AI API URL
    const GOOGLE_AI_API_URL = `https://generativelanguage.googleapis.com/v1beta/${endpoint}?key=${process.env.API_KEY}`;
    
    const response = await fetch(GOOGLE_AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google AI API Error:', errorText);
        let errorJson;
        try {
            errorJson = JSON.parse(errorText);
        } catch (e) {
            errorJson = { error: { message: errorText } };
        }
        return new Response(JSON.stringify(errorJson), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Proxy Error:', error);
    return new Response(JSON.stringify({ error: { message: error instanceof Error ? error.message : 'Internal Server Error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
