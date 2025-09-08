import { GoogleGenerativeAI } from "@google/generative-ai";
import fetch from "node-fetch";
import { getSecret, requireSecret } from "./config.js";

export function getGenAI() {
  const apiKey = requireSecret("GEMINI_API_KEY");
  return new GoogleGenerativeAI(apiKey);
}

export async function generateImageBuffer({ prompt, model = "gemini-2.5-flash-image-preview" }) {
  const genai = getGenAI();
  const client = genai.getGenerativeModel({ model });
  const res = await client.generateContent(prompt);
  const parts = res.response.candidates?.[0]?.content?.parts || [];
  const imgPart = parts.find(p => p.inline_data && p.inline_data.data);
  if (!imgPart) throw new Error("No image data returned");
  const b64 = imgPart.inline_data.data;
  return Buffer.from(b64, "base64");
}


