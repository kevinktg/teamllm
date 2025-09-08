import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display";

// @ts-ignore
window.PIXI = PIXI;

export type Avatar2DRef = {
  setMouth: (v:number)=>void;
  applyEmotion: (name:string, strength?:number)=>void;
  playMotion?: (group:string, index:number)=>void;
  modelReady: ()=>boolean;
};

const Avatar2D = forwardRef<Avatar2DRef, { modelPath?: string }>(
({ modelPath = "/models/aria/aria.model3.json" }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<PIXI.Application>();
  const modelRef = useRef<any>();

  useEffect(() => {
    const app = new PIXI.Application({
      view: canvasRef.current!,
      backgroundAlpha: 0,
      resizeTo: (canvasRef.current!.parentElement as any)
    });
    appRef.current = app;

    (async () => {
      const model = await Live2DModel.from(modelPath);
      modelRef.current = model;
      model.anchor.set(0.5, 0.5);
      model.x = app.renderer.width / 2;
      model.y = app.renderer.height * 0.9;
      model.scale.set(0.5);
      app.stage.addChild(model);
    })();

    return () => app.destroy(true);
  }, [modelPath]);

  useImperativeHandle(ref, () => ({
    setMouth(v:number) {
      const core = modelRef.current?.internalModel?.coreModel;
      if (!core) return;
      core.setParameterValueById("ParamMouthOpenY", Math.max(0, Math.min(1, v)));
    },
    applyEmotion(name:string, strength:number=0.7) {
      const exp = modelRef.current?.internalModel?.settings?.expressions?.find((e:any)=>e.name?.toLowerCase()===name.toLowerCase());
      if (exp && modelRef.current.expressionManager) {
        modelRef.current.expressionManager.setExpression(exp);
        return;
      }
      const core = modelRef.current?.internalModel?.coreModel;
      if (!core) return;
      if (name==="happy"||name==="excited") core.setParameterValueById("ParamCheek", strength);
      if (name==="sad"||name==="concerned") core.setParameterValueById("ParamEyeLOpen", 0.4);
    },
    playMotion(group:string, index:number) {
      modelRef.current?.motion(group, index, 0);
    },
    modelReady(){ return !!modelRef.current; }
  }));

  return <canvas ref={canvasRef} style={{ width: "100%", height: 520 }} />;
});

export default Avatar2D;


