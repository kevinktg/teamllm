import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireSecret } from "../core/config.js";

export class GeminiProvider {
  constructor() {
    const apiKey = requireSecret("GEMINI_API_KEY");
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }

  async ask(system, user) {
    const prompt = `SYSTEM: ${system}\n\nUSER: ${user}`;
    const result = await this.model.generateContent(prompt);
    const text = result.response.text().trim();
    
    const emotion = text.includes("?") ? "curious" : "neutral";
    const gestures = text.includes("!") ? ["head_nod"] : [];
    
    return { 
      text, 
      meta: { emotion, gestures } 
    };
  }
}