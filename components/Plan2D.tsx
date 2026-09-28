import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  contextAreas,
  ductContext,
  expectedDimsM,
  furniture,
  lobbyContext,
  openings,
  planBounds,
  roomById,
  rooms,
  stairContext,
  walls,
  type Furniture,
  type Opening,
  type Rect,
  type RoomId,
} from "../plan/plan";
import { palette } from "../plan/materials";
import { fmtFtIn, fmtM, hostWall, wallSpans2D } from "../plan/geometry";

export type Layers = { walls: boolean; furniture: boolean; dims: boolean; labels: boolean };

export type Plan2DHandle = { exportSvg: () => void; exportPng: () => void; fit: () => void };

type Props = {
  layers: Layers;
  print: boolean;
  highlight?: Set<string>;
  selectedRoom?: RoomId | null;
  onSelectRoom?: (id: RoomId) => void;
};

const roomFill: Record<RoomId, string> = {
  living: "#F3EBDD",
  kitchen: "#EFE6D6",
  master: "#E9EEF1",
  kids: "#EEF1E6",
  masterBath: "#E3ECEF",
  guestBath: "#E3ECEF",
  storage: "#EAE6DF",
  lift: "#CFCFCF",
  foyer: "#F4F1EA",
  livingBalcony: "#E7EDE4",
  kitchenBalcony: "#F2E5D3",
};

// Plan y (north up) → SVG y (down)
const sy = (y: number) => -y;
const R = (r: Rect) => ({ x: r.x, y: sy(r.y + r.h), width: r.w, height: r.h });

function fitBox(pad = 0.8) {
  const b = planBounds();
  return { x: b.x - pad, y: sy(b.y + b.h) - pad, w: b.w + 2 * pad, h: b.h + 2 * pad + 0.6 };
}

