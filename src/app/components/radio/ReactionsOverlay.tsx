import { Player } from '@lottiefiles/react-lottie-player';
import applauseAnimation from '../../../assets/reactions/applause.json';
import loveAnimation from '../../../assets/reactions/love.json';
import wowAnimation from '../../../assets/reactions/wow.json';
import fireAnimation from '../../../assets/reactions/fire.json';
import crownAnimation from '../../../assets/reactions/crown.json';
import confettiAnimation from '../../../assets/reactions/confetti.json';
import kissAnimation from '../../../assets/reactions/kiss.json';
import bartSvg from '../../../assets/reactions/bart.svg';
import foxSvg from '../../../assets/reactions/fox.svg';

export interface FloatingReaction {
  id: string;
  category?: string;
  reaction: string;
  x: number;
  senderName?: string;
}

interface ReactionsOverlayProps {
  isUserListOpen: boolean;
  floatingReactions: FloatingReaction[];
}

export function ReactionsOverlay({ isUserListOpen, floatingReactions }: ReactionsOverlayProps) {
  return (
    <div
      className={`absolute inset-x-0 top-[14px] w-full max-w-[340px] mx-auto h-[426px] pointer-events-none z-30 overflow-hidden ${isUserListOpen ? 'flex items-center justify-center' : ''}`}
    >
      {floatingReactions.map((r) => {
        const floatAnim = isUserListOpen ? 'animate-float-center-up' : 'animate-float-up';
        const posStyle = isUserListOpen
          ? {
              position: 'absolute' as const,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
            }
          : {
              position: 'absolute' as const,
              bottom: 0,
              left: `${r.x}%`,
              transform: 'translateX(-50%)',
            };

        if (r.category === 'sound') {
          const soundEmojis: Record<string, string> = {
            laugh: '🤣',
            buzzer: '❌',
            drum: '🥁',
            horn: '🎺',
            ketawa_nular: '😆',
            ketawa_anjay: '😂',
          };
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div className={`${floatAnim} flex flex-col items-center gap-0.5 opacity-80`}>
                <span
                  className={
                    isUserListOpen
                      ? 'text-[110px] filter drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] select-none'
                      : 'text-[32px] select-none'
                  }
                >
                  {soundEmojis[r.reaction] || '🎵'}
                </span>
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[80px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (r.category === 'gift') {
          const giftEmojis: Record<string, string> = {
            giftbox: '🎁',
            rose: '🌹',
            diamond: '💎',
            coffee: '☕',
          };
          return (
            <div
              key={r.id}
              className="fixed inset-0 m-auto w-[200px] h-[200px] flex flex-col items-center justify-center animate-bounce z-[100] pointer-events-none"
            >
              <span
                className="text-[120px] select-none"
                style={{
                  filter: 'drop-shadow(0 0 10px gold) drop-shadow(0 0 25px rgba(255,215,0,0.6))',
                }}
              >
                {giftEmojis[r.reaction] || '🎁'}
              </span>
              {r.senderName && (
                <span className="text-[11px] font-bold text-white px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm shadow-lg whitespace-nowrap -mt-2">
                  {r.senderName}
                </span>
              )}
            </div>
          );
        }

        if (r.reaction === 'bart') {
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
                <img
                  src={bartSvg}
                  className="w-[110px] h-[110px] object-contain"
                  alt="Bart Simpson"
                />
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[110px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (r.reaction === 'fox') {
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
                <img src={foxSvg} className="w-[180px] h-[180px] object-contain" alt="Cute Fox" />
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[120px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (r.reaction === 'rocket') {
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div
                className={`${isUserListOpen ? 'animate-float-center-up' : 'animate-rocket-launch'} flex flex-col items-center gap-0.5`}
              >
                <span
                  className="text-[52px] select-none"
                  style={{
                    display: 'inline-block',
                    animation: isUserListOpen ? undefined : 'rocket3d 4s ease-out forwards',
                    filter:
                      'drop-shadow(0 0 10px rgba(255,140,0,0.95)) drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                  }}
                >
                  🚀
                </span>
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }
        if (r.reaction === 'lightning') {
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div
                className={`${isUserListOpen ? 'animate-float-center-up' : ''} flex flex-col items-center gap-0.5`}
              >
                <span
                  className="text-[58px] select-none"
                  style={{
                    display: 'inline-block',
                    animation: isUserListOpen ? undefined : 'lightning3d 4s ease-out forwards',
                    filter:
                      'drop-shadow(0 0 16px rgba(255,255,60,1)) drop-shadow(0 0 32px rgba(255,200,0,0.7))',
                  }}
                >
                  ⚡
                </span>
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (r.reaction === 'star3d') {
          return (
            <div
              key={r.id}
              className="flex flex-col items-center gap-0.5 pointer-events-none"
              style={posStyle}
            >
              <div
                className={`${isUserListOpen ? 'animate-float-center-up' : ''} flex flex-col items-center gap-0.5`}
              >
                <span
                  className="text-[56px] select-none"
                  style={{
                    display: 'inline-block',
                    animation: isUserListOpen ? undefined : 'star3dSpin 4.5s ease-out forwards',
                    filter:
                      'drop-shadow(0 0 14px rgba(255,220,0,0.95)) drop-shadow(0 0 28px rgba(255,180,0,0.6))',
                  }}
                >
                  🌟
                </span>
                {r.senderName && (
                  <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[90px] truncate">
                    {r.senderName}
                  </span>
                )}
              </div>
            </div>
          );
        }

        if (r.reaction === 'lion' || r.reaction === 'aquarium') {
          if (isUserListOpen) return null; // Rendered as background behind UserListModal instead
          const isLion = r.reaction === 'lion';
          const videoId = isLion ? 'SvBAptWsNZo' : 'jBbqxCpUsjM';
          return (
            <div
              key={r.id}
              className="absolute inset-0 w-full h-full z-40 pointer-events-auto flex flex-col items-center justify-center bg-black animate-in fade-in duration-300"
            >
              <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0&iv_load_policy=3&vq=highres`}
                  title={isLion ? '3D Lion Reaction' : 'Aquarium / Relaxing Reaction'}
                  className="absolute pointer-events-none"
                  style={{
                    border: 'none',
                    width: '1084px',
                    height: '610px',
                    top: '-92px',
                    left: '-372px',
                    filter: 'brightness(1.45) contrast(1.15) saturate(1.25)',
                  }}
                />
                {/* Overlay to prevent clicking/navigating inside the iframe */}
                <div className="absolute inset-0 bg-transparent" />
              </div>
              {r.senderName && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
                  <span className="text-[10px] font-bold text-white px-3 py-1.5 rounded-full bg-black/80 border border-white/10 backdrop-blur-sm shadow-md whitespace-nowrap">
                    REAKSI DARI: {r.senderName.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          );
        }

        const animationMap: Record<string, unknown> = {
          applause: applauseAnimation,
          love: loveAnimation,
          kiss: kissAnimation,
          wow: wowAnimation,
          fire: fireAnimation,
          crown: crownAnimation,
          confetti: confettiAnimation,
        };
        const animData = animationMap[r.reaction];
        return (
          <div
            key={r.id}
            className="flex flex-col items-center gap-0.5 pointer-events-none"
            style={posStyle}
          >
            <div className={`${floatAnim} flex flex-col items-center gap-0.5`}>
              {animData ? (
                <Player
                  autoplay
                  loop={false}
                  src={animData}
                  style={{ width: '110px', height: '110px' }}
                />
              ) : (
                <span className="text-4xl">🔥</span>
              )}
              {r.senderName && (
                <span className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm leading-none whitespace-nowrap max-w-[110px] truncate">
                  {r.senderName}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
