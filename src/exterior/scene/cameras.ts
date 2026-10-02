/** Camera presets (plan coordinates + height above road), relative to the building; the road is on the south. */
import { CENTER, GATES, PLINTH, PLOT, TERRACE, X_W, Y_TOWER_S, level } from "../model/building";

export type CamPreset = { label: string; pos: [number, number, number]; target: [number, number, number]; fov: number };

const c = CENTER;
const mid = TERRACE * 0.5;
const D = 24; // orbit distance for side / corner views
const corner = (sx: number, sy: number, label: string): CamPreset => ({
  label,
  pos: [c.x + sx * D * 0.72, c.y + sy * D * 0.72, 9],
  target: [c.x, c.y, mid],
  fov: 45,
});
const gateX = (GATES.pedestrian.a + GATES.pedestrian.b) / 2;

export const CAMERA_PRESETS = {
  photo: { label: "Like image 28", pos: [X_W - 11.5, PLOT.y0 - 10.5, 1.7], target: [c.x - 1, c.y - 2.5, mid + 0.6], fov: 50 },
  front: { label: "Front", pos: [c.x, c.y - D - 4, 7], target: [c.x, c.y, mid], fov: 45 },
  back: { label: "Back", pos: [c.x, c.y + D + 4, 7], target: [c.x, c.y, mid], fov: 45 },
  left: { label: "Left side (west)", pos: [c.x - D - 4, c.y, 7], target: [c.x, c.y, mid], fov: 45 },
  right: { label: "Right side (east)", pos: [c.x + D + 4, c.y, 7], target: [c.x, c.y, mid], fov: 45 },
  cornerSW: corner(-1, -1, "Front-left corner"),
  cornerSE: corner(1, -1, "Front-right corner"),
  cornerNW: corner(-1, 1, "Back-left corner"),
  cornerNE: corner(1, 1, "Back-right corner"),
  top: { label: "Top (plan)", pos: [c.x, c.y - 0.01, 120], target: [c.x, c.y, 0], fov: 16 },
  bird: { label: "Bird's-eye", pos: [c.x - 16, c.y - 24, 24], target: [c.x, c.y, mid - 2], fov: 45 },
  street: { label: "Street level at the gate", pos: [gateX + 1.5, PLOT.y0 - 3.2, 1.6], target: [gateX + 2.5, c.y, level(2)], fov: 62 },
  elevS: { label: "Elevation: road side (south)", pos: [c.x, c.y - 150, 7.8], target: [c.x, c.y, 7.8], fov: 9.5 },
  elevW: { label: "Elevation: side road (west)", pos: [c.x - 150, c.y, 7.8], target: [c.x, c.y, 7.8], fov: 9.5 },
  entrance: { label: "Entrance close-up", pos: [1.9, Y_TOWER_S - 4.2, PLINTH + 1.6], target: [1.9, Y_TOWER_S, PLINTH + 1.3], fov: 60 },
} satisfies Record<string, CamPreset>;

export type CameraId = keyof typeof CAMERA_PRESETS;
export const CAMERA_IDS = Object.keys(CAMERA_PRESETS) as CameraId[];
/** Views used by "Export all views" and the screenshot script. */
export const EXPORT_VIEWS: CameraId[] = ["photo", "front", "cornerSW", "cornerSE", "left", "right", "back", "bird", "top", "street", "entrance"];

/** Where Walk mode starts: on the footpath, facing the pedestrian gate. */
export const WALK_START = { x: gateX, y: PLOT.y0 - 1.0, heading: 0 };