export const Plan2D = forwardRef<Plan2DHandle, Props>(function Plan2D(
  { layers, print, highlight, selectedRoom, onSelectRoom },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [vb, setVb] = useState(fitBox);
  const drag = useRef<{ x: number; y: number; vb: typeof vb } | null>(null);

  const ink = print ? "#000" : "#2B2B2B";
  const wallFill = print ? "#000" : "#3A3A3A";
  const thin = 0.012;

  // --- pan / zoom
  const toSvg = useCallback(
    (clientX: number, clientY: number) => {
      const el = svgRef.current!;
      const r = el.getBoundingClientRect();
      const scale = Math.max(vb.w / r.width, vb.h / r.height);
      const offX = (r.width * scale - vb.w) / 2;
      const offY = (r.height * scale - vb.h) / 2;
      return { x: vb.x - offX + (clientX - r.left) * scale, y: vb.y - offY + (clientY - r.top) * scale, scale };
    },
    [vb],
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = toSvg(e.clientX, e.clientY);
      const k = Math.exp(e.deltaY * 0.0015);
      setVb((v) => {
        const w = Math.min(60, Math.max(1.5, v.w * k));
        const f = w / v.w;
        return { x: p.x - (p.x - v.x) * f, y: p.y - (p.y - v.y) * f, w, h: v.h * f };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [toSvg]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, vb };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const r = svgRef.current!.getBoundingClientRect();
    const scale = Math.max(d.vb.w / r.width, d.vb.h / r.height);
    setVb({ ...d.vb, x: d.vb.x - (e.clientX - d.x) * scale, y: d.vb.y - (e.clientY - d.y) * scale });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // --- export
  const serialize = () => {
    const el = svgRef.current!;
    const clone = el.cloneNode(true) as SVGSVGElement;
    const fb = fitBox();
    clone.setAttribute("viewBox", `${fb.x} ${fb.y} ${fb.w} ${fb.h}`);
    clone.setAttribute("width", String(Math.round(fb.w * 100)));
    clone.setAttribute("height", String(Math.round(fb.h * 100)));
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return { text: new XMLSerializer().serializeToString(clone), w: fb.w * 100, h: fb.h * 100 };
  };
  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };
  useImperativeHandle(ref, () => ({
    fit: () => setVb(fitBox()),
    exportSvg: () => {
      const { text } = serialize();
      const url = URL.createObjectURL(new Blob([text], { type: "image/svg+xml" }));
      download(url, "floor-plan.svg");
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    exportPng: () => {
      const { text, w, h } = serialize();
      const img = new Image();
      const scale = 2;
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = w * scale;
        c.height = h * scale;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        download(c.toDataURL("image/png"), "floor-plan.png");
      };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
    },
  }));

  const hl = (id: string) => highlight?.has(id) ?? false;
  const hlColor = "#E0892B";

  return (
    <svg
      ref={svgRef}
      className="plan2d"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ background: "#FFFFFF", touchAction: "none" }}
      fontFamily="Inter, Segoe UI, Arial, sans-serif"
    >
      {/* Context: stair, lobby, duct */}
      <g>
        {contextAreas.map((c) => (
          <rect key={c.label} {...R(c)} fill={print ? "#fff" : "#F1F1F1"} stroke="none" />
        ))}
        <StairHatch ink={ink} />
        <rect {...R(ductContext)} fill="url(#hatch)" />
      </g>

      <defs>
        <pattern id="hatch" width="0.12" height="0.12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="0.12" stroke="#9A9A9A" strokeWidth="0.015" />
        </pattern>
      </defs>

      {/* Rooms */}
      <g>
        {rooms.map((r) => (
          <rect
            key={r.id}
            {...R(r)}
            fill={print ? "#fff" : hl(r.id) ? "#F7D9B5" : roomFill[r.id]}
            stroke={selectedRoom === r.id ? hlColor : "none"}
            strokeWidth={0.05}
            onDoubleClick={() => onSelectRoom?.(r.id)}
            style={{ cursor: onSelectRoom ? "pointer" : undefined }}
          />
        ))}
        <LiftCross ink={ink} />
      </g>

      {/* Furniture */}
      {layers.furniture && (
        <g>
          {furniture.map((f) => (
            <FurnitureGlyph key={f.id} f={f} ink={ink} print={print} highlighted={hl(f.id)} />
          ))}
        </g>
      )}

      {/* Walls + openings */}
      {layers.walls && (
        <g>
          {walls.map((w) =>
            wallSpans2D(w).map((s, i) => (
              <rect
                key={`${w.id}-${i}`}
                {...R(s)}
                fill={w.kind === "parapet" ? (print ? "#fff" : "#BDB6AA") : w.kind === "context" ? "#9A9A9A" : wallFill}
                stroke={w.kind === "parapet" ? ink : "none"}
                strokeWidth={thin}
              />
            )),
          )}
          {openings.map((o) => (
            <OpeningGlyph key={o.id} o={o} ink={ink} print={print} highlighted={hl(o.id)} />
          ))}
        </g>
      )}

      {/* Dimensions */}
      {layers.dims && (
        <g>
          {(Object.keys(expectedDimsM) as RoomId[]).map((id) => (
            <RoomDims key={id} id={id} ink={ink} />
          ))}
        </g>
      )}

      {/* Labels */}
      {layers.labels && (
        <g pointerEvents="none">
          {rooms.map((r) => (
            <RoomLabel key={r.id} id={r.id} ink={ink} />
          ))}
          {[stairContext, lobbyContext].map((c) => (
            <text
              key={c.label}
              x={c.x + c.w / 2}
              y={sy(c.y + c.h / 2)}
              fontSize={0.18}
              textAnchor="middle"
              fill="#6B6B6B"
              fontStyle="italic"
            >
              {c.label}
            </text>
          ))}
          <text x={roomById.kitchenBalcony.x + roomById.kitchenBalcony.w / 2} y={sy(roomById.kitchenBalcony.y) + 0.45} fontSize={0.17} textAnchor="middle" fill={ink}>
            ↓ SOUTH — afternoon sun: exterior roller shade + full shutter door
          </text>
          {furniture
            .filter((f) => f.room === "storage")
            .map((f) => (
              <text
                key={f.id}
                x={f.x + f.w / 2}
                y={sy(f.y + f.h / 2)}
                fontSize={0.085}
                textAnchor="middle"
                fill="#5E554A"
                transform={`rotate(-90 ${f.x + f.w / 2} ${sy(f.y + f.h / 2)})`}
              >
                {f.kind === "shelving" ? "LINEN" : "BROOM · VACUUM"}
              </text>
            ))}
          <NorthArrow ink={ink} />
          <ScaleBar ink={ink} />
        </g>
      )}
    </svg>
  );
});

