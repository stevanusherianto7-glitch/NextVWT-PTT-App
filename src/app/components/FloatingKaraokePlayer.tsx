import React, { useState, useRef, useEffect } from 'react';
import { X, Minimize2, Maximize2, Search, Disc } from 'lucide-react';

export interface FloatingKaraokePlayerProps {
  onClose: () => void;
}

export function FloatingKaraokePlayer({ onClose }: FloatingKaraokePlayerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [videoId, setVideoId] = useState(''); // Empty until user pastes URL
  const [searchQuery, setSearchQuery] = useState('');
  const [isPlaying, setIsPlaying] = useState(false); // Not playing until video is loaded
  const [showSettings, setShowSettings] = useState(false);
  const [quality, setQuality] = useState('auto');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Quality options
  const QUALITY_OPTIONS = [
    { label: 'Auto', value: 'auto' },
    { label: '1080p', value: 'hd1080' },
    { label: '720p', value: 'hd720' },
    { label: '480p', value: 'large' },
    { label: '360p', value: 'medium' },
  ];

  // Change quality by reloading iframe src with vq= parameter
  const handleQualityChange = (q: string) => {
    setQuality(q);
    setShowSettings(false);
    // If a video is loaded, reload iframe with chosen quality
    if (videoId && iframeRef.current) {
      const vq = q !== 'auto' ? `&vq=${q}` : '';
      iframeRef.current.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1${vq}`;
      setIsPlaying(true);
    }
  };

  // Send command to YouTube iframe via postMessage
  const sendPlayerCommand = (func: string, args: unknown[] = []) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      sendPlayerCommand('pauseVideo');
    } else {
      sendPlayerCommand('playVideo');
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    sendPlayerCommand('stopVideo');
    setIsPlaying(false);
  };

  const handleRewind = () => {
    sendPlayerCommand('seekTo', [0, true]);
    sendPlayerCommand('playVideo');
    setIsPlaying(true);
  };

  // Dragging states
  const [position, setPosition] = useState({ x: 20, y: 120 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const playerRef = useRef<HTMLDivElement>(null);

  // Parse YouTube video ID from URL or input
  const handleLoadVideo = (input: string) => {
    if (!input.trim()) return;

    // Check if it's a youtube URL
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = input.match(regExp);
    const vq = quality !== 'auto' ? `&vq=${quality}` : '';

    if (match && match[2].length === 11) {
      setVideoId(match[2]);
      setIsPlaying(true);
      // Apply quality param immediately if quality is set
      if (iframeRef.current) {
        iframeRef.current.src = `https://www.youtube.com/embed/${match[2]}?autoplay=1&enablejsapi=1${vq}`;
      }
    } else if (input.length === 11) {
      // Direct video ID
      setVideoId(input);
      setIsPlaying(true);
      if (iframeRef.current) {
        iframeRef.current.src = `https://www.youtube.com/embed/${input}?autoplay=1&enablejsapi=1${vq}`;
      }
    } else {
      // Otherwise, open YouTube Search in a new tab
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(input + ' karaoke')}`;
      window.open(searchUrl, '_blank');
    }
  };

  // Drag start handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    isDragging.current = true;
    dragStart.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      handleDragStart(e.clientX, e.clientY);
      e.preventDefault();
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    }
  };

  // Drag move and end global listeners
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current) return;

      let newX = clientX - dragStart.current.x;
      let newY = clientY - dragStart.current.y;

      // Keep inside window bounds
      newX = Math.max(0, Math.min(window.innerWidth - (isMinimized ? 200 : 320), newX));
      newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 134 : 272), newY));

      setPosition({ x: newX, y: newY });
    };

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onDragEnd = () => {
      isDragging.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onDragEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onDragEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onDragEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onDragEnd);
    };
  }, [isMinimized]);

  return (
    <div
      ref={playerRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`absolute z-50 flex flex-col overflow-hidden border transition-all duration-300 ${
        isMinimized
          ? 'w-[200px] h-[134px] rounded-xl' // 112px video + 22px solid bottom drag bar
          : 'w-[320px] h-auto rounded-2xl'
      }`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: 'var(--panel-bg)',
        borderColor: 'var(--panel-border)',
        boxShadow:
          'var(--panel-shadow), 0 16px 35px rgba(0, 0, 0, 0.45), inset 0 1.5px 2.5px rgba(255, 255, 255, 0.55)',
        backdropFilter: 'blur(16px)',
      }}
    >
      {/* 3D Glass Inner Edge Highlight Overlay */}
      {!isMinimized && (
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl z-20"
          style={{
            boxShadow:
              'inset 0 1px 1.5px rgba(255, 255, 255, 0.65), inset 0 0 1px 1px rgba(255, 255, 255, 0.15)',
          }}
        />
      )}

      {/* ─── MINI OVERLAY CONTROLS (Only shown when minimized) ─── */}
      {isMinimized && (
        <div className="absolute inset-0 bg-black/10 hover:bg-black/45 transition-colors duration-200 z-20 pointer-events-none">
          <div className="absolute top-1.5 left-1.5 flex gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded bg-slate-950/80 hover:bg-indigo-600 text-white transition focus:outline-none cursor-pointer"
              title="Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="absolute top-1.5 right-1.5 flex gap-1 pointer-events-auto">
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded bg-slate-950/80 hover:bg-red-600 text-white transition focus:outline-none cursor-pointer"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── HEADER BAR (Hidden when minimized) ─── */}
      {!isMinimized && (
        <div
          className="drag-handle flex items-center justify-between px-3.5 py-2.5 cursor-move shrink-0 select-none border-b animate-in fade-in duration-300"
          style={{
            background: 'var(--header-bg)',
            borderColor: 'var(--header-border)',
            color: 'var(--header-text-color)',
          }}
        >
          <div className="flex items-center gap-2">
            <Disc
              className="w-4 h-4 animate-spin"
              style={{
                animationDuration: '4s',
                color: 'var(--header-text-color)',
              }}
            />
            <span
              className="text-xs font-bold tracking-wider"
              style={{ color: 'var(--header-text-color)', fontFamily: "'Outfit', sans-serif" }}
            >
              NextVWT Karaoke Player
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition focus:outline-none cursor-pointer"
              style={{ color: 'var(--header-text-color)' }}
              title="Minimize"
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-red-500/10 transition focus:outline-none cursor-pointer"
              style={{ color: 'var(--header-text-color)' }}
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── YOUTUBE PLAYER FRAME / PLACEHOLDER ─── */}
      <div
        className={`shrink-0 relative ${
          isMinimized ? 'w-full h-[112px] bg-black' : 'w-full aspect-video border-b'
        }`}
        style={{
          borderColor: 'var(--panel-border)',
        }}
      >
        {videoId ? (
          <iframe
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`}
            title="YouTube Karaoke Video"
            className="w-full h-full bg-black"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          /* Empty state placeholder */
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 select-none"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
          >
            {/* Music note icon */}
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(148,163,184,0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            <p
              className="text-center text-[11px] font-medium px-4 leading-relaxed"
              style={{ color: 'rgba(148,163,184,0.7)', fontFamily: "'Inter', sans-serif" }}
            >
              Silahkan tempel URL link
              <br />
              video musik Anda
            </p>
          </div>
        )}
      </div>

      {/* ─── CONTENT INTERFACE (Hidden when minimized) ─── */}
      {!isMinimized && (
        <>
          {/* ─── PLAYER CONTROLS: Rewind / Play·Pause / Stop ─── */}
          <div
            className="flex items-center justify-center gap-5 px-3 py-2.5 shrink-0 border-b animate-in fade-in duration-300"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.28), rgba(0,0,0,0.18))',
              borderColor: 'rgba(255,255,255,0.07)',
            }}
          >
            {/* ── Rewind to start ── */}
            <button
              type="button"
              onClick={handleRewind}
              title="Ulangi dari awal"
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 focus:outline-none cursor-pointer hover:brightness-125"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {/* Skip-to-start: bar + filled triangle pointing left */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="19,5 9,12 19,19" />
                <rect x="5" y="5" width="3" height="14" rx="1.5" />
              </svg>
            </button>

            {/* ── Play / Pause (larger, accent) ── */}
            <button
              type="button"
              onClick={handlePlayPause}
              title={isPlaying ? 'Jeda' : 'Putar'}
              className="w-12 h-12 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 focus:outline-none cursor-pointer"
              style={{
                background:
                  'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(200,210,225,0.85) 100%)',
                border: '1.5px solid rgba(255,255,255,0.6)',
                boxShadow: '0 3px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
                color: '#1e293b',
              }}
            >
              {isPlaying ? (
                /* Pause: two solid bars */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="5" y="4" width="4" height="16" rx="1.5" />
                  <rect x="15" y="4" width="4" height="16" rx="1.5" />
                </svg>
              ) : (
                /* Play: filled triangle */
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6,4 20,12 6,20" />
                </svg>
              )}
            </button>

            {/* ── Stop ── */}
            <button
              type="button"
              onClick={handleStop}
              title="Stop"
              className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 focus:outline-none cursor-pointer hover:brightness-125"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1.5px solid rgba(255,255,255,0.18)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              {/* Stop: filled square */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
            </button>

            {/* ── Settings / Quality ── */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                title="Kualitas video"
                className="w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90 focus:outline-none cursor-pointer hover:brightness-125"
                style={{
                  background: showSettings ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.12)',
                  border: showSettings
                    ? '1.5px solid rgba(129,140,248,0.7)'
                    : '1.5px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)',
                  color: showSettings ? '#a5b4fc' : 'rgba(255,255,255,0.85)',
                }}
              >
                {/* Gear icon */}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.36.07-.74.07-1.08s-.03-.73-.07-1.08l2.32-1.82c.21-.16.27-.46.13-.7l-2.2-3.81c-.13-.24-.42-.32-.65-.24l-2.74 1.1c-.57-.44-1.18-.79-1.85-1.07L14.5 2.42c-.04-.27-.27-.42-.5-.42h-4c-.23 0-.46.15-.5.42l-.44 2.46c-.67.28-1.28.63-1.85 1.07L4.47 4.85c-.23-.08-.52 0-.65.24L1.62 8.9c-.14.24-.08.54.13.7l2.32 1.82C4.03 11.27 4 11.64 4 12s.03.73.07 1.08L1.75 14.9c-.21.16-.27.46-.13.7l2.2 3.81c.13.24.42.32.65.24l2.74-1.1c.57.44 1.18.79 1.85 1.07l.44 2.46c.04.27.27.42.5.42h4c.23 0 .46-.15.5-.42l.44-2.46c.67-.28 1.28-.63 1.85-1.07l2.74 1.1c.23.08.52 0 .65-.24l2.2-3.81c.14-.24.08-.54-.13-.7l-2.32-1.82Z" />
                </svg>
              </button>

              {/* Quality dropdown panel */}
              {showSettings && (
                <div
                  className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(15,23,42,0.97) 0%, rgba(30,41,59,0.97) 100%)',
                    border: '1px solid rgba(99,102,241,0.35)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    minWidth: '100px',
                  }}
                >
                  <div
                    className="px-3 py-1.5 text-[9px] font-bold tracking-widest uppercase border-b"
                    style={{
                      color: 'rgba(148,163,184,0.6)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    Kualitas
                  </div>
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleQualityChange(opt.value)}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-medium transition-colors focus:outline-none cursor-pointer flex items-center justify-between"
                      style={{
                        color: quality === opt.value ? '#a5b4fc' : 'rgba(226,232,240,0.85)',
                        background: quality === opt.value ? 'rgba(99,102,241,0.18)' : 'transparent',
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      <span>{opt.label}</span>
                      {quality === opt.value && (
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          style={{ color: '#a5b4fc' }}
                        >
                          <polyline
                            points="20,6 9,17 4,12"
                            strokeWidth="3"
                            stroke="currentColor"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ─── URL INPUT + LOAD ─── */}
          <div
            className="p-2.5 flex gap-1.5 shrink-0 animate-in fade-in duration-300"
            style={{
              background: 'rgba(0, 0, 0, 0.08)',
            }}
          >
            <div className="relative flex-1">
              <Search
                className="absolute left-2.5 top-2.5 w-3.5 h-3.5"
                style={{ color: 'var(--panel-text-color)', opacity: 0.6 }}
              />
              <input
                type="text"
                placeholder="Cari lagu / paste link YouTube..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo(searchQuery)}
                className="w-full pl-8 pr-2 py-1.5 bg-black/15 border rounded-lg text-[11px] placeholder:text-current placeholder:opacity-50 text-current font-medium focus:outline-none focus:ring-1 focus:ring-current"
                style={{
                  color: 'var(--panel-text-color)',
                  borderColor: 'var(--panel-border)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleLoadVideo(searchQuery)}
              className="px-2.5 py-1 text-[10px] font-bold text-white transition focus:outline-none cursor-pointer active:scale-95 flex items-center justify-center rounded-lg"
              style={{
                background: 'var(--btn-bg)',
                border: 'var(--btn-border)',
                boxShadow: 'var(--btn-shadow)',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              LOAD
            </button>
          </div>
        </>
      )}

      {/* ─── MINI DRAG BAR (Only shown at the bottom when minimized) ─── */}
      {isMinimized && (
        <div
          className="drag-handle w-full h-[22px] border-t flex items-center justify-center cursor-move shrink-0 select-none pointer-events-auto"
          style={{
            background: 'var(--header-bg)',
            borderColor: 'var(--header-border)',
          }}
        >
          {/* Visual drag indicator lines */}
          <div className="flex gap-1 items-center">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--header-text-color)', opacity: 0.5 }}
            />
            <div className="flex flex-col gap-0.5 justify-center">
              <span
                className="w-6 h-[2px] rounded"
                style={{ backgroundColor: 'var(--header-text-color)', opacity: 0.4 }}
              />
              <span
                className="w-6 h-[2px] rounded"
                style={{ backgroundColor: 'var(--header-text-color)', opacity: 0.4 }}
              />
            </div>
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--header-text-color)', opacity: 0.5 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
