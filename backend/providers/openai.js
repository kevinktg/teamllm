import OpenAI from "openai";
import { requireSecret } from "../core/config.js";

export class OpenAIProvider {
  constructor() {
    const apiKey = requireSecret("OPENAI_API_KEY");
    this.openai = new OpenAI({ apiKey });
  }

  async ask(system, user) {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    
    const text = response.choices[0].message.content.trim();
    const emotion = "witty";
    const gestures = ["head_tilt"];
    
    return { 
      text, 
      meta: { emotion, gestures } 
    };
  }
}