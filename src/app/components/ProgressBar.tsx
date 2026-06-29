interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  // Determine scanning head glow color dynamically based on progress
  let headGlow = '#00ff66';
  if (progress > 83.3) {
    headGlow = '#ff3333';
  } else if (progress > 62.5) {
    headGlow = '#ffaa00';
  }

  return (
    <div className="w-[280px] h-[14px] relative">
      {/* The main rail container with overflow-hidden */}
      <div
        className="w-full h-full rounded-full overflow-hidden absolute inset-0 transition-all duration-300"
        style={{
          background: 'var(--progress-bg)',
          boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.1), inset 0 2.5px 5px rgba(0,0,0,0.25)',
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        {/* The moving mask */}
        <div
          className="h-full transition-all duration-75 relative z-10"
          style={{
            width: `${progress}%`,
            overflow: 'hidden',
            transition: 'width 90ms cubic-bezier(0.1, 0.8, 0.25, 1)',
          }}
        >
          {/* The static laser spectrum */}
          <div
            className="h-full relative"
            style={{
              width: '280px', // Must match parent width
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.2) 20%, transparent 45%, rgba(0,0,0,0.9) 100%), linear-gradient(to right, #00C853 0%, #00C853 62.5%, #FFD600 62.5%, #FFD600 83.3%, #FF1744 83.3%, #FF1744 100%)',
              boxShadow: 'inset 0 0 8px rgba(255,255,255,0.85), 0 0 20px rgba(0,255,102,0.3)',
            }}
          />
        </div>
      </div>

      {/* Redesigned Premium Vertical Laser Needle (Rendered outside overflow-hidden to allow vertical overflow) */}
      {progress > 0 && (
        <div
          className="absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          style={{
            left: `calc(7px + ${progress}% - ${progress * 0.14}px)`,
            width: '0px',
            height: '0px',
            transition: 'left 90ms cubic-bezier(0.1, 0.8, 0.25, 1)',
          }}
        >
          {/* Soft neon bloom layer */}
          <div
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[10px] h-[22px] rounded-full opacity-65 filter blur-[1.5px]"
            style={{
              background: headGlow,
              boxShadow: `0 0 10px ${headGlow}, 0 0 20px ${headGlow}`,
            }}
          />
          {/* Sharp High-Intensity Neon Needle */}
          <div
            className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-[3.5px] h-[18px] rounded-[1px]"
            style={{
              background: 'linear-gradient(to bottom, #ffffff 10%, #ffffff 90%)',
              boxShadow: `0 0 4px #ffffff, 0 0 8px ${headGlow}`,
              borderLeft: '0.5px solid rgba(255,255,255,0.5)',
              borderRight: '0.5px solid rgba(255,255,255,0.5)',
            }}
          />
        </div>
      )}

      {/* Level modulation description label */}
      {progress > 0 && (
        <div
          className="absolute -bottom-4 left-0 right-0 text-center select-none pointer-events-none"
          style={{
            fontSize: '8px',
            letterSpacing: '1.5px',
            opacity: 0.85,
            fontFamily: "'Outfit', 'Orbitron', monospace",
            fontWeight: 'bold',
          }}
        >
          {progress > 83.3 ? (
            <span style={{ color: '#ff3333' }}>◉ MODULASI PENUH</span>
          ) : progress > 62.5 ? (
            <span style={{ color: '#ffaa00' }}>◎ CUKUP TERDENGAR</span>
          ) : progress > 15 ? (
            <span style={{ color: '#00C853' }}>○ SUARA LEMAH</span>
          ) : (
            <span style={{ color: '#888' }}>· TIDAK TERDETEKSI</span>
          )}
        </div>
      )}
    </div>
  );
}
