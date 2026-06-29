import React, { useState, useEffect, lazy, Suspense } from 'react';
import twinHeadsIcon from '../../imports/ikon_kepala_kembar-2.png';
import usernameIcon from '../../assets/icon_voice.png';
import { usePTTStore } from '../store/usePTTStore';
import { AquariumSkeleton } from './SkeletonLoaders';

// [P2-2] AquariumCanvas hanya diload jika user memakai theme-v6 + bgActive
// Ukuran: ~24KB JS + WebGL canvas — 0% users tidak memakai tema ini tidak perlu download
const AquariumCanvas = lazy(() =>
  import('./AquariumCanvas').then((m) => ({ default: m.AquariumCanvas }))
);

interface LCDPanelProps {
  channel: number;
  userCount?: number;
  isOffline?: boolean;
  isPowerOn?: boolean;
  onUserCountClick?: () => void;
}

export function LCDPanel({
  channel,
  userCount = 0,
  isOffline = false,
  isPowerOn: _isPowerOn = true,
  onUserCountClick,
}: LCDPanelProps) {
  const channelStr = channel.toString().padStart(3, '0');
  const infoText = usePTTStore((state) => state.infoText);
  const user = usePTTStore((state) => state.user);
  const activeTransmitter = usePTTStore((state) => state.activeTransmitter);
  const isTransmitting = usePTTStore((state) => state.isTransmitting);
  const localUserId = usePTTStore((state) => state.userId);
  const themeText = usePTTStore((state) => state.themeText);
  const bgActive = usePTTStore((state) => state.bgActive);

  const localName = infoText || user?.user_metadata?.full_name || 'Pebe Herianto';
  const isReceiving = activeTransmitter && activeTransmitter.userId !== localUserId;

  const username = isTransmitting
    ? localName
    : isReceiving
      ? activeTransmitter?.displayName
      : localName;

  // Signal strength simulator (fluctuates 1-4 bars when online, 0 when offline)
  const [signalBars, setSignalBars] = useState(4);

  // Latency info tooltip interaction
  const [showLatency, setShowLatency] = useState(false);
  const [latencyVal, setLatencyVal] = useState(77);

  const handleSignalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (showLatency) {
      setShowLatency(false);
      return;
    }

    if (isOffline) {
      setLatencyVal(999);
      setShowLatency(true);
      return;
    }

    let base = 77;
    if (signalBars === 4) {
      base = Math.floor(Math.random() * 15) + 25; // 25-40ms
    } else if (signalBars === 3) {
      base = Math.floor(Math.random() * 25) + 45; // 45-70ms
    } else if (signalBars === 2) {
      base = Math.floor(Math.random() * 45) + 75; // 75-120ms
    } else if (signalBars === 1) {
      base = Math.floor(Math.random() * 100) + 125; // 125-225ms
    }
    setLatencyVal(base);
    setShowLatency(true);
  };

  useEffect(() => {
    if (showLatency) {
      const timer = setTimeout(() => {
        setShowLatency(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLatency]);

  useEffect(() => {
    if (isOffline) {
      setSignalBars(0);
      return;
    }

    // Default to 4 bars
    setSignalBars(4);

    const interval = setInterval(() => {
      const rand = Math.random();
      if (rand < 0.75) {
        setSignalBars(4);
      } else if (rand < 0.9) {
        setSignalBars(3);
      } else if (rand < 0.97) {
        setSignalBars(2);
      } else {
        setSignalBars(1);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isOffline]);

  return (
    <div
      className="relative w-[300px] h-[155px] rounded-3xl mx-auto transition-all duration-300"
      style={{
        boxShadow: 'var(--lcd-glow)',
      }}
    >
      {/* Background layer with overflow-hidden to prevent color bleed on corners */}
      <div
        className="absolute inset-0 rounded-3xl overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, var(--lcd-border-top) 0%, var(--lcd-border-left) 30%, var(--lcd-border-right) 70%, var(--lcd-border-bottom) 100%)',
        }}
      >
        {/* 3D Gold Bezel Emboss Overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            boxShadow:
              'inset 0 0 0 1.5px rgba(0,0,0,0.28), inset 0 3.5px 6px rgba(255,255,255,0.55), inset 0 -3.5px 6px rgba(0,0,0,0.55), inset 0 0 14px rgba(0,0,0,0.22)',
          }}
        />
      </div>

      <div className="relative w-full h-full p-[10px]">
        {/* Inner Screen Container */}
        <div
          className="relative w-full h-full rounded-[14px] overflow-hidden"
          style={{
            background: 'var(--lcd-bg)',
          }}
        >
          {/* 3D Inner Border/Glass Highlight Overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded-[14px] z-20"
            style={{
              boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.45), inset 0 0 12px rgba(0,0,0,0.65)',
            }}
          />

          {/* Glossy Screen Shine Overlay */}
          <div
            className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/30 to-white/0 pointer-events-none z-10"
            style={{
              borderRadius: '14px 14px 0 0',
            }}
          />

          {/* Aquarium Canvas Backplate — lazy-loaded, hanya aktif di theme-v6 */}
          {_isPowerOn && themeText === 'theme-v6' && bgActive && (
            <Suspense fallback={<AquariumSkeleton />}>
              <AquariumCanvas theme={themeText} />
            </Suspense>
          )}

          {/* Content */}
          <div
            className={`relative p-2.5 h-full flex flex-col justify-between transition-opacity duration-300 z-10 opacity-100 ${_isPowerOn ? '' : 'pointer-events-none'}`}
          >
            {/* Top status bar */}
            <div className="flex items-start justify-between">
              {/* Top Left: Username Icon and Letter */}
              <div className="flex items-end gap-1.5 pt-1">
                {/* Single User Icon — glossy baked into PNG */}
                <div className="relative shrink-0 select-none flex items-center justify-center w-[28px] h-[28px] ml-1">
                  <img
                    src={usernameIcon}
                    alt="Role Icon"
                    className="h-[28px] w-[28px] object-contain"
                    style={{ filter: 'drop-shadow(0px 1.5px 2px rgba(0,0,0,0.3))' }}
                    draggable={false}
                  />
                </div>
                <span
                  data-testid="lcd-username"
                  className="text-base -ml-1 truncate max-w-[110px] leading-none mb-[7px]"
                  style={{ fontWeight: 600, color: '#ffffff' }}
                >
                  {username}
                </span>
              </div>

              {/* Connection Status & OFFLINE Badge */}
              {isOffline ? (
                <div
                  data-testid="connection-status"
                  className="absolute left-1/2 -translate-x-1/2 top-1 px-2 py-0.5 rounded-full bg-[#E53935] flex items-center gap-1"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '1px solid #d32f2f' }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white"
                  >
                    <path d="M4 12a8 8 0 0 1 16 0" />
                    <path d="M8 12a4 4 0 0 1 8 0" />
                    <circle cx="12" cy="12" r="1" />
                  </svg>
                  <span className="text-[10px] text-white font-bold tracking-wide uppercase">
                    Offline
                  </span>
                </div>
              ) : (
                <span data-testid="connection-status" className="sr-only">
                  ONLINE
                </span>
              )}

              {/* BUSY Badge */}
              {!isOffline && isReceiving && (
                <div
                  data-testid="lcd-busy-badge"
                  className="absolute left-1/2 -translate-x-1/2 top-1 px-2 py-0.5 rounded-full bg-[#f97316] flex items-center gap-1"
                  style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '1px solid #ea580c' }}
                >
                  <span className="text-[10px] text-white font-bold tracking-wide uppercase animate-pulse">
                    Busy
                  </span>
                </div>
              )}

              {/* Signal Bar */}
              <div
                onClick={handleSignalClick}
                className="flex items-end h-[28px] relative gap-1 mt-1 mr-1 cursor-pointer select-none"
              >
                {isOffline && (
                  <span className="text-[#d32f2f] font-black text-3xl leading-none absolute -left-3 -top-2 z-10 drop-shadow-[1px_1px_0px_rgba(255,255,255,0.6)]">
                    ×
                  </span>
                )}

                {/* Latency Tooltip */}
                {showLatency && (
                  <div
                    className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2 py-0.5 rounded bg-black text-white text-[10px] font-sans font-medium border border-neutral-800 shadow-lg whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{
                      boxShadow:
                        '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -1px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {isOffline ? 'Latency: Offline' : `Latency: ${latencyVal}ms`}
                  </div>
                )}

                {/* Signal Bars SVG approach */}
                <div className="flex items-end gap-0 h-full pb-[2px] relative">
                  {[1, 2, 3, 4].map((bar) => {
                    const isActive = bar <= signalBars;
                    let barBackground =
                      'linear-gradient(to bottom, #ffffff 0%, #e5e5e5 50%, #cccccc 100%)';

                    if (isActive) {
                      if (signalBars >= 3) {
                        barBackground =
                          'linear-gradient(to bottom, #c6ffc2 0%, #00ff55 45%, #008f1f 100%)';
                      } else if (signalBars === 2) {
                        barBackground =
                          'linear-gradient(to bottom, #fff3a1 0%, #ffcc00 45%, #b88600 100%)';
                      } else if (signalBars === 1) {
                        barBackground =
                          'linear-gradient(to bottom, #ffc4c4 0%, #ff1133 45%, #a80000 100%)';
                      }
                    }

                    return (
                      <div
                        key={bar}
                        className="flex-shrink-0"
                        style={{
                          width: '11px',
                          height: `${bar * 6 + 3}px`,
                          background: barBackground,
                          border: '1px solid #000000',
                          borderRadius: '1px',
                          marginRight: bar < 4 ? '-1px' : '0px',
                          boxShadow:
                            'inset 1px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(0,0,0,0.5)',
                          opacity: 1,
                          transition: 'background 0.2s ease-in-out',
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center/Bottom Content */}
            <div className="flex justify-between items-end pb-2 px-1 mt-auto">
              <div className="flex items-end gap-1 w-[115px]">
                <div
                  className="relative text-2xl font-medium tracking-tight"
                  style={{
                    paddingBottom: '2px',
                    color: '#ffffff',
                  }}
                >
                  CH
                </div>
                <div
                  data-testid="lcd-channel-number"
                  className="relative"
                  style={{
                    fontFamily: "'DSEG7', monospace",
                    fontSize: '46px',
                    fontWeight: 'bold',
                    lineHeight: 0.75,
                    marginLeft: '-2px',
                    textShadow: 'var(--lcd-glow)',
                    paddingBottom: '5px',
                    color: '#ffffff',
                  }}
                >
                  {channelStr}
                </div>
              </div>

              {/* Bottom Right: Twin Heads & Enlarged User Count (Shifted Left via margin) */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (_isPowerOn && onUserCountClick) {
                    onUserCountClick();
                  }
                }}
                className={`flex items-end gap-2 mr-1 relative transition-[opacity,transform] duration-150 ${_isPowerOn && onUserCountClick ? 'cursor-pointer hover:opacity-75 active:scale-95' : ''}`}
                style={{ paddingBottom: '5px' }}
              >
                <div className="flex items-center justify-center w-[38px] h-[38px]">
                  <img
                    src={twinHeadsIcon}
                    alt="User Count Icon"
                    className="h-[38px] w-[38px] object-contain"
                    style={{ filter: 'drop-shadow(1px 1px 0px rgba(0,0,0,0.2))' }}
                  />
                </div>
                <div className="w-[38px] flex justify-end">
                  <span
                    className="text-2xl font-medium tracking-tight leading-none"
                    style={{
                      textShadow: '1px 1px 1px rgba(255,255,255,0.3)',
                      color: '#ffffff',
                    }}
                  >
                    {_isPowerOn ? userCount.toString().padStart(3, '0') : '000'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
