const API = (import.meta as any).env.VITE_API_URL as string | undefined;

export async function chat(speaker:string, provider:string, text:string){
  if (!API) throw new Error("Missing VITE_API_URL");
  const r = await fetch(`${API}/chat`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ speaker, provider, text })
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ text:string; meta?:{emotion?:string; gestures?:string[]} }>;
}

export async function tts(text:string, voice="Rachel"){
  if (!API) throw new Error("Missing VITE_API_URL");
  const r = await fetch(`${API}/tts`, {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ text, voice })
  });
  if (!r.ok) throw new Error(await r.text());
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}