// ---------------------------------------------------------------------------
function RoomLabel({ id, ink }: { id: RoomId; ink: string }) {
  const r = roomById[id];
  const small = r.w * r.h < 3.2;
  let cx = r.x + r.w / 2;
  let cy = sy(r.y + r.h / 2);
  // keep labels clear of big furniture
  if (id === "living") (cx = r.x + 1.45), (cy = sy(r.y + 0.9));
  if (id === "kitchen") cy = sy(r.y + r.h - 1.1);
  if (id === "master") cy = sy(r.y + 2.35);
  if (id === "kids") cy = sy(r.y + 1.0);
  if (id === "masterBath") (cx = r.x + 2.0), (cy = sy(r.y + 0.75));
  if (id === "guestBath") cy = sy(r.y + 0.55);
  if (id === "storage") cy = sy(r.y + r.h / 2 + 0.25);
  const dims = expectedDimsM[id];
  const fs = small ? 0.13 : 0.2;
  const tag: Partial<Record<RoomId, string>> = {
    kids: "1 child",
    master: "queen + ensuite",
    masterBath: "master ensuite",
    guestBath: "guest",
    storage: "ex-basin niche",
  };
  return (
    <g>
      <text x={cx} y={cy} fontSize={fs} fontWeight={600} textAnchor="middle" fill={ink}>
        {r.label.toUpperCase()}
      </text>
      {dims && id !== "livingBalcony" && id !== "kitchenBalcony" && (
        <text x={cx} y={cy + fs * 1.15} fontSize={fs * 0.8} textAnchor="middle" fill={ink}>
          {dims.label}
        </text>
      )}
      {tag[id] && (
        <text x={cx} y={cy + fs * (dims ? 2.1 : 1.15)} fontSize={fs * 0.7} textAnchor="middle" fill="#7A6F60">
          {tag[id]}
        </text>
      )}
    </g>
  );
}

function RoomDims({ id, ink }: { id: RoomId; ink: string }) {
  const r = roomById[id];
  const off = 0.14;
  // vertical dimension lines moved clear of wall-side furniture
  const vOff: Partial<Record<RoomId, number>> = { living: 0.85, kitchen: 0.85, kids: 2.75 };
  const fs = r.w * r.h < 3.2 ? 0.1 : 0.13;
  const tick = 0.05;
  const horizontalY = sy(r.y) - off; // just inside the south edge
  const verticalX = r.x + (vOff[id] ?? off);
  const showH = !(id === "lift");
  return (
    <g stroke={ink} strokeWidth={0.008} fill={ink} fontSize={fs} style={{ paintOrder: "stroke" }}>
      <line x1={r.x} y1={horizontalY} x2={r.x + r.w} y2={horizontalY} />
      <line x1={r.x} y1={horizontalY - tick} x2={r.x} y2={horizontalY + tick} />
      <line x1={r.x + r.w} y1={horizontalY - tick} x2={r.x + r.w} y2={horizontalY + tick} />
      <text x={r.x + r.w / 2} y={horizontalY - 0.03} textAnchor="middle" stroke="#fff" strokeWidth={0.03}>
        {fmtFtIn(r.w)} ({fmtM(r.w)})
      </text>
      {showH && (
        <>
          <line x1={verticalX} y1={sy(r.y)} x2={verticalX} y2={sy(r.y + r.h)} />
          <line x1={verticalX - tick} y1={sy(r.y)} x2={verticalX + tick} y2={sy(r.y)} />
          <line x1={verticalX - tick} y1={sy(r.y + r.h)} x2={verticalX + tick} y2={sy(r.y + r.h)} />
          <text
            x={verticalX + 0.04}
            y={sy(r.y + r.h / 2)}
            textAnchor="middle"
            stroke="#fff"
            strokeWidth={0.03}
            transform={`rotate(-90 ${verticalX + 0.04} ${sy(r.y + r.h / 2)}) translate(0 ${fs * 0.9})`}
          >
            {fmtFtIn(r.h)} ({fmtM(r.h)})
          </text>
        </>
      )}
    </g>
  );
}

