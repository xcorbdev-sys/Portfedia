"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

const VIEW = 280;
const OUT = 800;

/** #52: square crop with drag to move and a zoom slider. Loaded only when a photo is chosen. */
export default function Cropper({ file, onDone, onCancel }: { file: File; onDone: (f: File) => void; onCancel: () => void }) {
  const [url] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  const base = natural ? VIEW / Math.min(natural.w, natural.h) : 1; // scale so the short side fills the frame
  const scale = base * zoom;
  const w = (natural?.w ?? 0) * scale;
  const h = (natural?.h ?? 0) * scale;
  const clamp = (p: { x: number; y: number }) => ({ x: Math.min(0, Math.max(VIEW - w, p.x)), y: Math.min(0, Math.max(VIEW - h, p.y)) });

  useEffect(() => {
    if (natural) setPos(clamp({ x: (VIEW - w) / 2, y: (VIEW - h) / 2 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [natural, zoom]);

  async function done() {
    if (!natural) return;
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d")!;
    const k = OUT / VIEW;
    ctx.drawImage(img, pos.x * k, pos.y * k, w * k, h * k);
    canvas.toBlob((blob) => blob && onDone(new File([blob], "photo.jpg", { type: "image/jpeg" })), "image/jpeg", 0.9);
  }

  return (
    <div className="cropper-backdrop" role="dialog" aria-modal="true" aria-label="Crop photo">
      <div className="card cropper">
        <div className="card__body">
          <div className="card__title">Crop your photo</div>
          <div
            className="cropper__frame"
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
            }}
            onPointerMove={(e) => drag.current && setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }))}
            onPointerUp={() => (drag.current = null)}
          >
            <img src={url} alt="" draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} style={{ width: w || undefined, height: h || undefined, transform: `translate(${pos.x}px, ${pos.y}px)` }} />
          </div>
          <label className="small muted" style={{ display: "grid", gap: 4, marginTop: 12 }}>
            Zoom
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} aria-label="Zoom" />
          </label>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button type="button" className="btn" onClick={onCancel}>Cancel</button>
            <button type="button" className="btn btn--primary" onClick={done} disabled={!natural}>Use photo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
