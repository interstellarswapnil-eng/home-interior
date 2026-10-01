/**
 * "Photo-quality still": path-traces the current view (three-gpu-pathtracer) with the same materials, sky and lights,
 * then hands back a PNG. While it runs it takes over rendering (useFrame priority 1); unmounting returns to normal.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { WebGLPathTracer } from "three-gpu-pathtracer";

export function PhotoStill({ samples, onProgress, onDone }: { samples: number; onProgress?: (f: number) => void; onDone?: (url: string | null) => void }) {
  const { gl, scene, camera } = useThree();
  // callbacks change on every app render; keep the latest in refs so the path tracer is built only once
  const cb = useRef({ onProgress, onDone });
  cb.current = { onProgress, onDone };
  const pt = useMemo(() => {
    const p = new WebGLPathTracer(gl);
    p.tiles.set(2, 2);
    p.renderDelay = 0;
    p.minSamples = 0;
    p.fadeDuration = 0;
    p.bounces = 6;
    p.transmissiveBounces = 4;
    p.filterGlossyFactor = 0.5;
    p.dynamicLowRes = false;
    return p;
  }, [gl]);
  const state = useRef({ ready: false, done: false, lastReport: 0 });
  useEffect(() => {
    try {
      pt.setScene(scene, camera);
      state.current.ready = true;
    } catch (e) {
      console.warn("path tracer could not start", e);
      cb.current.onDone?.(null);
    }
    return () => pt.dispose();
  }, [pt, scene, camera]);
  useFrame(() => {
    const st = state.current;
    if (!st.ready || st.done) return;
    pt.renderSample();
    const f = Math.min(1, pt.samples / samples);
    if (f - st.lastReport >= 0.02 || f >= 1) {
      st.lastReport = f;
      cb.current.onProgress?.(f);
    }
    if (pt.samples >= samples) {
      st.done = true;
      cb.current.onDone?.(gl.domElement.toDataURL("image/png"));
    }
  }, 1);
  return null;
}
