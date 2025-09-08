import Anthropic from "@anthropic-ai/sdk";
import { requireSecret } from "../core/config.js";

export class ClaudeProvider {
  constructor() {
    const apiKey = requireSecret("ANTHROPIC_API_KEY");
    this.claude = new Anthropic({ apiKey });
  }

  async ask(system, user) {
    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 200,
      system,
      messages: [{ role: "user", content: user }],
    });
    
    const text = response.content?.[0]?.text?.trim() ?? "Hello from Claude.";
    const emotion = text.includes("Of course") ? "confident" : "thoughtful";
    const gestures = ["lean_in"];
    
    return { 
      text, 
      meta: { emotion, gestures } 
    };
  }
}