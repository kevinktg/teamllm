import { routeTurn } from "./orchestrator.js";
import { getPersona } from "./personaManager.js";
import { getByEmotion } from "./emoteTable.js";

export async function runAgent({ personaId, emotion, provider = "gemini", text = "", nano = false }) {
	const persona = getPersona(personaId);
	if (!persona) throw new Error("Persona not found");
	const em = getByEmotion(emotion);
	if (!em) throw new Error("Emotion not found");

	const turn = await routeTurn({ speaker: personaId, provider, text, emotion });
	const voice = em.voice_overrides?.voice || persona.defaultVoice || "Rachel";
	let ssml;
	if (em.voice_overrides?.ssml_template) {
		ssml = String(em.voice_overrides.ssml_template).replace("${text}", turn?.text ?? "");
	}

	return {
		text: turn?.text ?? "",
		ssml,
		voice,
		meta: { personaId, emotion, provider, nanoRequested: !!nano },
	};
}
