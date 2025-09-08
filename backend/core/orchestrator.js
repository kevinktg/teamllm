import { getByEmotion } from "./emoteTable.js";
import { getPersona } from "./personaManager.js";

const providers = {};
const personas = {};

async function getProvider(providerName) {
  if (!providers[providerName]) {
    const providerClassName = providerName === 'openai' ? 'OpenAIProvider' : `${capitalize(providerName)}Provider`;
    const { [providerClassName]: Provider } = await import(`../providers/${providerName}.js`);
    providers[providerName] = new Provider();
  }
  return providers[providerName];
}

function getPersonaPrompt(personaName) {
  const persona = getPersona(personaName);
  if (!persona) return null;
  
  // Build system prompt from persona data
  const { name, backstory, speaking_style, boundaries } = persona;
  
  let prompt = `You are ${name}, ${backstory}\n\n`;
  
  if (speaking_style) {
    prompt += `SPEAKING STYLE:\n`;
    if (speaking_style.lexical) {
      prompt += `- Use terminology like: ${speaking_style.lexical.join(', ')}\n`;
    }
    if (speaking_style.formality) {
      prompt += `- Formality level: ${speaking_style.formality}\n`;
    }
    if (speaking_style.humor) {
      prompt += `- Humor style: ${speaking_style.humor}\n`;
    }
    if (speaking_style.pace) {
      prompt += `- Speaking pace: ${speaking_style.pace}\n`;
    }
    prompt += '\n';
  }
  
  if (boundaries && boundaries.length > 0) {
    prompt += `BOUNDARIES:\n`;
    boundaries.forEach(boundary => prompt += `- ${boundary}\n`);
    prompt += '\n';
  }
  
  prompt += `Stay in character as ${name} at all times.`;
  
  return prompt;
}

export async function routeTurn(requestBody) {
  const {
    speaker = 'bricks',
    provider = 'gemini',
    text = '',
    emotion,
  } = requestBody;

  const llmProvider = await getProvider(provider);

  const systemPrompt = getPersonaPrompt(speaker) || `You are ${speaker}, a helpful AI assistant.`;

  const emotional = emotion ? getByEmotion(emotion) : null;
  const emotionBlock = emotional ? `\n\nDirection: ${emotional.direction}\n${emotional.emote_prompt}\n${emotional.reiteration_prompt}` : '';

  const response = await llmProvider.ask(systemPrompt + emotionBlock, text);

  return { ...response, providerInfo: { name: provider, latencyMs: 0 } };
}

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);