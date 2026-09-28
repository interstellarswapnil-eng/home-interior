# Claude Code Brief — Immersive Walkthrough + Video Export

Extend the **existing** Vite + React Three Fiber 2BHK app. Do **not** rebuild the apartment geometry. Reuse `plan/plan.ts`, `plan/materials.ts`, scene meshes, and cameras already working in 2D/3D.

Goal: an **immersive experience** (walk + guided tour) and a **shareable walkthrough video** (MP4/WebM) of the Ahilyanagar 2BHK lighter-modern interior.

---

## Recommended product (what to build)

Ship **two modes in the same app**, plus export:

1. **Walk mode (immersive)** — first-person, eye height ~1.6 m, WASD + mouse look (pointer lock), simple wall collision so you cannot leave the unit.
2. **Tour mode (cinematic)** — auto-play camera path: foyer → living → kitchen (+ south balcony glance) → master + ensuite peek → kids room → back to living. Soft room-name titles on screen.
3. **Record** — one-click capture of Tour mode (or a live Walk session) to a downloadable video file.

**Do this first.** Do **not** start with Remotion, WebXR/VR, or Blender unless the user asks later.

Why this path:
- Stays inside the current R3F app (fastest, same materials/budget UI).
- Family can explore on a laptop/phone browser **and** get a WhatsApp-friendly video.
- Remotion (@remotion/three) is a good **Phase 2** for offline 4K marketing renders, but it forbids R3F `useFrame` animations and needs `useCurrentFrame()` — a larger rewrite. Skip for v1.

---

## Hard constraints (carry forward)

- Lighter modern palette from `materials.ts`
- Room roles unchanged (kids upper, master lower + 8×4 ensuite, guest bath, storage, south kitchen balcony)
- Budget UI can stay; video work must not break 2D/3D
- Eye-level walkthrough, not drone-only (drone overview may be a short intro shot only)

---

## Tech choices (locked for v1)

