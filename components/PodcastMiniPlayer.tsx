'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  src: string;
  title?: string;
};

export default function PodcastMiniPlayer({ src, title }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onLoaded = () => setDuration(a.duration || 0);
    const onTime = () => setCurrentTime(a.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    a.addEventListener('loadedmetadata', onLoaded);
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('ended', onEnded);

    return () => {
      a.removeEventListener('loadedmetadata', onLoaded);
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('ended', onEnded);
    };
  }, []);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;

    if (isPlaying) {
      a.pause();
      setIsPlaying(false);
    } else {
      a.play();
      setIsPlaying(true);
    }
  }

  function stop() {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  }

  function seekTo(value: number) {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = value;
    setCurrentTime(value);
  }

  function jump(seconds: number) {
    const a = audioRef.current;
    if (!a) return;
    const next = Math.max(0, Math.min(duration || 0, (a.currentTime || 0) + seconds));
    a.currentTime = next;
    setCurrentTime(next);
  }

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title ?? 'Podcast'}</div>

      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </button>

        <button
          type="button"
          onClick={stop}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          Stop
        </button>

        <button
          type="button"
          onClick={() => jump(-15)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          -15s
        </button>

        <button
          type="button"
          onClick={() => jump(15)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 cursor-pointer"
        >
          +15s
        </button>

        <div className="flex-1 min-w-[180px]">
          <input
            type="range"
            min={0}
            max={Math.max(1, Math.floor(duration))}
            value={Math.floor(currentTime)}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full cursor-pointer"
            aria-label="Position"
          />
          <div className="mt-1 text-xs text-slate-600">
            {Math.floor(currentTime)}s / {Math.floor(duration)}s
          </div>
        </div>
      </div>
    </div>
  );
}