import vintageMic from '../../assets/vintage_mic.png';

export function NextVWTPremiumLogo() {
  return (
    <div className="flex items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="w-[52px] h-[52px] relative z-20"
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
      >
        <defs>
          <clipPath id="micClipPremium">
            <circle cx="50" cy="50" r="36" />
          </clipPath>
        </defs>

        <path
          d="M 22 77 A 38 38 0 1 1 78 77"
          stroke="#0a2e1a"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          transform="translate(1, 1.2)"
          opacity="0.5"
        />
        <path
          d="M 22 77 A 38 38 0 1 1 78 77"
          stroke="#34D399"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 22 77 A 38 38 0 1 1 78 77"
          stroke="#a7f3d0"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
          transform="translate(-0.6, -0.7)"
        />

        <path
          d="M 29 71 A 28 28 0 1 1 71 71"
          stroke="#713f12"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          transform="translate(1, 1.2)"
          opacity="0.5"
        />
        <path
          d="M 29 71 A 28 28 0 1 1 71 71"
          stroke="#eab308"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 29 71 A 28 28 0 1 1 71 71"
          stroke="#fef08a"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
          transform="translate(-0.6, -0.7)"
        />

        <path
          d="M 36 65 A 18 18 0 1 1 64 65"
          stroke="#003a17"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          transform="translate(1, 1.2)"
          opacity="0.5"
        />
        <path
          d="M 36 65 A 18 18 0 1 1 64 65"
          stroke="#00C853"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 36 65 A 18 18 0 1 1 64 65"
          stroke="#69f0ae"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
          transform="translate(-0.6, -0.7)"
        />

        <circle
          cx="50"
          cy="50"
          r="11"
          fill="#1a0000"
          transform="translate(1.2, 1.5)"
          opacity="0.45"
        />
        <image
          href={vintageMic}
          x="14"
          y="14"
          width="72"
          height="72"
          clipPath="url(#micClipPremium)"
          preserveAspectRatio="xMidYMid slice"
        />
      </svg>
      <div className="flex flex-col justify-center relative z-20 ml-2">
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
