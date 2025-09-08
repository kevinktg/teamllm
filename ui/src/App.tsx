import { useRef, useState } from "react";
import Avatar2D, { type Avatar2DRef } from "./Avatar2D";
import { chat, tts } from "./api";
import { speakWithRms } from "./live2d";

export default function App(){
  const ref = useRef<Avatar2DRef>(null);
  const [input, setInput] = useState("Give me the 10s demo opener.");
  const [busy, setBusy] = useState(false);

  async function handleSpeak(){
    try{
      setBusy(true);
      const { text, meta } = await chat("aria", "gemini", input);
      if (meta?.emotion && ref.current?.applyEmotion) {
        ref.current.applyEmotion(meta.emotion, 0.7);
      }
      const audioUrl = await tts(text, "Rachel");
      await speakWithRms(ref.current!, audioUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: "24px auto", padding: 16 }}>
      <h3>TEAM LLM — ARIA (Live2D)</h3>
      <Avatar2D ref={ref} modelPath="/models/aria/aria.model3.json" />
      <div style={{ display:"flex", gap:8, marginTop:12 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} style={{ flex:1, padding:8 }} disabled={busy}/>
        <button onClick={handleSpeak} disabled={busy}>{busy?"Speaking…":"Speak"}</button>
      </div>
    </div>
  );
}


