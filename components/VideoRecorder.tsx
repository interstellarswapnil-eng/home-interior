import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { immersive, setImmersive, tour, useImmersive } from "./immersiveStore";

/**
 * Video export v1: every animation frame the WebGL canvas is composited into a fixed
 * 1280×720 2D canvas together with the tour titles / fade (DOM overlays would not be
 * captured), and that canvas is recorded with captureStream() + MediaRecorder.
 */
export const VIDEO_W = 1280;
export const VIDEO_H = 720;
export const VIDEO_FPS = 30;
const FILE_BASE = "ahilyanagar-2bhk-walkthrough";

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E", // H.264 — WhatsApp-friendly where the browser supports it
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

export function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
}

export const recordingSupported = () =>
  typeof MediaRecorder !== "undefined" && typeof HTMLCanvasElement.prototype.captureStream === "function" && !!pickMimeType();

type Session = {
  recorder: MediaRecorder;
  chunks: Blob[];
  raf: number;
  save: boolean;
  autoStopAt: number | null;
};
let session: Session | null = null;

function drawFrame(ctx: CanvasRenderingContext2D) {
  const W = VIDEO_W;
  const H = VIDEO_H;
  ctx.fillStyle = "#EEF1F3";
  ctx.fillRect(0, 0, W, H);
  const gl = immersive.glCanvas;
  if (gl && gl.width > 0 && gl.height > 0) {
    const s = Math.max(W / gl.width, H / gl.height);
    const sw = W / s;
    const sh = H / s;
    ctx.drawImage(gl, (gl.width - sw) / 2, (gl.height - sh) / 2, sw, sh, 0, 0, W, H);
  }

  let title = "";
  let caption = "";
  let opacity = 0;
  let fade = 0;
  if (immersive.recording === "tour") {
    const f = immersive.tourFrame;
    title = f.title;
    caption = f.caption;
    opacity = f.titleOpacity;
    fade = f.fade;
  } else if (immersive.recording === "walk") {
    title = immersive.walkRoom;
    opacity = title ? 0.9 : 0;
  }

  if (opacity > 0.01 && title) {
    const g = ctx.createLinearGradient(0, H * 0.62, 0, H);
    g.addColorStop(0, "rgba(20,18,15,0)");
    g.addColorStop(1, `rgba(20,18,15,${0.5 * opacity})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, H * 0.62, W, H * 0.38);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 8;
    ctx.font = `600 ${immersive.recording === "walk" ? 32 : 46}px Inter, "Segoe UI", Arial, sans-serif`;
    ctx.fillText(title, 64, H - (caption ? 92 : 60));
    if (caption) {
      ctx.font = `400 22px Inter, "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.fillText(caption, 66, H - 56);
    }
    ctx.restore();
  }
  // small constant tag
  ctx.save();
  ctx.font = `500 16px Inter, "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 4;
  ctx.textAlign = "right";
  ctx.fillText("Ahilyanagar 2BHK · lighter modern", W - 32, 40);
  ctx.restore();

  if (fade > 0) {
    ctx.fillStyle = `rgba(255,255,255,${fade})`;
    ctx.fillRect(0, 0, W, H);
  }
}

async function describe(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const v = document.createElement("video");
  v.muted = true;
  v.src = url;
  const info = await new Promise<{ duration: number; width: number; height: number }>((resolve) => {
    const done = () => resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) return done();
      // MediaRecorder WebM has no duration header — seek to the end to make the browser compute it
      v.ondurationchange = () => Number.isFinite(v.duration) && done();
      v.currentTime = 1e9;
    };
    v.onerror = () => resolve({ duration: NaN, width: 0, height: 0 });
    setTimeout(done, 8000);
  });
  URL.revokeObjectURL(url);
  return info;
}

export function startRecording(kind: "tour" | "walk") {
  if (session || !recordingSupported()) return;
  const canvas = document.createElement("canvas");
  canvas.width = VIDEO_W;
  canvas.height = VIDEO_H;
  const ctx = canvas.getContext("2d")!;
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(canvas.captureStream(VIDEO_FPS), { mimeType, videoBitsPerSecond: 8_000_000 });
  const s: Session = { recorder, chunks: [], raf: 0, save: true, autoStopAt: null };
  session = s;
  recorder.ondataavailable = (e) => e.data.size && s.chunks.push(e.data);
  recorder.onstop = async () => {
    cancelAnimationFrame(s.raf);
    session = null;
    setImmersive({ recording: false });
    if (!s.save || !s.chunks.length) return;
    const blob = new Blob(s.chunks, { type: recorder.mimeType || mimeType });
    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${FILE_BASE}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    const meta = await describe(blob);
    (window as unknown as { __lastRecording?: unknown }).__lastRecording = { size: blob.size, type: blob.type, file: a.download, ...meta };
  };

  if (kind === "tour") tour.replay();
  setImmersive({ recording: kind, recordStart: performance.now() });
  drawFrame(ctx);
  recorder.start(250);

  const loop = () => {
    drawFrame(ctx);
    if (kind === "tour" && immersive.tourFrame.done && !immersive.tourPlaying) {
      s.autoStopAt ??= performance.now() + 600; // hold the last frame briefly
      if (performance.now() >= s.autoStopAt) return stopRecording(true);
    }
    s.raf = requestAnimationFrame(loop);
  };
  s.raf = requestAnimationFrame(loop);
}

/** Stop recording. `save=false` discards (Stop during a tour recording cancels). */
export function stopRecording(save: boolean) {
  if (!session) return;
  session.save = save;
  cancelAnimationFrame(session.raf);
  if (session.recorder.state !== "inactive") session.recorder.stop();
  if (!save && immersive.mode === "tour") tour.pause();
}

/**
 * Inside the Canvas: registers the WebGL canvas for the compositor and, while recording,
 * raises the pixel ratio so the drawing buffer is ≥1280 px wide (stable, sharp capture).
 */
export function RecorderBridge() {
  const gl = useThree((s) => s.gl);
  const setDpr = useThree((s) => s.setDpr);
  const width = useThree((s) => s.size.width);
  const { recording } = useImmersive();
  useEffect(() => {
    immersive.glCanvas = gl.domElement;
    return () => {
      if (immersive.glCanvas === gl.domElement) immersive.glCanvas = null;
    };
  }, [gl]);
  useEffect(() => {
    const base = Math.min(window.devicePixelRatio || 1, 2);
    setDpr(recording ? Math.min(3, Math.max(base, VIDEO_W / Math.max(1, width))) : base);
  }, [recording, width, setDpr]);
  return null;
}