function StairHatch({ ink }: { ink: string }) {
  const s = stairContext;
  const flightH = s.h / 2;
  const landing = 1.0;
  const treads: number[] = [];
  for (let x = s.x + landing; x < s.x + s.w - 0.05; x += 0.26) treads.push(x);
  const midY = s.y + flightH;
  return (
    <g stroke="#9A9A9A" strokeWidth={0.01}>
      {treads.map((x) => (
        <line key={x} x1={x} y1={sy(s.y)} x2={x} y2={sy(s.y + s.h)} />
      ))}
      <line x1={s.x + landing} y1={sy(midY)} x2={s.x + s.w} y2={sy(midY)} stroke={ink} strokeWidth={0.02} />
      <text x={s.x + s.w - 0.5} y={sy(s.y + flightH * 1.5)} fontSize={0.14} fill="#5a6fd6" stroke="none">
        DN
      </text>
      <text x={s.x + s.w - 0.5} y={sy(s.y + flightH * 0.5)} fontSize={0.14} fill="#5a6fd6" stroke="none">
        UP
      </text>
    </g>
  );
}

function LiftCross({ ink }: { ink: string }) {
  const l = roomById.lift;
  return (
    <g stroke={ink} strokeWidth={0.012}>
      <line x1={l.x} y1={sy(l.y)} x2={l.x + l.w} y2={sy(l.y + l.h)} />
      <line x1={l.x} y1={sy(l.y + l.h)} x2={l.x + l.w} y2={sy(l.y)} />
    </g>
  );
}

function NorthArrow({ ink }: { ink: string }) {
  const b = planBounds();
  const cx = b.x + b.w + 0.2;
  const cy = sy(b.y + b.h) + 0.6;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={0.32} fill="none" stroke={ink} strokeWidth={0.015} />
      <path d="M0 -0.28 L0.12 0.12 L0 0.04 L-0.12 0.12 Z" fill={ink} />
      <text y={-0.38} fontSize={0.2} textAnchor="middle" fontWeight={700} fill={ink}>
        N
      </text>
    </g>
  );
}

function ScaleBar({ ink }: { ink: string }) {
  const b = planBounds();
  const x = b.x;
  const y = sy(b.y) + 0.45;
  const five = 5 * 0.3048;
  return (
    <g stroke={ink} strokeWidth={0.012} fontSize={0.13} fill={ink}>
      <rect x={x} y={y} width={1} height={0.06} fill={ink} />
      <rect x={x + 1} y={y} width={1} height={0.06} fill="#fff" />
      <text x={x} y={y + 0.24} stroke="none">
        0
      </text>
      <text x={x + 1} y={y + 0.24} stroke="none" textAnchor="middle">
        1 m
      </text>
      <text x={x + 2} y={y + 0.24} stroke="none" textAnchor="middle">
        2 m
      </text>
      <line x1={x} y1={y - 0.08} x2={x + five} y2={y - 0.08} />
      <text x={x + five + 0.05} y={y - 0.05} stroke="none">
        5 ft
      </text>
    </g>
  );
}

