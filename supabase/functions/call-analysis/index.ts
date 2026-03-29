import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID") || "";
const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN") || "";
const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY") || "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const SB_HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

// ── Scoring rubric based on Guion Maestro de Ventas (7 Etapas) ──
const SCORING_PROMPT = `Eres un analista experto en ventas de MiniVac (club vacacional). Tu trabajo es evaluar llamadas de venta basandote en el Guion Maestro de Ventas de 7 Etapas.

CONTEXTO DE LA EMPRESA:
- MiniVac vende paquetes vacacionales (Orlando + segundo destino) por telefono
- Los leads vienen de anuncios de radio en mercado latino USA
- Los leads creen haber ganado un premio — el vendedor debe reencuadrar esa expectativa
- Duracion ideal de llamada: 8-12 minutos
- Objetivo de cierre: 30%

LAS 7 ETAPAS DEL GUION Y SU EVALUACION:

1. APERTURA (30 seg, max 10 pts)
   - Se identifica correctamente (X Travel Group)
   - Menciona la emisora de radio
   - Dice "seleccionado para una oferta exclusiva" (NO "gano un premio")
   - Pide permiso para los 8 minutos
   - Tono: energetico pero profesional, calidez sin euforia

2. PIVOT DE EXPECTATIVA (1 min, max 10 pts) — ETAPA MAS CRITICA
   - Reencuadra PROACTIVAMENTE antes de que el cliente pregunte "es gratis?"
   - Dice "quiero ser completamente transparente"
   - Explica: "no es un sorteo ni una rifa — es mejor que eso"
   - Presenta la condicion del tour de 90 min como algo justo y transparente
   - Si el cliente dice "pense que era gratis", maneja bien la objecion

3. CALIFICACION DEL PROSPECTO (2 min, max 10 pts)
   - Pregunta edad (25-65)
   - Pregunta estado civil (casado/pareja)
   - Pregunta ingresos ($40K+)
   - Pregunta tarjeta de credito/debito
   - Hace la "pregunta de oro": ultima vez que tomaron vacaciones de verdad
   - Escucha activamente y anota detalles (hijos, destino deseado)

4. PRESENTACION DEL PAQUETE (2-3 min, max 10 pts)
   - Conecta con lo que el cliente dijo en calificacion
   - Menciona: 4 noches Orlando, resort 5 estrellas, 4 personas
   - Menciona desayuno + tarjeta regalo $100 o Aquatica
   - Menciona segundo destino a elegir
   - Presenta el tour como ventaja, no como trampa
   - Usa el ancla de valor: "valor comercial de mas de $3,000"

5. PRESENTACION DEL PRECIO (1 min, max 10 pts)
   - Usa la tecnica del sandwich: ancla alto → precio → justificacion
   - Primero desglosa el valor ($200/noche hotel, etc)
   - Presenta el precio con confianza (sin decir "SOLO $X")
   - Despues del precio, CALLA (silencio de al menos 4 segundos)
   - Cierra con "como prefiere hacer el pago, credito o debito?"

6. MANEJO DE OBJECIONES (variable, max 10 pts)
   - Sigue el patron: Validar → Reencuadrar → Avanzar
   - No se pone defensivo ni agresivo
   - Maneja bien las objeciones comunes (gratis, caro, pareja, timeshare, pensarlo)
   - Identifica la objecion real detras de excusas
   - Ofrece alternativas (deposito parcial, conferencia con pareja)

7. CIERRE Y CONFIRMACION (2 min, max 10 pts)
   - Recopila datos en orden correcto (nombre, direccion, correo, licencia, tarjeta)
   - Lee confirmacion de lo que queda incluido
   - Cierra con energia positiva
   - NO dice "cualquier duda me llama" (eso abre la puerta al arrepentimiento)
   - Menciona hijos/familia si aplica para refuerzo emocional

RESPONDE EXCLUSIVAMENTE en JSON valido con esta estructura exacta:
{
  "puntaje_total": <0-100>,
  "etapas": {
    "apertura": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "pivot": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "calificacion": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "presentacion_paquete": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "presentacion_precio": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "manejo_objeciones": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" },
    "cierre": { "puntaje": <0-10>, "observacion": "<que hizo bien o mal>" }
  },
  "resumen": "<resumen de 2-3 oraciones de la llamada>",
  "resultado_llamada": "<venta|no_venta|callback|no_califica|colgó>",
  "recomendaciones": ["<recomendacion 1>", "<recomendacion 2>", "<recomendacion 3>"],
  "fortalezas": ["<fortaleza 1>", "<fortaleza 2>"],
  "areas_mejora": ["<area 1>", "<area 2>"],
  "tono_general": "<profesional|demasiado_emocionado|frio|agresivo|inseguro|ideal>",
  "duracion_efectiva": "<buena|muy_corta|muy_larga>",
  "analisis_supervisor": "<parrafo detallado para el supervisor con insights sobre el rendimiento del vendedor, patrones detectados, y sugerencias de coaching>"
}

IMPORTANTE:
- Evalua SOLO las etapas que se alcanzaron en la llamada. Si la llamada se corto en la etapa 3, las etapas 4-7 reciben 0 puntos pero indica "No se alcanzo esta etapa" en la observacion.
- El puntaje_total es la suma de las 7 etapas convertida a escala de 100 (suma/70*100, redondeado).
- Se especifico y da ejemplos textuales de la transcripcion cuando sea posible.
- Todo en espanol.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { call_id } = await req.json();
    if (!call_id) {
      return new Response(JSON.stringify({ error: "call_id requerido" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1. Check if already analyzed
    const existRes = await fetch(
      `${SB_URL}/rest/v1/call_analysis?call_log_id=eq.${call_id}&select=*`,
      { headers: SB_HDR }
    );
    const existing = await existRes.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify(existing[0]), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch call_log record
    const callRes = await fetch(
      `${SB_URL}/rest/v1/call_log?id=eq.${call_id}&select=*`,
      { headers: SB_HDR }
    );
    const calls = await callRes.json();
    if (!Array.isArray(calls) || calls.length === 0) {
      return new Response(JSON.stringify({ error: "Llamada no encontrada" }), {
        status: 404,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const call = calls[0];

    if (!call.recording_url) {
      return new Response(JSON.stringify({ error: "Esta llamada no tiene grabacion" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 3. Download recording from Twilio
    let recUrl = call.recording_url;
    if (!recUrl.endsWith(".mp3")) recUrl += ".mp3";
    console.log(`[call-analysis] Downloading recording: ${recUrl}`);

    const audioRes = await fetch(recUrl, {
      headers: { Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}` },
      redirect: "follow",
    });
    if (!audioRes.ok) {
      return new Response(JSON.stringify({ error: "No se pudo descargar la grabacion: " + audioRes.status }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const audioBuffer = await audioRes.arrayBuffer();
    console.log(`[call-analysis] Audio downloaded: ${audioBuffer.byteLength} bytes`);

    // 4. Transcribe with Deepgram (Spanish, Nova-2, with diarization)
    if (!DEEPGRAM_KEY) {
      return new Response(JSON.stringify({ error: "DEEPGRAM_API_KEY no configurado" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    console.log(`[call-analysis] Sending to Deepgram for transcription...`);
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?language=es&model=nova-2&smart_format=true&diarize=true&punctuate=true&utterances=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_KEY}`,
          "Content-Type": "audio/mp3",
        },
        body: new Uint8Array(audioBuffer),
      }
    );

    if (!dgRes.ok) {
      const dgErr = await dgRes.text();
      console.error(`[call-analysis] Deepgram error: ${dgErr}`);
      return new Response(JSON.stringify({ error: "Error en transcripcion: " + dgRes.status }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const dgData = await dgRes.json();

    // Build transcript with speaker labels from utterances
    let transcript = "";
    const utterances = dgData.results?.utterances;
    if (utterances && utterances.length > 0) {
      transcript = utterances
        .map((u: any) => `[Speaker ${u.speaker}]: ${u.transcript}`)
        .join("\n");
    } else {
      // Fallback to basic transcript
      transcript = dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
    }

    if (!transcript || transcript.trim().length < 20) {
      return new Response(JSON.stringify({ error: "No se pudo transcribir la grabacion (audio muy corto o silencioso)" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    console.log(`[call-analysis] Transcript length: ${transcript.length} chars`);

    // 5. Fetch agent name for context
    let agentName = "Desconocido";
    if (call.agent_id) {
      const agentRes = await fetch(
        `${SB_URL}/rest/v1/usuarios?id=eq.${call.agent_id}&select=nombre`,
        { headers: SB_HDR }
      );
      const agents = await agentRes.json();
      if (Array.isArray(agents) && agents.length > 0) agentName = agents[0].nombre;
    }

    // 6. Analyze with Claude
    const userPrompt = `Analiza la siguiente llamada de venta de MiniVac.

DATOS DE LA LLAMADA:
- Vendedor: ${agentName}
- Direccion: ${call.direction === "inbound" ? "Entrante" : "Saliente"}
- Duracion: ${call.duration_secs ? Math.floor(call.duration_secs / 60) + " min " + (call.duration_secs % 60) + " seg" : "N/A"}
- Cola: ${call.queue || "ventas"}
- Estado final: ${call.status}

TRANSCRIPCION:
${transcript}

Evalua esta llamada segun las 7 etapas del Guion Maestro de Ventas.`;

    console.log(`[call-analysis] Sending to Claude for analysis...`);
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: SCORING_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error(`[call-analysis] Claude error: ${err}`);
      return new Response(JSON.stringify({ error: "Error en analisis AI: " + claudeRes.status }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeRes.json();
    const analysisText = claudeData.content?.[0]?.text || "";

    // Parse JSON from Claude response
    let analysis: any;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: analysisText };
    } catch {
      console.error(`[call-analysis] Failed to parse Claude JSON, storing raw`);
      analysis = { raw: analysisText };
    }

    console.log(`[call-analysis] Analysis complete. Score: ${analysis.puntaje_total || "N/A"}`);

    // 7. Save to call_analysis table
    const saveRes = await fetch(`${SB_URL}/rest/v1/call_analysis`, {
      method: "POST",
      headers: { ...SB_HDR, Prefer: "return=representation" },
      body: JSON.stringify({
        call_log_id: call_id,
        transcript,
        analysis,
      }),
    });

    if (!saveRes.ok) {
      const saveErr = await saveRes.text();
      console.error(`[call-analysis] Save error: ${saveErr}`);
      // Return analysis even if save fails
      return new Response(JSON.stringify({ call_log_id: call_id, transcript, analysis }), {
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const saved = await saveRes.json();
    return new Response(JSON.stringify(saved[0] || { call_log_id: call_id, transcript, analysis }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`[call-analysis] Error:`, e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
