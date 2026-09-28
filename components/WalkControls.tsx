import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { EYE_H, moveWithCollision, roomAt } from "../plan/collision";
import { walkSpawn } from "../plan/tour";
import { immersive, setImmersive } from "./immersiveStore";

const WALK_SPEED = 1.4; // m/s
const SPRINT_SPEED = 2.6;

/**
 * First-person walk: PointerLockControls for mouse look (lock by clicking the
 * "Click to explore" overlay, Esc releases), WASD/arrows to move, Shift to sprint.
 * Eye height is fixed; movement slides against colliders derived from plan.ts.
 */
export function WalkControls() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const keys = useRef(new Set<string>());
  const pos = useRef({ x: walkSpawn.position[0], y: -walkSpawn.position[2] });

  // spawn
  useEffect(() => {
    const [x, , z] = walkSpawn.position;
    pos.current = { x, y: -z };
    camera.position.set(x, EYE_H, z);
    camera.fov = 70;
    camera.near = 0.05;
    camera.updateProjectionMatrix();
    camera.lookAt(...walkSpawn.lookAt);
  }, [camera]);

  // keyboard
  useEffect(() => {
    const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA");
    };
    const down = (e: KeyboardEvent) => {
      if (!MOVE.has(e.code) || typing(e)) return;
      keys.current.add(e.code);
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      if (document.pointerLockElement) document.exitPointerLock();
    };
  }, []);

  const fwd = useRef(new THREE.Vector3());
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.1);
    const k = keys.current;
    const f = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    const r = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    camera.getWorldDirection(fwd.current);
    const fx = fwd.current.x;
    const fz = fwd.current.z;
    const len = Math.hypot(fx, fz) || 1;
    // world forward (fx, fz) and right (-fz, fx); plan y = -world z
    let wx = (fx / len) * f + (-fz / len) * r;
    let wz = (fz / len) * f + (fx / len) * r;
    const m = Math.hypot(wx, wz);
    if (m > 0) {
      const speed = (k.has("ShiftLeft") || k.has("ShiftRight") ? SPRINT_SPEED : WALK_SPEED) * dt;
      wx = (wx / m) * speed;
      wz = (wz / m) * speed;
      pos.current = moveWithCollision(pos.current, wx, -wz);
    }
    camera.position.set(pos.current.x, EYE_H, -pos.current.y);
    immersive.walkPos = { x: pos.current.x, y: pos.current.y, yaw: Math.atan2(fx, -fz) };
    (window as unknown as { __walk?: unknown }).__walk = immersive.walkPos;
    const room = roomAt(pos.current.x, pos.current.y)?.label ?? "";
    if (room !== immersive.walkRoom) setImmersive({ walkRoom: room });
  });

  return (
    <PointerLockControls
      selector="#walk-lock"
      onLock={() => setImmersive({ walkLocked: true })}
      onUnlock={() => setImmersive({ walkLocked: false })}
    />
  );
}