// ---------------------------------------------------------------------------
function OpeningGlyph({ o, ink, print, highlighted }: { o: Opening; ink: string; print: boolean; highlighted: boolean }) {
  const wall = hostWall(o, walls);
  if (!wall) return null;
  const horiz = o.rotationDeg === 90 || o.rotationDeg === 270;
  const stroke = highlighted ? "#E0892B" : ink;
  const sw = highlighted ? 0.03 : 0.012;
  const band = horiz ? { a: wall.y, b: wall.y + wall.h } : { a: wall.x, b: wall.x + wall.w };
  const mid = (band.a + band.b) / 2;

  // point helper in plan coords: s = along-wall coordinate, t = across coordinate
  const P = (s: number, t: number) => (horiz ? [s, sy(t)] : [t, sy(s)]).join(" ");
  const s0 = horiz ? o.x : o.y;
  const s1 = s0 + o.w;

  if (o.type === "window") {
    const q = (band.b - band.a) / 3;
    return (
      <g stroke={print ? ink : "#4B86A8"} strokeWidth={0.012} fill="none">
        <path d={`M ${P(s0, band.a)} L ${P(s1, band.a)} L ${P(s1, band.b)} L ${P(s0, band.b)} Z`} fill="#fff" />
        <path d={`M ${P(s0, band.a + q)} L ${P(s1, band.a + q)} M ${P(s0, band.b - q)} L ${P(s1, band.b - q)}`} />
      </g>
    );
  }
  if (o.type === "shutter") {
    return (
      <g stroke={stroke} strokeWidth={sw} fill="none">
        <path d={`M ${P(s0, mid)} L ${P(s1, mid)}`} strokeDasharray="0.08 0.05" />
        {o.id === "storage-door" &&
          [0.25, 0.5, 0.75].map((k) => (
            <path key={k} d={`M ${P(s0 + (s1 - s0) * k, band.a)} L ${P(s0 + (s1 - s0) * k, band.b)}`} />
          ))}
      </g>
    );
  }
  // doors
  const swing = o.swing ?? { hinge: "start", dir: 1 };
  const face = swing.dir === 1 ? band.b : band.a;
  const leaves =
    o.type === "doubleDoor"
      ? [
          { h: s0, len: o.w / 2, towards: 1 },
          { h: s1, len: o.w / 2, towards: -1 },
        ]
      : [{ h: swing.hinge === "start" ? s0 : s1, len: o.w, towards: swing.hinge === "start" ? 1 : -1 }];
  return (
    <g stroke={stroke} strokeWidth={sw} fill="none">
      {leaves.map((l, i) => {
        const tipT = face + swing.dir * l.len;
        const closedS = l.h + l.towards * l.len;
        // arc from leaf tip back to closed position
        const sweep = (horiz ? 1 : -1) * swing.dir * l.towards > 0 ? 0 : 1;
        return (
          <g key={i}>
            <path d={`M ${P(l.h, face)} L ${P(l.h, tipT)}`} strokeWidth={sw * 2} />
            <path d={`M ${P(l.h, tipT)} A ${l.len} ${l.len} 0 0 ${sweep} ${P(closedS, face)}`} strokeDasharray="0.04 0.03" />
          </g>
        );
      })}
    </g>
  );
}

