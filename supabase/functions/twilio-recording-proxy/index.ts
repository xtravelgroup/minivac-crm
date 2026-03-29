import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization,content-type,apikey,range",
        "Access-Control-Allow-Methods": "GET,OPTIONS",
      },
    });
  }

  try {
    const url = new URL(req.url);
    const recordingUrl = url.searchParams.get("url");

    if (!recordingUrl || !recordingUrl.includes("api.twilio.com")) {
      return new Response("Missing or invalid recording URL", {
        status: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Fetch from Twilio with Basic Auth — download full buffer
    const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const mp3Url = recordingUrl.endsWith(".mp3") ? recordingUrl : recordingUrl + ".mp3";

    console.log(`Fetching recording: ${mp3Url}`);

    const resp = await fetch(mp3Url, {
      headers: { Authorization: authHeader },
      redirect: "follow",
    });

    console.log(`Twilio response: ${resp.status} ${resp.statusText}, type=${resp.headers.get("Content-Type")}`);

    if (!resp.ok) {
      return new Response("Recording not available: " + resp.status, {
        status: resp.status,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Read full body as ArrayBuffer then return it
    const data = await resp.arrayBuffer();
    console.log(`Recording size: ${data.byteLength} bytes`);

    return new Response(data, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(data.byteLength),
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("Recording proxy error:", e);
    return new Response("Error: " + (e as Error).message, {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
