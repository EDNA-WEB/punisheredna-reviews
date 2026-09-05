'use client';

import { useState } from 'react';

type PhotoT = { id: string; thumbnail: string };
type VideoT = { id: string; url: string; title: string | null };

function resizeToDataUrl(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const scale = Math.min(1, maxWidth / img.width);
  const canvas = document.createElement('canvas');
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.82);
}

export default function EpisodeContentManager({
  seasonId,
  episodeId,
  initialSynopsis,
  initialPhotos,
  initialVideos,
  initialOnlineImage,
  hasTmdb
}: {
  seasonId: string;
  episodeId: string;
  initialSynopsis: string;
  initialPhotos: PhotoT[];
  initialVideos: VideoT[];
  initialOnlineImage: string | null;
  hasTmdb?: boolean;
}) {
  const [synopsis, setSynopsis] = useState(initialSynopsis);
  const [savingSynopsis, setSavingSynopsis] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [videos, setVideos] = useState(initialVideos);
  const [videoUrl, setVideoUrl] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingTmdbPhoto, setFetchingTmdbPhoto] = useState(false);

  async function fetchPhotoFromTmdb() {
    setFetchingTmdbPhoto(true);
    try {
      const res = await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}/tmdb-photo`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotos((prev) => [...prev, ...data]);
    } catch (err: any) {
      alert(err.message || 'Natiahnutie fotky z TMDb zlyhalo.');
    } finally {
      setFetchingTmdbPhoto(false);
    }
  }
  const [onlineImage, setOnlineImage] = useState(initialOnlineImage);
  const [uploadingOnlineImage, setUploadingOnlineImage] = useState(false);

  async function saveSynopsis() {
    setSavingSynopsis(true);
    try {
      await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ synopsis })
      });
    } finally {
      setSavingSynopsis(false);
    }
  }

  function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const thumb = resizeToDataUrl(img, 320, 0.75);
          const full = resizeToDataUrl(img, 1280, 0.85);
          const res = await fetch(`/api/episodes/${episodeId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ thumbnail: thumb, full })
          });
          const data = await res.json();
          if (res.ok) setPhotos((prev) => [...prev, { id: data.id, thumbnail: thumb }]);
        } finally {
          setUploading(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/episodes/${episodeId}/photos/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  async function addVideo() {
    if (!videoUrl.trim()) return;
    setAddingVideo(true);
    try {
      const res = await fetch(`/api/episodes/${episodeId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: videoUrl.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setVideos((prev) => [...prev, { id: data.id, url: data.url, title: data.title }]);
        setVideoUrl('');
      }
    } finally {
      setAddingVideo(false);
    }
  }

  async function removeVideo(id: string) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    await fetch(`/api/episodes/${episodeId}/videos/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function handleOnlineImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingOnlineImage(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const dataUrl = resizeToDataUrl(img, 900, 0.85);
          const res = await fetch(`/api/seasons/${seasonId}/episodes/${episodeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ onlineImage: dataUrl })
          });
          if (res.ok) setOnlineImage(dataUrl);
        } finally {
          setUploadingOnlineImage(false);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  return (
    <div className="mt-2 pt-2 border-t border-line space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-ink mb-1">Obsah epizódy</label>
        <textarea
          className="field-input-sm min-h-[60px]"
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          onBlur={saveSynopsis}
          placeholder="O čom epizóda je…"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-ink mb-1">Galéria ({photos.length})</label>
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {photos.map((p, i) => (
            <div key={p.id} className="relative" title={`Fotka #${i + 1}`}>
              <img src={p.thumbnail} alt="" className="w-12 h-16 object-cover rounded" />
              <span className="absolute top-0.5 left-0.5 bg-night/70 text-white text-[8px] font-semibold w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={() => removePhoto(p.id)}
                title={`Zmazať fotku #${i + 1}`}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-night text-white text-[9px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-accent hover:underline cursor-pointer">
            {uploading ? 'Nahrávam…' : '+ Pridať fotku'}
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
          {hasTmdb && (
            <button
              type="button"
              onClick={fetchPhotoFromTmdb}
              disabled={fetchingTmdbPhoto}
              className="text-[11px] text-accent hover:underline disabled:opacity-50"
            >
              {fetchingTmdbPhoto ? 'Naťahujem…' : '+ Automaticky z TMDb'}
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-ink mb-1">Trailery ({videos.length})</label>
        {videos.length > 0 && (
          <ul className="space-y-1 mb-1.5">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center gap-1.5 text-[11px] text-ink">
                <span className="flex-1 truncate">{v.title || v.url}</span>
                <button type="button" onClick={() => removeVideo(v.id)} className="text-muted hover:text-danger">✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-center gap-1.5">
          <input
            className="field-input-sm flex-1"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="YouTube odkaz…"
          />
          <button
            type="button"
            onClick={addVideo}
            disabled={addingVideo}
            className="text-[11px] font-semibold text-white bg-accent px-2.5 py-1 rounded-full hover:bg-accent-dark disabled:opacity-50 flex-none"
          >
            {addingVideo ? '…' : 'Pridať'}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-ink mb-1">Náhľadový obrázok pre Online</label>
        <label htmlFor={`ep-online-img-${episodeId}`} className="block cursor-pointer w-fit">
          {onlineImage ? (
            <img src={onlineImage} alt="" className="w-32 h-18 object-cover rounded-lg bg-surface" />
          ) : (
            <div className="w-32 h-18 rounded-lg bg-surface border border-dashed border-line flex items-center justify-center text-[10px] text-muted text-center px-2">
              {uploadingOnlineImage ? 'Nahrávam…' : 'Klikni pre nahratie'}
            </div>
          )}
        </label>
        <input
          id={`ep-online-img-${episodeId}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleOnlineImageUpload}
          disabled={uploadingOnlineImage}
        />
      </div>
    </div>
  );
}
