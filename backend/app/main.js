import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { routeTurn } from "../core/orchestrator.js";
import { getSecret, warnIfMissing } from "../core/config.js";
import { classifyImageFromUrl, decideAssetType, createSignedUploadUrl } from "../core/gcp.js";
import { uploadBufferToAssets } from "../core/gcp.js";
import { generateImageBuffer } from "../core/nano.js";
import { getPersona, reloadPersonas } from "../core/personaManager.js";
import { getByEmotion, reloadEmotions } from "../core/emoteTable.js";
import { runAgent } from "../core/agent.js";

const app = express();
app.use(cors());
app.use(express.json());

warnIfMissing([
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "ELEVEN_API_KEY",
  // Google Cloud
  "GOOGLE_CLOUD_PROJECT_ID",
  "GOOGLE_CLOUD_KEY_FILE",
  "GCS_ASSETS_BUCKET",
  "GCS_UPLOADS_BUCKET"
]);
const ELEVEN_API_KEY = getSecret("ELEVEN_API_KEY");

app.get("/health", (_, res) => res.json({ ok: true, message: "Wrapper is running" }));

app.post("/chat", async (req, res) => {
  try {
    const response = await routeTurn(req.body);
    res.json(response);
  } catch (error) {
    console.error("Error in /chat endpoint:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/normalize-asset", async (req, res) => {
  try {
    const { fileUrl, desiredRig = "live2d" } = req.body || {};
    if (!fileUrl) return res.status(400).json({ error: "Missing 'fileUrl'" });

    const analysis = await classifyImageFromUrl(fileUrl);
    const assetType = decideAssetType(analysis);

    const id = `norm_${Date.now()}`;
    const previewPng = fileUrl; // For MVP, use original as preview
    const normalized = {
      id,
      type: desiredRig,
      previewPng,
      meta: {
        assetType,
        provenance: "user-upload",
      },
    };

    return res.json({
      assetId: id,
      assetType,
      policy: { routedToToonify: false, consentRequired: false },
      normalized,
    });
  } catch (error) {
    console.error("Error in /normalize-asset endpoint:", error);
    res.status(500).json({ error: "Failed to normalize asset" });
  }
});

app.post("/upload-url", async (req, res) => {
  try {
    const { contentType = "image/png", ext = "png" } = req.body || {};
    const link = await createSignedUploadUrl({ contentType, ext });
    res.json(link);
  } catch (error) {
    console.error("Error in /upload-url:", error);
    res.status(500).json({ error: "Failed to create upload URL" });
  }
});

app.post("/tts", async (req, res) => {
  const { text, voice = "Rachel" } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Missing 'text' in request body" });
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2" }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API Error:", errorText);
      return res.status(response.status).send(errorText);
    }

    const audioBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error("Error in /tts endpoint:", error);
    res.status(500).json({ error: "Failed to process TTS request" });
  }
});

app.post("/emote", async (req, res) => {
  try {
    const { personaId, emotion, normalizedAssetId, intensity = 0.7, provider = "gemini" } = req.body || {};
    if (!personaId || !emotion) {
      return res.status(400).json({ error: "Missing 'personaId' or 'emotion'" });
    }

    const persona = getPersona(personaId);
    if (!persona) return res.status(404).json({ error: "Persona not found" });
    const emoteCfg = getByEmotion(emotion);
    if (!emoteCfg) return res.status(404).json({ error: "Emotion not found" });

    // Generate text via orchestrator
    const turn = await routeTurn({ speaker: personaId, provider, text: "", emotion });
    const text = turn?.text ?? "";

    // Voice and SSML
    const voice = emoteCfg.voice_overrides?.voice || persona.defaultVoice || "Rachel";
    let ssml;
    const tpl = emoteCfg.voice_overrides?.ssml_template;
    if (tpl) {
      ssml = String(tpl).replace("${text}", text);
    }

    return res.json({
      text,
      ssml,
      voice,
      visemes: [],
      enhancedVisualUrl: undefined,
      meta: {
        emotion,
        personaId,
        intensity,
        nanoEnhanced: false,
        source: "yaml+persona",
      },
    });
  } catch (error) {
    console.error("Error in /emote endpoint:", error);
    res.status(500).json({ error: "Failed to generate emote" });
  }
});

app.post("/reload-configurations", async (_req, res) => {
  try {
    const p = reloadPersonas();
    const e = reloadEmotions();
    res.json({ ok: true, emotionsLoaded: e.size, personasLoaded: p.size, configFormat: "yaml" });
  } catch (error) {
    console.error("Error in /reload-configurations:", error);
    res.status(500).json({ ok: false, error: "Failed to reload configurations" });
  }
});

app.post("/nano-edit", async (req, res) => {
  try {
    const { nanoPrompt, outputSize = "1024x1024", model = "gemini-2.5-flash-image-preview" } = req.body || {};
    if (!nanoPrompt) return res.status(400).json({ error: "Missing 'nanoPrompt'" });

    const buffer = await generateImageBuffer({ prompt: nanoPrompt, model });
    const fileName = `nano/${Date.now()}.png`;
    const uploaded = await uploadBufferToAssets({ buffer, contentType: "image/png", destPath: fileName });
    res.json({ enhancedImageUrl: uploaded.publicUrl, taskType: "Intelligent Style Transfer", processingTime: 0 });
  } catch (error) {
    console.error("Error in /nano-edit:", error);
    res.status(500).json({ error: "Failed to enhance image" });
  }
});

app.post("/agent", async (req, res) => {
  try {
    const result = await runAgent(req.body || {});
    res.json(result);
  } catch (error) {
    console.error("Error in /agent:", error);
    res.status(400).json({ error: error.message || "Agent failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`GoodAI Wrapper Backend listening on port ${PORT}`);
});