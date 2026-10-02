/**
 * Compare with a site photo: a photo from your computer laid over the 3D view, to line the model up with what was built.
 * The photo is only read into this browser tab (an object URL): it is never uploaded, saved or put in a design file.
 */
import { useRef } from "react";

export type SitePhoto = { url: string; name: string; opacity: number; shown: boolean };

export function SitePhotoPanel({ photo, setPhoto, fov, setFov }: { photo: SitePhoto | null; setPhoto: (p: SitePhoto | null) => void; fov: number; setFov: (f: number) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const open = (f: File | undefined) => {
    if (!f) return;
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto({ url: URL.createObjectURL(f), name: f.name, opacity: photo?.opacity ?? 0.5, shown: true });
  };
  return (
    <section>
      <h3>Compare with a site photo</h3>
      <p className="muted small">
        Lay one of your photos over the 3D view. Stand where it was taken (Walk around, or rotate), then match the lens. <b>The photo stays on this computer</b>: it is not uploaded or saved.
      </p>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => open(e.target.files?.[0])} />
      <div className="row">
        <button onClick={() => input.current?.click()}>{photo ? "Choose another photo…" : "Choose a photo…"}</button>
        {photo && (
          <button
            onClick={() => {
              URL.revokeObjectURL(photo.url);
              setPhoto(null);
            }}
          >
            Remove
          </button>
        )}
      </div>
      {photo && (
        <>
          <p className="muted tiny">{photo.name}</p>
          <label className="row">
            <input type="checkbox" checked={photo.shown} onChange={(e) => setPhoto({ ...photo, shown: e.target.checked })} /> Show the photo
          </label>
          <label className="row">
            See-through
            <input type="range" min={0.1} max={1} step={0.05} value={photo.opacity} onChange={(e) => setPhoto({ ...photo, opacity: Number(e.target.value) })} aria-label="Photo opacity" />
            <span className="tiny">{Math.round(photo.opacity * 100)}%</span>
          </label>
          <label className="row">
            Lens
            <input type="range" min={30} max={90} step={1} value={fov} onChange={(e) => setFov(Number(e.target.value))} aria-label="Camera lens (field of view)" />
            <span className="tiny">{fov}°</span>
          </label>
          <p className="muted tiny">A phone's main camera held upright is about 65–70°. Hide the panel for a bigger view.</p>
        </>
      )}
    </section>
  );
}

export function SitePhotoOverlay({ photo }: { photo: SitePhoto | null }) {
  if (!photo?.shown) return null;
  return <img className="sitephoto" src={photo.url} alt="" style={{ opacity: photo.opacity }} />;
}
