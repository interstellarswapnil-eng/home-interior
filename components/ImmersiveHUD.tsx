import { useEffect, useRef } from "react";
import { TOUR_SECONDS } from "../plan/tour";
import { immersive, tour, useImmersive } from "./immersiveStore";
import { recordingSupported, startRecording, stopRecording } from "./VideoRecorder";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** HTML overlay for Walk / Tour: lock prompt, room titles, tour transport, record controls. */
export function ImmersiveHUD() {
  const st = useImmersive();
  const titleRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const recRef = useRef<HTMLSpanElement>(null);
  const canRecord = recordingSupported();

  // continuous values (fades, progress, timer) are written directly — no React re-render per frame
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const f = immersive.tourFrame;
      if (titleRef.current && capRef.current) {
        const tourOn = immersive.mode === "tour";
        titleRef.current.parentElement!.style.opacity = String(tourOn ? f.titleOpacity : 0);
        titleRef.current.textContent = f.title;
        capRef.current.textContent = f.caption;
      }
      if (fadeRef.current) fadeRef.current.style.opacity = String(immersive.mode === "tour" ? f.fade : 0);
      if (barRef.current) barRef.current.style.width = `${(immersive.tourT / TOUR_SECONDS) * 100}%`;
      if (timeRef.current) timeRef.current.textContent = `${fmt(immersive.tourT)} / ${fmt(TOUR_SECONDS)}`;
      if (recRef.current && immersive.recording) recRef.current.textContent = fmt((performance.now() - immersive.recordStart) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (st.mode === "orbit") return null;
  const rec = st.recording;
  const recBtn = rec ? (
    <button className="rec on" onClick={() => stopRecording(rec === "walk")} title={rec === "tour" ? "Stop and discard" : "Stop and save the video"}>
      ■ {rec === "tour" ? "Stop (cancel)" : "Stop & save"}
    </button>
  ) : (
    <button
      className="rec"
      disabled={!canRecord}
      title={canRecord ? "Record a 1280×720 video" : "Recording needs MediaRecorder + canvas.captureStream (Chrome / Edge / Firefox)"}
      onClick={() => startRecording(st.mode === "tour" ? "tour" : "walk")}
    >
      ● {st.mode === "tour" ? "Record tour" : "Record walk"}
    </button>
  );

  return (
    <div className="hud">
      <div className="hud-fade" ref={fadeRef} />
      {rec && (
        <div className="hud-rec">
          <span className="dot" /> REC <span ref={recRef}>0:00</span>
        </div>
      )}

      {st.mode === "walk" && (
        <>
          {st.walkRoom && <div className="hud-room">{st.walkRoom}</div>}
          {!st.walkLocked ? (
            <div className="hud-lock">
              <button id="walk-lock">Click to explore</button>
              <div className="small">
                <b>WASD</b> / arrows to move · <b>mouse</b> to look · <b>Shift</b> to sprint · <b>Esc</b> to release
              </div>
              <div className="small muted-light">Walk mode is desktop-only in v1 (keyboard + mouse).</div>
            </div>
          ) : (
            <>
              <div className="hud-cross" />
              <div className="hud-hint">Esc to release the mouse</div>
            </>
          )}
          <div className="hud-bar">{recBtn}</div>
        </>
      )}

      {st.mode === "tour" && (
        <>
          <div className="hud-title">
            <div ref={titleRef} className="t" />
            <div ref={capRef} className="c" />
          </div>
          <div className="hud-bar">
            {st.tourPlaying ? (
              <button onClick={tour.pause} disabled={!!rec}>
                ❚❚ Pause
              </button>
            ) : (
              <button onClick={tour.play} disabled={!!rec}>
                ▶ {st.tourT > 0 && st.tourT < TOUR_SECONDS ? "Resume" : st.tourT >= TOUR_SECONDS ? "Play" : "Play tour"}
              </button>
            )}
            <button onClick={tour.replay} disabled={!!rec}>
              ↺ Replay
            </button>
            <div
              className="hud-progress"
              onClick={(e) => {
                if (rec) return;
                const r = e.currentTarget.getBoundingClientRect();
                tour.seek(((e.clientX - r.left) / r.width) * TOUR_SECONDS);
              }}
            >
              <div ref={barRef} />
            </div>
            <span className="hud-time" ref={timeRef} />
            {recBtn}
          </div>
        </>
      )}
    </div>
  );
}
