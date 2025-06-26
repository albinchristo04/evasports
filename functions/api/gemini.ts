// functions/api/gemini.ts
// This file defines a Cloudflare Pages Function that acts as a backend proxy to the Gemini API.

// Minimal type definitions to satisfy the compiler if Cloudflare types aren't fully available.
// In a real Cloudflare Pages project, these are typically provided by the environment.
interface EventContext<Env = any, Params = any, Data = any> {
  request: Request; // Standard Fetch API Request
  env: Env;
  // Add other properties like waitUntil, next, params, data if used by the function
}

type PagesFunction<
  Env = any,
  Params = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (
  context: EventContext<Env, Params, Data>
) => Response | Promise<Response>;


import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

interface Env {
  API_KEY: string; // This will be injected from Cloudflare Pages environment variables
}

interface GeminiRequestBody {
  prompt: string;
  // Add any other parameters you might want to pass, e.g., model, config
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { request, env } = context;

    if (!env.API_KEY) {
      return new Response(JSON.stringify({ error: "API_KEY not configured in server environment." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json() as GeminiRequestBody;
    const prompt = body.prompt;

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required." }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const ai = new GoogleGenAI({ apiKey: env.API_KEY });

    const model = 'gemini-2.5-flash-preview-04-17'; // Or allow model to be passed from client
    
    const geminiResponse: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: prompt,
    });
    
    const text = geminiResponse.text;

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in Gemini API function:", error);
    // Consider more specific error handling based on error type
    const errorMessage = error.message || "An unexpected error occurred.";
    const errorStatus = error.status || 500;
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: errorStatus,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Optional: Handle non-POST requests or serve a simple message for GET
export const onRequestGet: PagesFunction<Env> = async (context) => {
  return new Response("This endpoint expects POST requests to interact with the Gemini API.", {
    status: 405, // Method Not Allowed
    headers: { 'Content-Type': 'text/plain' },
  });
};
