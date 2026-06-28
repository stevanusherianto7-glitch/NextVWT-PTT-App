import { Player } from '@lottiefiles/react-lottie-player';
import { PTTButton } from '../PTTButton';
import { ProgressBar } from '../ProgressBar';
import { UserListModal, UserListModalProps } from '../UserListModal';
import { usePTTStore } from '../../store/usePTTStore';

import applauseAnimation from '../../../assets/reactions/applause.json';
import loveAnimation from '../../../assets/reactions/love.json';
import wowAnimation from '../../../assets/reactions/wow.json';
import fireAnimation from '../../../assets/reactions/fire.json';
import crownAnimation from '../../../assets/reactions/crown.json';
import confettiAnimation from '../../../assets/reactions/confetti.json';
import kissAnimation from '../../../assets/reactions/kiss.json';
import bartSvg from '../../../assets/reactions/bart.svg';
import foxSvg from '../../../assets/reactions/fox.svg';

interface FloatingReaction {
  id: string;
  category?: string;
  reaction: string;
  x: number;
  senderName?: string;
}

interface RadioBodyProps {
  isUserListOpen: boolean;
  setIsUserListOpen: (open: boolean) => void;
  floatingReactions: FloatingReaction[];
  waitTimer: number | null;
  isBusy: boolean;
  status: string;
  dynamicUserList: UserListModalProps['users'];
  channelNameStr: string;
  onPressStart: () => void;
  onPressEnd: () => void;
  lcd: React.ReactNode;
  footer: React.ReactNode;
  quickDock: React.ReactNode;
  karaokePlayer: React.ReactNode;
}

export function RadioBody({
  isUserListOpen,
  setIsUserListOpen,
  floatingReactions,
  waitTimer,
  isBusy,
  status,
  dynamicUserList,
  channelNameStr,
  onPressStart,
  onPressEnd,
  lcd,
  footer,
  quickDock,
  karaokePlayer,
}: RadioBodyProps) {
  const {
    isPowerOn,
    channelNumber: channel,
    showModulator,
    showPTT,
    isTransmitting,
    progress,
  } = usePTTStore();

  return (
    <div
      onClick={() => {
        if (isPowerOn && isUserListOpen) {
          setIsUserListOpen(false);
        }
      }}
      className="flex-1 min-h-0 w-full max-w-[400px] flex flex-col items-center pt-[14px] px-[10px] pb-24 relative cursor-default"
    >
      {isUserListOpen ? (
        <div className="w-full max-w-[340px] h-[426px] relative -mt-[14px] overflow-hidden">
          {/* Background Video Reaction (Lion or Aquarium) */}
          {isPowerOn &&
            floatingReactions.some((r) => r.reaction === 'lion' || r.reaction === 'aquarium') &&
            (() => {
              const activeReaction = floatingReactions.find(
                (r) => r.reaction === 'lion' || r.reaction === 'aquarium'
              );
              const isLion = activeReaction?.reaction === 'lion';
              const videoId = isLion ? 'SvBAptWsNZo' : 'jBbqxCpUsjM';
              return (
                <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-black animate-in fade-in duration-300">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&modestbranding=1&rel=0&iv_load_policy=3&vq=highres`}
                    title={isLion ? '3D Lion Background' : 'Aquarium / Relaxing Background'}
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
                  <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 via-transparent to-black/10 pointer-events-none" />
                </div>
              );
            })()}
          <UserListModal
            channel={channel}
            channelName={channelNameStr}
            users={dynamicUserList}
            onClose={() => setIsUserListOpen(false)}
            hasVideoBackground={
              isPowerOn &&
              floatingReactions.some((r) => r.reaction === 'lion' || r.reaction === 'aquarium')
            }
          />
        </div>
      ) : (
        <div className="w-full h-[424px] flex flex-col justify-start items-center relative">
          {/* Themed Faceplate Container */}
          <div
            className="w-full flex flex-col items-center pt-6 pb-3 relative z-10 transition-all duration-300"
            style={{
              borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
              background: 'var(--panel-bg)',
              boxShadow: 'var(--panel-shadow)',
              border: 'var(--panel-border)',
              backdropFilter: 'var(--panel-blur)',
            }}
          >
            {/* 3D Faceplate Outer Highlight and Shadow Overlay */}
            <div
              className="absolute inset-0 pointer-events-none z-20"
              style={{
                borderRadius: '40px 40px 200px 200px / 40px 40px 90px 90px',
                boxShadow:
                  'inset 0 3px 4px rgba(100, 116, 139, 0.5), inset 3px 0 4px rgba(100, 116, 139, 0.5), inset 4px 4px 6px rgba(100, 116, 139, 0.45), inset -4px -4px 8px rgba(0, 0, 0, 0.35), inset 0 -3px 5px rgba(0, 0, 0, 0.3)',
              }}
            />

            {/* Render LCD Panel */}
            {lcd}

            {/* Progress Bar (Modulator) */}
            {showModulator && (
              <div
                className={`mt-2 flex justify-center transition-opacity duration-300 w-full ${isPowerOn ? 'opacity-100' : 'opacity-30'}`}
              >
                <ProgressBar progress={progress} />
              </div>
            )}

            {/* Render Control Buttons */}
            {footer}
          </div>
        </div>
      )}

      {/* Floating Reactions Overlay */}
      {isPowerOn && isUserListOpen && floatingReactions.length > 0 && (
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
                  className="fixed inset-0 m-auto w-[150px] h-[150px] flex items-center justify-center animate-bounce z-[100] pointer-events-none drop-shadow-2xl"
                >
                  <span className="text-[120px] filter drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                    {giftEmojis[r.reaction] || '🎁'}
                  </span>
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
                    <img
                      src={foxSvg}
                      className="w-[180px] h-[180px] object-contain"
                      alt="Cute Fox"
                    />
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
      )}

      {/* Render Quick Action Dock */}
      {quickDock}

      {/* PTT Button */}
      {showPTT && (
        <div
          className={`absolute left-0 right-0 w-full flex justify-center transition-opacity duration-300 opacity-100 ${isPowerOn ? '' : 'pointer-events-none'}`}
          style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 8px))' }}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PTTButton
              isActive={isTransmitting}
              isBusy={isBusy}
              isMuted={status === 'muted'}
              waitCountdown={waitTimer}
              onPressStart={() => {
                if (isPowerOn) {
                  onPressStart();
                }
              }}
              onPressEnd={onPressEnd}
            />
          </div>
        </div>
      )}

      {/* Render Floating Karaoke Player */}
      {karaokePlayer}
    </div>
  );
}