| Need | Use |
|---|---|
| First-person look | `@react-three/drei` `PointerLockControls` (or Three `PointerLockControls` wired in R3F) |
| Movement | WASD / arrows; sprint optional (Shift); eye Y fixed ~1.6 m |
| Collision | AABB / raycasts against wall segments derived from `plan.ts` rooms (no full Rapier unless already in project) |
| Guided tour path | `THREE.CatmullRomCurve3` (or cubic lerp waypoints) + lookAt targets per beat |
| Overlays | HTML/CSS HUD: mode toggle, room label, Record / Stop |
| Video export (v1) | `canvas.captureStream()` + `MediaRecorder` on the WebGL canvas; prefer `video/webm;codecs=vp9` or H.264 if `isTypeSupported`; fallback WebM |
| Video export (nice) | Optional later: frame-accurate recorder (e.g. patterns from [r3f-video-recorder](https://github.com/malerba118/r3f-video-recorder) / mediabunny) if realtime capture drops frames |

Avoid for v1: Theatre.js studio dependency (optional later for polishing paths), Remotion, WebXR.

---

## Data to add

Create `plan/tour.ts` (new) driven by existing room rects:

```ts
// Conceptual shape — implement properly against plan.ts coordinates
export type TourWaypoint = {
  id: string;
  room: string;
  title: string;          // e.g. "Living"
  position: [number, number, number]; // world XYZ, Y ≈ 1.6
  lookAt: [number, number, number];
  dwellSeconds: number;   // pause on arrival
  moveSeconds: number;    // time from previous point
};

export const tourPath: TourWaypoint[] = [
  // foyer → living → kitchen → kitchenBalcony glance →
  // master → masterBath peek → kids → living end
];
```

Rules for waypoints:
- Y (eye) = `1.6` unless crouching (don’t crouch in v1)
- Keep XZ at least `0.4 m` inside walls
- South kitchen balcony: brief look toward balcony door / outside, don’t walk off slab
- Lift core: path goes **around**, never through lift volume
- Total tour length target: **45–75 seconds**

Also export `walkSpawn`: start in foyer facing living, Y=1.6.

---

## Build phases (execute in order)

### Phase I — Walk mode

1. Add UI toggle: `Orbit` (existing) | `Walk` | `Tour`.
2. Walk: PointerLockControls; click-to-lock overlay (“Click to explore”).
3. Movement in `useFrame`: forward/back/strafe from camera facing; lock `position.y = 1.6`.
4. Collision: from `plan.ts` room footprints, build wall segments (or box colliders per room with door gaps from `openings`). Reject moves that cross walls; allow door openings.
5. Mobile: on-screen joystick **or** clearly document desktop-only for Walk v1 (prefer simple touch look + virtual stick if easy).

**Accept:** can walk foyer → living → kitchen → bedrooms without clipping through walls; Esc unlocks pointer.

### Phase II — Tour mode

1. Implement `tour.ts` waypoints.
2. On Tour Play: disable pointer lock; animate camera along curve; smooth lookAt.
3. HUD titles fade in/out per waypoint (`title` field).
4. Loop optional; default play once + “Replay”.
5. Timing uses a single `tourClock` so recording stays in sync.

**Accept:** unattended 45–75s tour visiting all main rooms; no wall clipping; titles readable.

### Phase III — Video record

1. Record button enabled in Tour (primary) and Walk (optional).
2. On Record + Tour: auto-play tour from t=0 while capturing the WebGL canvas stream.
3. `MediaRecorder` → Blob → download `ahilyanagar-2bhk-walkthrough.webm` (or `.mp4` if supported).
4. Show recording indicator + duration; Stop cancels.
5. Set canvas/CSS size stable during record (e.g. 1920×1080 render target **or** capture at current DPR with a note in README). Prefer recording at **1280×720** or **1920×1080** via a dedicated render size to avoid huge DPR files ([canvas capture pitfalls](https://ldas.jp/en/posts/threejs-webxr-demo-video-capture/)).
6. `gl={{ preserveDrawingBuffer: true }}` on Canvas while recording if snapshots are blank.
7. README: codecs, browser notes (Chrome/Edge best), how to convert WebM→MP4 with ffmpeg if needed:

```bash
ffmpeg -i ahilyanagar-2bhk-walkthrough.webm -c:v libx264 -pix_fmt yuv420p walkthrough.mp4
```

**Accept:** one click produces a playable file showing the full tour with titles.

### Phase IV — Polish (only if I–III pass)

- Soft footsteps optional (mute toggle)
- Light fade / exposure bump when entering living balcony / south kitchen view
- Short 3s establishing orbit shot before tour starts
- Frame-accurate export path if realtime drops frames
- Screenshot strip export (optional)

---

## File layout (add, don’t scramble)

```
plan/tour.ts                 # NEW waypoints + walkSpawn
components/WalkControls.tsx    # NEW
components/TourController.tsx  # NEW
components/VideoRecorder.tsx   # NEW HUD + MediaRecorder
components/ImmersiveHUD.tsx    # NEW mode toggle, titles, record
docs/screenshots/immersive/    # NEW stills from tour
IMMERSIVE_VIDEO_CLAUDE_BRIEF.md
```

Keep existing `Plan2D`, `Scene3D`, budget panel working.

---

## Acceptance checklist (print pass/fail)

- [ ] Mode toggle: Orbit / Walk / Tour
- [ ] Walk: pointer lock, WASD, eye 1.6 m, no wall clipping, doors passable
- [ ] Tour: 45–75s path hits foyer, living, kitchen, master, kids; titles show
- [ ] South kitchen balcony acknowledged in tour (look or brief approach)
- [ ] Record downloads a playable walkthrough video of the tour
- [ ] Existing 2D plan + budget still work
- [ ] README documents controls + ffmpeg convert tip

---

## Out of scope (v1)

- VR / WebXR headsets
- Remotion 4K pipeline
- Voice narration AI
- Photoreal baking / lightmaps
- Replacing furniture with scanned assets
- Changing `plan.ts` room roles or budget totals

## Phase 2 note (mention in README only)

If user later wants offline 4K marketing video: evaluate **Remotion + `@remotion/three`** reusing the same meshes, with camera driven by `useCurrentFrame()` (not `useFrame`). Real-estate reference architecture: interactive roam + Remotion export (e.g. SmartTour-style). Do not implement in v1.

---

## Copy-paste starter prompt for Claude Code

```
Read IMMERSIVE_VIDEO_CLAUDE_BRIEF.md and extend the existing R3F 2BHK app — do not rebuild geometry.

Implement Phase I → II → III in order (Walk, Tour, Record). Reuse plan/plan.ts and current Scene3D.

Add plan/tour.ts with eye-level waypoints (Y=1.6): foyer → living → kitchen (south balcony glance) → master → kids → living. Total tour 45–75s.

Walk: PointerLockControls + WASD + simple wall collision from plan walls/openings.
Tour: CatmullRom (or smooth waypoint lerp) + HUD room titles.
Record: MediaRecorder on the WebGL canvas during Tour; download WebM/MP4; preserveDrawingBuffer while recording; stable 1280×720 or 1920×1080 capture size.

Skip Remotion, WebXR, Theatre.js for v1.

When done, print the acceptance checklist with pass/fail and update README with controls + ffmpeg WebM→MP4 tip.
```
