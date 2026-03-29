import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";

// Simple in-memory cache to avoid re-fetching from Twilio on range requests
const cache = new Map<string, Uint8Array>();

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

    const mp3Url = recordingUrl.endsWith(".mp3") ? recordingUrl : recordingUrl + ".mp3";

    // Get or fetch the full audio data
    let data: Uint8Array;
    if (cache.has(mp3Url)) {
      data = cache.get(mp3Url)!;
    } else {
      const authHeader = "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
      console.log(`Fetching recording: ${mp3Url}`);
      const resp = await fetch(mp3Url, {
        headers: { Authorization: authHeader },
        redirect: "follow",
      });
      if (!resp.ok) {
        return new Response("Recording not available: " + resp.status, {
          status: resp.status,
          headers: { "Access-Control-Allow-Origin": "*" },
        });
      }
      const buf = await resp.arrayBuffer();
      data = new Uint8Array(buf);
      // Cache for subsequent range requests (keep max 50 entries)
      if (cache.size > 50) cache.clear();
      cache.set(mp3Url, data);
      console.log(`Recording cached: ${data.byteLength} bytes`);
    }

    const total = data.byteLength;
    const rangeHeader = req.headers.get("Range");

    // Handle range request (browser seeks or requests partial content)
    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (match) {
        const start = parseInt(match[1], 10);
        const end = match[2] ? parseInt(match[2], 10) : total - 1;
        const chunk = data.slice(start, end + 1);

        return new Response(chunk, {
          status: 206,
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(chunk.byteLength),
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    // Full response
    return new Response(data, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
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
