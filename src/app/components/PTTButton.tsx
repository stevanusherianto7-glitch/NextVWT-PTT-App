import { usePTTStore } from '../store/usePTTStore';
import { usePttTransmit } from '../hooks/usePttTransmit';

interface PTTButtonProps {
  onPressStart: () => void;
  onPressEnd: () => void;
  isActive?: boolean;
  isBusy?: boolean;
  isMuted?: boolean;
  waitCountdown?: number | null;
}

export function PTTButton({
  onPressStart,
  onPressEnd,
  isActive = false,
  isBusy = false,
  isMuted = false,
  waitCountdown = null,
}: PTTButtonProps) {
  // Destructure settings and event handlers from custom transmit hook
  const { isDepressed, handleMouseDown, handleMouseUp, handleMouseLeave } = usePttTransmit({
    onPressStart,
    onPressEnd,
    isActive,
    isBusy,
  });

  const isPowerOn = usePTTStore((state) => state.isPowerOn);
  const pttSize = usePTTStore((state) => state.pttSize);
  const pttBottom = usePTTStore((state) => state.pttBottom);

  // Calculate dynamic scale factor and vertical offset
  const scaleFactor = 0.75 + (pttSize / 100) * 0.5; // at 30: 0.9, at 100: 1.25
  const yOffset = (50 - pttBottom) * 1.2; // vertical position adjustment

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: '332px',
        height: '102px',
        borderRadius: '51px',
        background: 'rgba(0, 0, 0, 0.12)',
        boxShadow: isDepressed
          ? 'inset 0 3px 6px rgba(0,0,0,0.4), inset 0 -6px 12px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.08)'
          : 'inset 0 6px 10px rgba(0,0,0,0.45), inset 0 -14px 20px rgba(0,0,0,0.75), inset 0 0 14px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.12)',
        transform: `translateY(${yOffset}px) scale(${scaleFactor})`,
        transition: 'transform 0.12s ease-out, box-shadow 0.06s ease-in-out',
      }}
    >
      <button
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseLeave}
        className="relative w-[326px] h-[96px] flex items-center justify-center overflow-hidden focus:outline-none"
        style={{
          borderRadius: '48px',
          background:
            !isPowerOn || isMuted
              ? 'linear-gradient(to bottom, #a3a3a3 0%, #737373 100%)' // Gray when power is off or muted
              : waitCountdown !== null || isBusy
                ? 'linear-gradient(to bottom, #f97316 0%, #ea580c 100%)' // Orange when busy or wait
                : isActive
                  ? 'linear-gradient(to bottom, #d62828 0%, #a01010 100%)' // Red when active
                  : 'linear-gradient(to bottom, #2cdb66 0%, #19ba42 100%)', // Green when idle
          boxShadow: isDepressed
            ? 'inset 0 8px 12px rgba(0, 0, 0, 0.85), inset 0 -2px 3px rgba(0, 0, 0, 0.2)'
            : !isPowerOn || isMuted
              ? 'inset 0 3px 6px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.25)'
              : waitCountdown !== null || isBusy
                ? 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 10px rgba(249, 115, 22, 0.4)'
                : isActive
                  ? 'inset 0 3px 6px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.2), 0 4px 6px rgba(0,0,0,0.3)'
                  : 'inset 0 3px 6px rgba(255, 255, 255, 0.8), 0 4px 10px rgba(44, 219, 102, 0.4)',
          transform: isDepressed ? 'translateY(4px)' : 'translateY(0)',
          border:
            !isPowerOn || isMuted
              ? '1px solid #666666'
              : waitCountdown !== null || isBusy
                ? '1px solid #c2410c'
                : isActive
                  ? '1px solid #730e0e'
                  : '1px solid #149c35',
          transition: 'transform 0.06s ease-in-out, box-shadow 0.06s ease-in-out',
        }}
      >
        <span
          className="relative z-10"
          style={{
            color: '#ffffff',
            fontSize: '44px',
            fontWeight: 800,
            letterSpacing: '3px',
            textShadow:
              isActive || isBusy
                ? '0 0 12px rgba(255, 255, 255, 0.6)'
                : '1px 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {waitCountdown !== null ? waitCountdown.toString() : isBusy ? 'BUSY' : 'PTT'}
        </span>

        {/* Top inner glass highlight (convex effect) */}
        <div
          className="absolute top-0.5 left-2 right-2 h-[34px] rounded-[34px] pointer-events-none transition-opacity duration-300"
          style={{
            background:
              'linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.0) 100%)',
            opacity: isActive && !isDepressed ? 0.6 : isDepressed ? 0.2 : 1,
          }}
        />
      </button>
    </div>
  );
}
