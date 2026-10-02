/** In-canvas helpers: high-resolution capture / "export all views", and camera sync for the side-by-side compare. */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CAMERA_PRESETS, type CameraId } from "./cameras";
import { toWorld } from "./geometry";
import { texturesIdle } from "./materials";

export type SceneApi = {
  /** PNG / JPEG of the current view at `scale` × the normal resolution. */
  capture: (scale?: number, type?: "image/png" | "image/jpeg") => Promise<string>;
  /** One image per preset view; the camera is put back afterwards. */
  captureViews: (ids: CameraId[], scale?: number, type?: "image/png" | "image/jpeg", onEach?: (i: number) => void) => Promise<{ id: CameraId; url: string }[]>;
};

const frames = (n: number) =>
  new Promise<void>((r) => {
    let i = 0;
    const f = () => (++i >= n ? r() : requestAnimationFrame(f));
    requestAnimationFrame(f);
  });

export function Exporter({ onApi }: { onApi?: (api: SceneApi) => void }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    if (!onApi) return;
    const waitTextures = async () => {
      const t0 = performance.now();
      while (!texturesIdle() && performance.now() - t0 < 15000) await frames(2);
    };
    const capture: SceneApi["capture"] = async (scale = 2, type = "image/png") => {
      const s = get();
      const prev = s.viewport.dpr;
      const max = s.gl.capabilities.maxTextureSize / Math.max(s.size.width, s.size.height);
      s.setDpr(Math.max(1, Math.min(scale, max, 4)));
      await frames(3);
      await waitTextures();
      await frames(2);
      const url = s.gl.domElement.toDataURL(type, 0.92);
      s.setDpr(prev);
      await frames(1);
      return url;
    };
    const captureViews: SceneApi["captureViews"] = async (ids, scale = 2, type = "image/png", onEach) => {
      const s = get();
      const cam = s.camera as THREE.PerspectiveCamera;
      const ctl = s.controls as unknown as OrbitControlsImpl | null;
      const saved = { p: cam.position.clone(), t: ctl?.target.clone(), fov: cam.fov, auto: ctl?.autoRotate };
      if (ctl) ctl.autoRotate = false;
      const out: { id: CameraId; url: string }[] = [];
      try {
        for (const [i, id] of ids.entries()) {
          const pr = CAMERA_PRESETS[id];
          cam.position.set(...toWorld(...pr.pos));
          cam.fov = pr.fov;
          cam.updateProjectionMatrix();
          if (ctl) {
            ctl.target.set(...toWorld(...pr.target));
            ctl.update();
          } else cam.lookAt(...toWorld(...pr.target));
          await frames(2);
          out.push({ id, url: await capture(scale, type) });
          onEach?.(i + 1);
        }
      } finally {
        cam.position.copy(saved.p);
        cam.fov = saved.fov;
        cam.updateProjectionMatrix();
        if (ctl && saved.t) {
          ctl.target.copy(saved.t);
          ctl.autoRotate = !!saved.auto;
          ctl.update();
        }
      }
      return out;
    };
    onApi({ capture, captureViews });
  }, [get, onApi]);
  return null;
}

/** Shared camera between the two compare views: the one under the mouse leads, the other follows. */
const bus = { v: 0, from: "", pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 50 };

export function CameraSync({ id }: { id: string }) {
  const { camera, controls, gl } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: OrbitControlsImpl | null; gl: THREE.WebGLRenderer };
  const active = useRef(false);
  const seen = useRef(0);
  useEffect(() => {
    const el = gl.domElement;
    const on = () => (active.current = true);
    const off = () => (active.current = false);
    el.addEventListener("pointerenter", on);
    el.addEventListener("pointerdown", on);
    el.addEventListener("wheel", on);
    el.addEventListener("pointerleave", off);
    return () => {
      el.removeEventListener("pointerenter", on);
      el.removeEventListener("pointerdown", on);
      el.removeEventListener("wheel", on);
      el.removeEventListener("pointerleave", off);
    };
  }, [gl]);
  useFrame(() => {
    if (!controls) return;
    if (active.current) {
      if (!bus.pos.equals(camera.position) || !bus.target.equals(controls.target) || bus.fov !== camera.fov) {
        bus.pos.copy(camera.position);
        bus.target.copy(controls.target);
        bus.fov = camera.fov;
        bus.from = id;
        seen.current = ++bus.v;
      }
    } else if (bus.v !== seen.current && bus.from !== id) {
      camera.position.copy(bus.pos);
      controls.target.copy(bus.target);
      camera.fov = bus.fov;
      camera.updateProjectionMatrix();
      controls.update();
      seen.current = bus.v;
    }
  });
  return null;
}
