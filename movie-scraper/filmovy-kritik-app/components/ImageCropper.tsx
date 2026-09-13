'use client';

import { useState, useRef, useCallback } from 'react';

const OUTPUT_SIZE = 400;
const FRAME_SIZE = 280;

export default function ImageCropper({
  src,
  onCancel,
  onConfirm
}: {
  src: string;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}) {
  const [ready, setReady] = useState(false);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const clamp = useCallback(
    (x: number, y: number, s: number, size: { w: number; h: number }) => {
      const dispW = size.w * s;
      const dispH = size.h * s;
      const maxX = Math.max(0, (dispW - FRAME_SIZE) / 2);
      const maxY = Math.max(0, (dispH - FRAME_SIZE) / 2);
      return { x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y)) };
    },
    []
  );

  function handleImgLoad() {
    const img = imgRef.current!;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const s = Math.max(FRAME_SIZE / w, FRAME_SIZE / h);
    setImgSize({ w, h });
    setMinScale(s);
    setScale(s);
    setOffset({ x: 0, y: 0 });
    setReady(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffX: offset.x, startOffY: offset.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clamp(dragRef.current.startOffX + dx, dragRef.current.startOffY + dy, scale, imgSize));
  }
  function onPointerUp() {
    dragRef.current = null;
  }

  function handleZoom(newScale: number) {
    setScale(newScale);
    setOffset((o) => clamp(o.x, o.y, newScale, imgSize));
  }

  function confirm() {
    const img = imgRef.current!;
    const sourceW = FRAME_SIZE / scale;
    const sourceH = FRAME_SIZE / scale;
    const sourceX = imgSize.w / 2 - sourceW / 2 - offset.x / scale;
    const sourceY = imgSize.h / 2 - sourceH / 2 - offset.y / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sourceX, sourceY, sourceW, sourceH, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onConfirm(canvas.toDataURL('image/webp', 0.85));
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-night/70" onClick={onCancel} />

      <div className="relative w-full max-w-sm bg-card border border-line rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <h2 className="font-display font-bold text-sm text-ink">Uprav fotku</h2>
          <p className="text-xs text-muted mt-0.5">Potiahni pre posun, posuvníkom priblíž.</p>
        </div>

        <div
          className="relative mx-auto my-5 overflow-hidden bg-surface touch-none select-none cursor-move"
          style={{ width: FRAME_SIZE, height: FRAME_SIZE, borderRadius: '9999px' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt="Orezanie fotky"
            onLoad={handleImgLoad}
            draggable={false}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: imgSize.w * scale,
              height: imgSize.h * scale,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              maxWidth: 'none'
            }}
          />
        </div>

        {ready && (
          <div className="px-5 mb-4">
            <input
              type="range"
              min={minScale}
              max={minScale * 3}
              step={0.01}
              value={scale}
              onChange={(e) => handleZoom(Number(e.target.value))}
              className="w-full accent-accent"
            />
          </div>
        )}

        <div className="px-5 py-4 border-t border-line flex gap-3">
          <button
            onClick={confirm}
            className="flex-1 bg-accent text-white py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark"
          >
            Uložiť orezanie
          </button>
          <button
            onClick={onCancel}
            className="border border-line text-muted px-5 py-2.5 rounded-full text-sm font-semibold hover:text-ink hover:border-ink"
          >
            Zrušiť
          </button>
        </div>
      </div>
    </div>
  );
}
