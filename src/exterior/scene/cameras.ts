/** Camera presets (plan coordinates + height), relative to the building and the road on the south. */
import { CENTER, PLOT, TERRACE, X_E, X_W, level } from "../model/building";

export type CamPreset = { label: string; pos: [number, number, number]; target: [number, number, number]; fov: number };

const c = CENTER;
const mid = TERRACE * 0.5;

export const CAMERA_PRESETS = {
  corner: { label: "Street corner (like image 28)", pos: [X_W - 11.5, PLOT.y0 - 10.5, 1.7], target: [c.x - 1, c.y - 2.5, mid + 0.6], fov: 50 },
  front: { label: "Front (south)", pos: [c.x, PLOT.y0 - 22, 7], target: [c.x, c.y, mid], fov: 45 },
  back: { label: "Back (north)", pos: [c.x, PLOT.y1 + 22, 7], target: [c.x, c.y, mid], fov: 45 },
  left: { label: "Left side (west)", pos: [X_W - 22, c.y, 7], target: [c.x, c.y, mid], fov: 45 },
  right: { label: "Right side (east)", pos: [X_E + 22, c.y, 7], target: [c.x, c.y, mid], fov: 45 },
  bird: { label: "Bird's-eye", pos: [c.x - 16, c.y - 24, 24], target: [c.x, c.y, mid - 2], fov: 45 },
  top: { label: "Top (plan)", pos: [c.x, c.y - 0.01, 48], target: [c.x, c.y, 0], fov: 40 },
  street: { label: "Street level at the gate", pos: [7.8, PLOT.y0 - 3.5, 1.6], target: [7.8, c.y, level(2)], fov: 60 },
} satisfies Record<string, CamPreset>;

export type CameraId = keyof typeof CAMERA_PRESETS;
export const CAMERA_IDS = Object.keys(CAMERA_PRESETS) as CameraId[];
