import { ToggleSwitch } from '../ToggleSwitch';
import { LCDPanel } from '../LCDPanel';
import { usePTTStore } from '../../store/usePTTStore';
import vintageMic from '../../../assets/vintage_mic.png';

interface RadioHeaderProps {
  isUserListOpen: boolean;
  setIsUserListOpen: (open: boolean) => void;
  marqueeText: string;
}

export function RadioHeader({ isUserListOpen, setIsUserListOpen, marqueeText }: RadioHeaderProps) {
  const { isPowerOn, isTransmitting, setPower } = usePTTStore();

  return (
    <div
      className="w-full h-[70px] flex items-center justify-between pr-5 z-20 relative overflow-hidden"
      style={{
        paddingLeft: 'max(4px, calc(50% - 176.16px))',
        background: 'var(--header-bg)',
        boxShadow:
          'var(--header-shadow), inset 0 -12px 20px -6px rgba(0, 0, 0, 0.45), inset 0 3px 6px rgba(255, 255, 255, 0.4)',
        borderBottom: 'var(--header-border)',
      }}
    >
      {/* Top Glossy Reflection */}
      <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/35 to-transparent pointer-events-none z-10" />
      <div
        onClick={() => {
          if (isPowerOn) {
            setIsUserListOpen(!isUserListOpen);
          }
        }}
        className={`flex items-center gap-3 relative z-20 ${isPowerOn ? 'cursor-pointer hover:opacity-85 active:scale-98 transition-all' : ''}`}
      >
        {/* Logo Section */}
        <div className="relative flex items-center justify-center h-full">
          <div className="relative flex items-center justify-center">
            {isTransmitting && (
              <div
                data-testid="transmitting-indicator"
                className="absolute inset-0 pointer-events-none flex items-center justify-center"
              >
                <span className="sr-only">ON AIR</span>
                <div className="logo-transmitting-bg" style={{ width: '100px', height: '100px' }}>
                  <div className="extra-ripple"></div>
                </div>
              </div>
            )}
            <svg
              viewBox="0 0 100 100"
              className="w-[68px] h-[68px] relative z-20 transition-all duration-300"
              style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
            >
              <image
                href={vintageMic}
                x="0"
                y="0"
                width="100"
                height="100"
                preserveAspectRatio="xMidYMid meet"
              />
            </svg>
          </div>
          <div className="flex flex-col justify-center relative z-20 transition-all duration-300 ml-0">
            <span
              className="text-[16px] leading-none tracking-wide select-none"
              style={{
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              <span className="font-medium" style={{ color: 'var(--header-text-color)' }}>
                Next
              </span>
              <span className="font-black text-[#00C853]">VWT</span>
            </span>
            <div className="w-[120px] overflow-hidden whitespace-nowrap relative h-[20px] mt-0.5">
              <div
                className="absolute top-0 left-0 inline-block animate-marquee text-[10px] font-semibold tracking-wide leading-none py-0.5"
                style={{ color: 'var(--header-text-color)', opacity: 0.65 }}
              >
                {marqueeText}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ToggleSwitch isOn={isPowerOn} onToggle={() => setPower(!isPowerOn)} />
      </div>
    </div>
  );
}

interface RadioLCDProps {
  userCount: number;
  onUserCountClick: () => void;
}

export function RadioLCD({ userCount, onUserCountClick }: RadioLCDProps) {
  const { channelNumber, isConnected, isPowerOn } = usePTTStore();

  return (
    <div className="transition-opacity duration-300 flex justify-center w-full relative">
      <LCDPanel
        channel={channelNumber}
        userCount={userCount}
        isOffline={isPowerOn ? false : !isConnected}
        isPowerOn={isPowerOn}
        onUserCountClick={onUserCountClick}
      />
    </div>
  );
}
