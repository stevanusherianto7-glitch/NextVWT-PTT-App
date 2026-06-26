import vintageMic from '../../assets/vintage_mic.png';

export function NextVWTPremiumLogo() {
  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-[52px] h-[52px] relative z-20"
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
      <div className="flex flex-col justify-center relative z-20 ml-0">
        <span
          className="text-[18px] leading-none tracking-wide select-none"
          style={{
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          <span className="font-medium" style={{ color: 'var(--header-text-color, #ffffff)' }}>
            Next
          </span>
          <span className="font-black text-[#00C853]">VWT</span>
        </span>
      </div>
    </div>
  );
}
