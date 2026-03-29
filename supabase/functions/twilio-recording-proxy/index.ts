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
      return new Response("Missing or invalid recording URL", { status: 400 });
    }

    // Fetch from Twilio with Basic Auth
    const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const mp3Url = recordingUrl.endsWith(".mp3") ? recordingUrl : recordingUrl + ".mp3";

    const resp = await fetch(mp3Url, {
      headers: { Authorization: authHeader },
    });

    if (!resp.ok) {
      console.error(`Twilio fetch failed: ${resp.status} ${resp.statusText}`);
      return new Response("Recording not available", { status: resp.status });
    }

    const body = resp.body;
    const contentType = resp.headers.get("Content-Type") || "audio/mpeg";
    const contentLength = resp.headers.get("Content-Length") || "";

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": contentLength,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("Recording proxy error:", e);
    return new Response("Error fetching recording", { status: 500 });
  }
});
