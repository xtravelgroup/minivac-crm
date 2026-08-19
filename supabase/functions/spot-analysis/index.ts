import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const SB_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const DEEPGRAM_KEY = Deno.env.get("DEEPGRAM_API_KEY") || "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey,x-client-info",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const SB_HDR = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" };

const SPOT_SCORING_PROMPT = `Eres un experto en produccion y analisis de comerciales de radio para clubes vacacionales (mini-vacs).
Tu trabajo es analizar la transcripcion de un comercial de radio y evaluar su calidad, estructura y efectividad.

CONTEXTO:
- MiniVac vende paquetes vacacionales por telefono al mercado latino en USA
- Los comerciales de radio buscan generar llamadas entrantes al call center
- El oyente debe sentirse motivado a llamar AHORA, no "despues"
- Los spots son de 30 o 60 segundos

ESTRUCTURA IDEAL DE UN COMERCIAL DE RADIO (60seg):

1. GANCHO / HOOK (primeros 5 seg, max 15 pts)
   - Abre con algo que detenga al oyente (pregunta, exclamacion, urgencia)
   - Conecta emocionalmente con el deseo de vacaciones
   - NO abre con el nombre de la empresa

2. OFERTA / PROPUESTA DE VALOR (15 seg, max 20 pts)
   - Describe el paquete: Orlando, resort 5 estrellas, 4 noches, 4 personas
   - Menciona destino adicional si aplica
   - Valor percibido alto: "valorado en mas de $3,000"
   - Incluye extras: desayuno, tarjeta regalo, etc.

3. URGENCIA / ESCASEZ (10 seg, max 15 pts)
   - "Solo esta semana", "ultimas X plazas", "oferta por tiempo limitado"
   - Razon creible para la urgencia
   - NO suena falso o exagerado

4. CALL TO ACTION (10 seg, max 20 pts)
   - Numero de telefono claro y repetido
   - "Llama AHORA al..."
   - Dice el numero al menos 2 veces
   - Instruccion simple y directa

5. PRODUCCION / TALENTO (global, max 15 pts)
   - Voz clara, energetica, confiable
   - Ritmo adecuado (no muy rapido, no muy lento)
   - Enfasis en palabras clave (gratis, vacaciones, resort)
   - Tono: entusiasta pero creible, no "vendedor de feria"

6. PERSUASION / PSICOLOGIA (global, max 15 pts)
   - Usa lenguaje sensorial (imaginate, siente, disfruta)
   - Crea imagen mental del destino
   - Social proof si aplica ("miles de familias")
   - Elimina fricciones ("sin compromiso", "sin costo")

RESPONDE EXCLUSIVAMENTE en JSON valido:
{
  "puntaje_total": <0-100>,
  "categorias": {
    "gancho": { "puntaje": <0-15>, "observacion": "string" },
    "oferta": { "puntaje": <0-20>, "observacion": "string" },
    "urgencia": { "puntaje": <0-15>, "observacion": "string" },
    "cta": { "puntaje": <0-20>, "observacion": "string" },
    "produccion": { "puntaje": <0-15>, "observacion": "string" },
    "persuasion": { "puntaje": <0-15>, "observacion": "string" }
  },
  "resumen": "2-3 oraciones resumen del comercial",
  "fortalezas": ["string", "string"],
  "areas_mejora": ["string", "string"],
  "estructura_detectada": "string describiendo la estructura que uso el talento",
  "frases_clave": ["frase efectiva 1", "frase efectiva 2"],
  "frases_debiles": ["frase que podria mejorar 1"],
  "sugerencia_mejora": "parrafo con sugerencia concreta para mejorar el spot",
  "comparacion_ideal": "que tan cerca esta del spot ideal (1-10) y por que"
}

IMPORTANTE: Todo en espanol. Se especifico citando frases de la transcripcion.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const body = await req.json();
    const { spot_id, recording_url } = body;

    if (!spot_id) {
      return new Response(JSON.stringify({ error: "spot_id requerido" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 1. Check if already analyzed
    const spotRes = await fetch(
      `${SB_URL}/rest/v1/radio_spots?id=eq.${spot_id}&select=*`,
      { headers: SB_HDR }
    );
    const spots = await spotRes.json();
    if (!Array.isArray(spots) || spots.length === 0) {
      return new Response(JSON.stringify({ error: "Spot no encontrado" }), {
        status: 404, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const spot = spots[0];

    // If already analyzed and no new recording, return existing
    if (spot.spot_analysis && !recording_url) {
      return new Response(JSON.stringify({
        transcript: spot.transcript,
        analysis: spot.spot_analysis,
        score: spot.spot_score,
      }), { headers: { ...CORS, "Content-Type": "application/json" } });
    }

    const recUrl = recording_url || spot.recording_url;
    if (!recUrl) {
      return new Response(JSON.stringify({ error: "No hay grabacion para analizar" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // 2. Download recording
    console.log(`[spot-analysis] Downloading: ${recUrl}`);
    const audioRes = await fetch(recUrl, { redirect: "follow" });
    if (!audioRes.ok) {
      return new Response(JSON.stringify({ error: "No se pudo descargar la grabacion: " + audioRes.status }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    const audioBuffer = await audioRes.arrayBuffer();
    console.log(`[spot-analysis] Audio: ${audioBuffer.byteLength} bytes`);

    // 3. Transcribe with Deepgram
    if (!DEEPGRAM_KEY) {
      return new Response(JSON.stringify({ error: "DEEPGRAM_API_KEY no configurado" }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const contentType = recUrl.includes(".wav") ? "audio/wav" : recUrl.includes(".ogg") ? "audio/ogg" : "audio/mp3";

    console.log(`[spot-analysis] Transcribing with Deepgram...`);
    const dgRes = await fetch(
      "https://api.deepgram.com/v1/listen?language=es&model=nova-2&smart_format=true&punctuate=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${DEEPGRAM_KEY}`,
          "Content-Type": contentType,
        },
        body: new Uint8Array(audioBuffer),
      }
    );

    if (!dgRes.ok) {
      const dgErr = await dgRes.text();
      console.error(`[spot-analysis] Deepgram error: ${dgErr}`);
      return new Response(JSON.stringify({ error: "Error en transcripcion: " + dgRes.status }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const dgData = await dgRes.json();
    const transcript = dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (!transcript || transcript.trim().length < 10) {
      return new Response(JSON.stringify({ error: "No se pudo transcribir (audio muy corto o silencioso)" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }
    console.log(`[spot-analysis] Transcript: ${transcript.length} chars`);

    // 4. Get emisora info for context
    let emisoraNombre = "Desconocida";
    if (spot.emisora_id) {
      const emRes = await fetch(
        `${SB_URL}/rest/v1/emisoras?id=eq.${spot.emisora_id}&select=nombre,frecuencia,ciudad`,
        { headers: SB_HDR }
      );
      const ems = await emRes.json();
      if (Array.isArray(ems) && ems.length > 0) {
        emisoraNombre = `${ems[0].nombre} (${ems[0].frecuencia} - ${ems[0].ciudad})`;
      }
    }

    // 5. Analyze with Claude
    const userPrompt = `Analiza el siguiente comercial de radio de MiniVac.

DATOS DEL SPOT:
- Emisora: ${emisoraNombre}
- Tipo: ${spot.tipo || "60seg"}
- Fecha: ${spot.fecha || "N/A"}
- Hora de transmision: ${spot.hora || "N/A"}
- Costo: $${spot.costo || 0}

TRANSCRIPCION DEL COMERCIAL:
${transcript}

Evalua este comercial segun los 6 criterios de calidad.`;

    console.log(`[spot-analysis] Analyzing with Claude...`);
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: SPOT_SCORING_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeRes.ok) {
      const err = await claudeRes.text();
      console.error(`[spot-analysis] Claude error: ${err}`);
      return new Response(JSON.stringify({ error: "Error en analisis AI: " + claudeRes.status }), {
        status: 500, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const claudeData = await claudeRes.json();
    const analysisText = claudeData.content?.[0]?.text || "";

    let analysis: any;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: analysisText };
    } catch {
      console.error(`[spot-analysis] Failed to parse Claude JSON`);
      analysis = { raw: analysisText };
    }

    const score = analysis.puntaje_total || 0;
    console.log(`[spot-analysis] Score: ${score}`);

    // 6. Save to radio_spots
    const saveRes = await fetch(
      `${SB_URL}/rest/v1/radio_spots?id=eq.${spot_id}`,
      {
        method: "PATCH",
        headers: { ...SB_HDR, Prefer: "return=representation" },
        body: JSON.stringify({
          recording_url: recUrl,
          transcript,
          spot_analysis: analysis,
          spot_score: score,
        }),
      }
    );

    if (!saveRes.ok) {
      const saveErr = await saveRes.text();
      console.error(`[spot-analysis] Save error: ${saveErr}`);
    }

    return new Response(JSON.stringify({
      transcript,
      analysis,
      score,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (e) {
    console.error(`[spot-analysis] Error:`, e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Error interno" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
