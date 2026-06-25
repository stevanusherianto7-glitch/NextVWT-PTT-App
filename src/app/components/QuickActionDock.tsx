import { useState, useRef, useEffect } from 'react';
import { Smile, MessageSquare, Music } from 'lucide-react';

interface QuickActionDockProps {
  onOpenChat: () => void;
  onOpenQueue: () => void;
  onSendReaction: (category: 'animation' | 'sound' | 'gift', reaction: string) => void;
  isPowerOn: boolean;
  showSocialFeatures?: boolean;
  themeKey?: string;
}

export function QuickActionDock({
  onOpenChat,
  onOpenQueue,
  onSendReaction,
  isPowerOn,
  showSocialFeatures = false,
  themeKey = 'theme-classic',
}: QuickActionDockProps) {
  const [showReactions, setShowReactions] = useState(false);
  const [activeTab, setActiveTab] = useState<'animation' | 'sound' | 'gift'>('animation');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Map each theme to an accent color for the dock
  const THEME_ACCENT: Record<string, { color: string; glow: string; tint: string }> = {
    'theme-classic': { color: '#00C853', glow: 'rgba(0,200,83,0.25)', tint: 'rgba(0,200,83,0.08)' },
    'theme-v1': { color: '#00b4d8', glow: 'rgba(0,180,216,0.25)', tint: 'rgba(0,180,216,0.08)' },
    'theme-v2': { color: '#10b981', glow: 'rgba(16,185,129,0.25)', tint: 'rgba(16,185,129,0.08)' },
    'theme-v3': { color: '#00e5ff', glow: 'rgba(0,229,255,0.25)', tint: 'rgba(0,229,255,0.08)' },
    'theme-v4': { color: '#39ff14', glow: 'rgba(57,255,20,0.25)', tint: 'rgba(57,255,20,0.08)' },
    'theme-v5': { color: '#e040fb', glow: 'rgba(224,64,251,0.25)', tint: 'rgba(224,64,251,0.08)' },
    'theme-v6': { color: '#0077b6', glow: 'rgba(0,119,182,0.25)', tint: 'rgba(0,119,182,0.08)' },
    'theme-monokrom': {
      color: '#64748b',
      glow: 'rgba(100,116,139,0.2)',
      tint: 'rgba(100,116,139,0.06)',
    },
  };
  const accent = THEME_ACCENT[themeKey] ?? THEME_ACCENT['theme-classic'];

  const animationReactions = [
    { kind: 'applause', emoji: '👏' },
    { kind: 'love', emoji: '❤️' },
    { kind: 'kiss', emoji: '😘' },
    { kind: 'wow', emoji: '😮' },
    { kind: 'fire', emoji: '🔥' },
    { kind: 'crown', emoji: '👑' },
    { kind: 'confetti', emoji: '🎉' },
    { kind: 'bart', emoji: '🛹' },
    { kind: 'fox', emoji: '🦊' },
    { kind: 'rocket', emoji: '🚀' },
    { kind: 'lightning', emoji: '⚡' },
    { kind: 'star3d', emoji: '🌟' },
  ];

  const soundReactions = [
    { kind: 'laugh', emoji: '🤣' },
    { kind: 'buzzer', emoji: '❌' },
    { kind: 'drum', emoji: '🥁' },
    { kind: 'horn', emoji: '🎺' },
  ];

  const giftReactions = [
    { kind: 'giftbox', emoji: '🎁' },
    { kind: 'rose', emoji: '🌹' },
    { kind: 'diamond', emoji: '💎' },
    { kind: 'coffee', emoji: '☕' },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowReactions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleReactionClick = (category: 'animation' | 'sound' | 'gift', kind: string) => {
    if (!isPowerOn) return;
    onSendReaction(category, kind);
    setShowReactions(false);
  };

  const allButtons = [
    {
      id: 'reaction',
      label: 'Reaksi',
      icon: <Smile className="w-[18px] h-[18px]" />,
      iconColor: '#fbbf24',
      glowColor: 'rgba(251,191,36,0.35)',
      onClick: () => setShowReactions(!showReactions),
      active: showReactions,
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageSquare className="w-[18px] h-[18px]" />,
      iconColor: '#38bdf8',
      glowColor: 'rgba(56,189,248,0.35)',
      onClick: onOpenChat,
      active: false,
    },
    {
      id: 'queue',
      label: 'Queue',
      icon: <Music className="w-[18px] h-[18px]" />,
      iconColor: '#a78bfa',
      glowColor: 'rgba(167,139,250,0.35)',
      onClick: onOpenQueue,
      active: false,
    },
  ];

  const actionButtons = allButtons.filter(() => showSocialFeatures);

  if (actionButtons.length === 0) return null;

  return (
    <div className="w-full mt-1.5 relative z-30 flex justify-center">
      {/* ── Reaction Popover (Centered over the dock) ── */}
      {showReactions && (
        <div
          ref={popoverRef}
          className="absolute bottom-[80px] left-1/2 -translate-x-1/2 z-50 p-2 rounded-2xl flex flex-col gap-2 min-w-[200px]"
          style={{
            background: 'linear-gradient(160deg, rgba(22,26,38,0.97) 0%, rgba(12,14,22,0.98) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderTop: '1px solid rgba(255,255,255,0.16)',
            boxShadow: [
              '0 2px 0 rgba(255,255,255,0.05) inset',
              '0 16px 48px rgba(0,0,0,0.75)',
              '0 4px 12px rgba(0,0,0,0.4)',
              '0 0 0 1px rgba(0,0,0,0.3)',
            ].join(', '),
            animation: 'qdPopIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both',
          }}
        >
          {/* Tabs */}
          <div className="flex bg-black/40 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('animation')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'animation' ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={
                activeTab === 'animation'
                  ? {
                      background: accent.tint,
                      color: '#ffffff',
                      boxShadow: `0 0 8px ${accent.glow}`,
                    }
                  : {}
              }
            >
              Animasi
            </button>
            <button
              onClick={() => setActiveTab('sound')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'sound' ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={
                activeTab === 'sound'
                  ? {
                      background: accent.tint,
                      color: '#ffffff',
                      boxShadow: `0 0 8px ${accent.glow}`,
                    }
                  : {}
              }
            >
              Suara
            </button>
            <button
              onClick={() => setActiveTab('gift')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'gift' ? 'text-white' : 'text-white/50 hover:text-white'}`}
              style={
                activeTab === 'gift'
                  ? {
                      background: accent.tint,
                      color: '#ffffff',
                      boxShadow: `0 0 8px ${accent.glow}`,
                    }
                  : {}
              }
            >
              Gifts
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {(activeTab === 'animation'
              ? animationReactions
              : activeTab === 'sound'
                ? soundReactions
                : giftReactions
            ).map((r) => (
              <button
                type="button"
                key={r.kind}
                onClick={() => handleReactionClick(activeTab, r.kind)}
                className="w-10 h-10 flex items-center justify-center text-[22px] rounded-xl cursor-pointer focus:outline-none transition-all duration-100 active:scale-90"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    'linear-gradient(145deg, rgba(255,255,255,0.09), rgba(255,255,255,0.04))';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }}
                title={r.kind}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Floating Skeuomorphic + Glassmorphic Container ── */}
      <div
        className={`relative max-w-[230px] w-full flex items-end justify-around px-3 py-1.5 rounded-2xl transition-all duration-300 ${
          isPowerOn ? '' : 'opacity-35 pointer-events-none'
        }`}
        style={{
          /* Glassmorphic base tinted by theme */
          background: `linear-gradient(145deg, ${accent.tint} 0%, rgba(15,18,28,0.92) 100%)`,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          /* Skeuomorphic bevel: bright top-left, dark bottom-right */
          border: `1px solid ${accent.glow}`,
          borderTop: `1px solid ${accent.color}44`,
          borderLeft: `1px solid ${accent.color}22`,
          borderBottom: '1px solid rgba(0,0,0,0.45)',
          borderRight: '1px solid rgba(0,0,0,0.35)',
          /* Floating elevation shadow */
          boxShadow: [
            `0 2px 0 ${accent.color}18 inset` /* top inner accent highlight */,
            '0 -1px 0 rgba(0,0,0,0.5) inset' /* bottom inner shadow */,
            `0 8px 32px rgba(0,0,0,0.55)` /* main drop shadow */,
            `0 4px 16px ${accent.glow}` /* theme glow */,
            '0 0 0 1px rgba(0,0,0,0.25)' /* outer edge */,
          ].join(', '),
        }}
      >
        {/* Subtle top-edge gloss strip — tinted with theme accent */}
        <div
          className="absolute top-0 left-3 right-3 h-px pointer-events-none rounded-full"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent.color}55, transparent)`,
          }}
        />

        {actionButtons.map((btn, index) => (
          <div key={btn.id} className="relative flex flex-col items-center gap-1">
            {/* Vertical divider between buttons */}
            {index > 0 && (
              <div
                className="absolute left-[-12px] top-[4px] bottom-[16px] w-px pointer-events-none"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, rgba(255,255,255,0.07) 40%, rgba(255,255,255,0.07) 60%, transparent)',
                }}
              />
            )}

            {/* Reaction popover removed from here and placed at the root of the dock */}

            {/* ── Skeuomorphic Glass Keycap Button ── */}
            <button
              type="button"
              onClick={btn.onClick}
              disabled={!isPowerOn}
              title={btn.label}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer focus:outline-none transition-all duration-100 group"
              style={{
                background: btn.active
                  ? `linear-gradient(160deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)`
                  : `linear-gradient(160deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.02) 100%)`,
                backdropFilter: 'blur(32px) saturate(220%)',
                WebkitBackdropFilter: 'blur(32px) saturate(220%)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: btn.active
                  ? '1px solid rgba(0,0,0,0.4)'
                  : '1px solid rgba(255,255,255,0.45)',
                borderLeft: btn.active
                  ? '1px solid rgba(0,0,0,0.3)'
                  : '1px solid rgba(255,255,255,0.35)',
                borderBottom: btn.active
                  ? '1px solid rgba(255,255,255,0.05)'
                  : '1px solid rgba(0,0,0,0.6)',
                borderRight: btn.active
                  ? '1px solid rgba(255,255,255,0.04)'
                  : '1px solid rgba(0,0,0,0.4)',
                boxShadow: btn.active
                  ? [
                      '0 1px 3px rgba(0,0,0,0.6) inset',
                      '0 2px 6px rgba(0,0,0,0.4) inset',
                      `0 0 10px ${btn.glowColor}`,
                    ].join(', ')
                  : [
                      '0 4px 6px -1px rgba(255,255,255,0.2) inset',
                      '0 -2px 4px rgba(0,0,0,0.5) inset',
                      '0 8px 16px -2px rgba(0,0,0,0.5)',
                      '0 2px 4px rgba(0,0,0,0.3)',
                    ].join(', '),
                transform: btn.active ? 'translateY(1.5px)' : 'translateY(0)',
                color: btn.iconColor,
              }}
              onMouseDown={(e) => {
                const el = e.currentTarget;
                el.style.transform = 'translateY(1.5px)';
                el.style.boxShadow = [
                  '0 1px 3px rgba(0,0,0,0.6) inset',
                  '0 2px 6px rgba(0,0,0,0.4) inset',
                  `0 0 8px ${btn.glowColor}`,
                ].join(', ');
              }}
              onMouseUp={(e) => {
                const el = e.currentTarget;
                if (!btn.active) {
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = [
                    '0 4px 6px -1px rgba(255,255,255,0.2) inset',
                    '0 -2px 4px rgba(0,0,0,0.5) inset',
                    '0 8px 16px -2px rgba(0,0,0,0.5)',
                    '0 2px 4px rgba(0,0,0,0.3)',
                  ].join(', ');
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (!btn.active) {
                  el.style.transform = 'translateY(0)';
                }
              }}
            >
              {/* Icon glow layer */}
              <div
                className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{
                  background: `radial-gradient(circle at 50% 60%, ${btn.glowColor} 0%, transparent 70%)`,
                }}
              />
              {/* Top gloss strip */}
              <div
                className="absolute top-0 left-2 right-2 h-px rounded-full pointer-events-none"
                style={{
                  background: btn.active
                    ? 'rgba(0,0,0,0.3)'
                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                }}
              />
              {/* Icon with glowing outline effect */}
              <div
                className="relative z-10 transition-all duration-300"
                style={{
                  filter: `drop-shadow(0 0 3px ${btn.iconColor}) drop-shadow(0 0 8px ${btn.glowColor})`,
                }}
              >
                {btn.icon}
              </div>
            </button>

            {/* Label */}
            <span
              className="text-[8.5px] font-bold uppercase tracking-widest select-none leading-none"
              style={{ color: 'rgba(255,255,255,0.90)' }}
            >
              {btn.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes qdPopIn {
          from { opacity: 0; transform: translateY(8px) scale(0.90); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </div>
  );
}