// ---------------------------------------------------------------------------
function FurnitureGlyph({ f, ink, print, highlighted }: { f: Furniture; ink: string; print: boolean; highlighted: boolean }) {
  const r = R(f);
  const stroke = highlighted ? "#E0892B" : ink;
  const sw = highlighted ? 0.03 : 0.012;
  const fillFor = (): string => {
    if (print) return "#fff";
    switch (f.kind) {
      case "counter":
        return palette.granite;
      case "wardrobe":
      case "tvUnit":
      case "wallUnit":
      case "shelving":
      case "utilityRack":
        return palette.laminate;
      case "sofa3":
      case "loungeChair":
        return palette.fabric;
      case "queenBed":
      case "singleBed":
        return "#FBFAF7";
      case "coffeeTable":
      case "sideTable":
      case "studyDesk":
      case "chair":
        return palette.laminateOak;
      case "fridge":
        return "#E4E6E8";
      case "hob":
        return "#2A2A2A";
      case "showerTray":
        return "#D6E3EA";
      case "rollerShade":
        return palette.balconyShade;
      default:
        return "#FFFFFF";
    }
  };

  // back edge (opposite the front) in plan coords, for headboards/backrests
  const faces = f.faces ?? "S";
  const back = (d: number): Rect => {
    switch (faces) {
      case "N":
        return { x: f.x, y: f.y, w: f.w, h: d };
      case "S":
        return { x: f.x, y: f.y + f.h - d, w: f.w, h: d };
      case "E":
        return { x: f.x, y: f.y, w: d, h: f.h };
      case "W":
        return { x: f.x + f.w - d, y: f.y, w: d, h: f.h };
    }
  };
  const alongX = faces === "N" || faces === "S";
  const cx = f.x + f.w / 2;
  const cy = f.y + f.h / 2;

  const extras: JSX.Element[] = [];
  switch (f.kind) {
    case "queenBed":
    case "singleBed": {
      extras.push(<rect key="hb" {...R(back(0.08))} fill={print ? "#fff" : palette.laminateOak} />);
      const n = f.kind === "queenBed" ? 2 : 1;
      const len = alongX ? f.w : f.h;
      const pw = (len - 0.2 - (n - 1) * 0.08) / n;
      for (let i = 0; i < n; i++) {
        const s = 0.1 + i * (pw + 0.08);
        const pb = back(0.5);
        const pr: Rect = alongX
          ? { x: f.x + s, y: faces === "N" ? pb.y + 0.12 : pb.y + 0.03, w: pw, h: 0.35 }
          : { x: faces === "E" ? pb.x + 0.12 : pb.x + 0.03, y: f.y + s, w: 0.35, h: pw };
        extras.push(<rect key={`p${i}`} {...R(pr)} rx={0.05} fill="#fff" />);
      }
      break;
    }
    case "sofa3":
    case "loungeChair":
      extras.push(<rect key="back" {...R(back(0.2))} fill={print ? "#fff" : "#B9AFA1"} />);
      break;
    case "wardrobe":
    case "tvUnit":
    case "wallUnit":
      extras.push(
        <line key="d" x1={f.x} y1={sy(f.y)} x2={f.x + f.w} y2={sy(f.y + f.h)} />,
        <line key="d2" x1={f.x} y1={sy(f.y + f.h)} x2={f.x + f.w} y2={sy(f.y)} />,
      );
      break;
    case "hob":
      for (const [dx, dy] of alongX ? [[-0.2, 0], [0, 0], [0.2, 0]] : [[0, -0.22], [0, 0], [0, 0.22]])
        extras.push(<circle key={`${dx}${dy}`} cx={cx + dx} cy={sy(cy + dy)} r={0.07} fill="none" stroke="#bbb" />);
      break;
    case "sink":
      extras.push(<rect key="bowl" x={f.x + 0.05} y={sy(f.y + f.h - 0.05)} width={f.w * 0.5} height={f.h - 0.1} rx={0.04} fill="#D8DDE0" />);
      break;
    case "chimney":
      return (
        <rect {...r} fill="none" stroke={stroke} strokeWidth={sw} strokeDasharray="0.06 0.04">
          <title>{f.id}</title>
        </rect>
      );
    case "wc":
      extras.push(<ellipse key="bowl" cx={cx} cy={sy(cy)} rx={alongX ? f.w * 0.35 : f.w * 0.3} ry={alongX ? f.h * 0.3 : f.h * 0.35} fill="#fff" />);
      break;
    case "basin":
      extras.push(<ellipse key="b" cx={cx} cy={sy(cy)} rx={f.w * 0.32} ry={f.h * 0.3} fill="#EEF3F5" />);
      break;
    case "showerGlass":
      return <rect {...r} fill={palette.glass} stroke={print ? ink : "#4B86A8"} strokeWidth={0.02} />;
    case "curtain":
      return (
        <rect {...r} fill="none" stroke={highlighted ? stroke : "#A89F92"} strokeWidth={highlighted ? 0.03 : 0.015} strokeDasharray="0.05 0.03">
          <title>{f.id}</title>
        </rect>
      );
    case "shelving":
    case "utilityRack": {
      const n = 4;
      for (let i = 1; i < n; i++) {
        const t = i / n;
        extras.push(
          alongX ? (
            <line key={i} x1={f.x + f.w * t} y1={sy(f.y)} x2={f.x + f.w * t} y2={sy(f.y + f.h)} />
          ) : (
            <line key={i} x1={f.x} y1={sy(f.y + f.h * t)} x2={f.x + f.w} y2={sy(f.y + f.h * t)} />
          ),
        );
      }
      break;
    }
    case "washZone":
      extras.push(<circle key="drum" cx={cx} cy={sy(cy)} r={Math.min(f.w, f.h) * 0.32} fill="none" />);
      break;
  }

  return (
    <g stroke={stroke} strokeWidth={sw}>
      <title>{`${f.id}${f.note ? ` — ${f.note}` : ""}`}</title>
      <rect {...r} fill={fillFor()} rx={f.kind === "studyDesk" || f.kind === "coffeeTable" ? 0.06 : 0} />
      {extras}
    </g>
  );
}
