import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { TOUR_SECONDS, tourState } from "../plan/tour";
import { immersive, setImmersive } from "./immersiveStore";

/**
 * Cinematic tour: advances the single tour clock (`immersive.tourT`) while playing and poses
 * the camera from the pure `tourState(t)` — the same function the recorder uses for titles.
 */
export function TourController() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    camera.fov = 68;
    camera.near = 0.05;
    camera.updateProjectionMatrix();
    return () => {
      gl.toneMappingExposure = 1;
    };
  }, [camera, gl]);

  useFrame((_, dt) => {
    // While recording, follow wall-clock time (a slow GPU drops frames instead of producing slow motion);
    // otherwise cap the step so a background tab doesn't jump the tour.
    const step = immersive.recording ? Math.min(dt, 1.5) : Math.min(dt, 0.1);
    if (immersive.tourPlaying) immersive.tourT = Math.min(TOUR_SECONDS, immersive.tourT + step);
    const f = tourState(immersive.tourT);
    immersive.tourFrame = f;
    camera.position.set(...f.position);
    camera.lookAt(...f.lookAt);
    gl.toneMappingExposure = 1 + f.exposure;
    (window as unknown as { __tour?: unknown }).__tour = { t: immersive.tourT, done: f.done, title: f.title };
    if (immersive.tourPlaying && immersive.tourT >= TOUR_SECONDS) setImmersive({ tourPlaying: false });
  });
  return null;
}
