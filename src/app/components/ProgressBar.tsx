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
    <div
      className="w-[280px] h-[14px] rounded-full overflow-hidden relative transition-all duration-300"
      style={{
        background: 'var(--progress-bg)',
        boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.1), inset 0 2.5px 5px rgba(0,0,0,0.25)',
        border: '1px solid rgba(0,0,0,0.12)',
      }}
    >
      {/* The moving mask */}
      <div
        className="h-full transition-all duration-75 relative z-10"
        style={{ width: `${progress}%`, overflow: 'hidden', transition: 'none' }}
      >
        {/* The static laser spectrum */}
        <div
          className="h-full relative"
          style={{
            width: '280px', // Must match parent width
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.15) 20%, transparent 40%, rgba(0,0,0,0.85) 100%), linear-gradient(to right, #00ff55 0%, #00ff55 62.5%, #ffff00 62.5%, #ffff00 83.3%, #ff003c 83.3%, #ff003c 100%)',
            boxShadow: 'inset 0 0 6px rgba(255,255,255,0.9), 0 0 15px rgba(255,255,255,0.5)',
          }}
        />
      </div>

      {/* Scanning Laser Head (leading edge indicator) */}
      {progress > 0 && (
        <div
          className="absolute top-0 bottom-0 w-[4px] -ml-[2px] z-20 pointer-events-none transition-all duration-75"
          style={{
            left: `${progress}%`,
            background: '#fff',
            boxShadow: `0 0 12px #fff, 0 0 25px ${headGlow}, 0 0 42px ${headGlow}`,
            borderRadius: '2px',
            transition: 'none',
          }}
        />
      )}
    </div>
  );
}
