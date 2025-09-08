export async function speakWithRms(
  modelApi: { setMouth:(v:number)=>void },
  audioUrl: string
){
  const audio = new Audio(audioUrl);
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const src = ctx.createMediaElementSource(audio);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  src.connect(analyser); src.connect(ctx.destination);

  const buf = new Uint8Array(analyser.fftSize);
  let raf:number;
  function tick(){
    analyser.getByteTimeDomainData(buf);
    let sum=0; for (let i=0;i<buf.length;i++){ const v=(buf[i]-128)/128; sum+=v*v; }
    const rms = Math.sqrt(sum/buf.length);
    const mouth = Math.min(1, Math.max(0, (rms - 0.02)*8));
    modelApi.setMouth(mouth);
    raf = requestAnimationFrame(tick);
  }
  audio.onplay = () => { ctx.resume(); tick(); };
  audio.onended = () => { cancelAnimationFrame(raf); modelApi.setMouth(0.05); };
  await audio.play();
}


