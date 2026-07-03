import { Suspense } from 'react';
import { toast } from 'sonner';
import { KaraokePlayerSkeleton } from './SkeletonLoaders';
import { ChannelListModal } from './ChannelListModal';
import { useRadioOrchestrator } from '../hooks/useRadioOrchestrator';

// Sub-components
import { RadioHeader, RadioLCD } from './radio/RadioHeader';
import { RadioBody } from './radio/RadioBody';
import { RadioFooter, RadioQuickDock } from './radio/RadioFooter';
import { RadioPanels } from './radio/RadioPanels';

import { FloatingKaraokePlayer } from './LazyFloatingKaraokePlayer';

export function RadioLayout() {
  const {
    isPowerOn,
    setChannelNumber,
    audioMode,
    isKaraokePlayerOpen,
    setIsKaraokePlayerOpen,
    setIsTransmitting,
    activeChannelObj,
    isSettingsOpen,
    setIsSettingsOpen,
    isChannelListOpen,
    setIsChannelListOpen,
    isUserListOpen,
    setIsUserListOpen,
    isManageOpen,
    setIsManageOpen,
    isWalletOpen,
    setIsWalletOpen,
    isRoipOpen,
    setIsRoipOpen,
    isChatOpen,
    setIsChatOpen,
    isQueueOpen,
    setIsQueueOpen,
    isPrivateOpen,
    setIsPrivateOpen,
    floatingReactions,
    waitTimer,
    dynamicUserList,
    dynamicUserCount,
    getThemeClass,
    themeText,
    status,
    pttAllowed,
    isBusy,
    handleSet,
    handleSendReaction,
    marqueeText,
    channelNameStr,
    isPanelOpen,
    roomId,
    userId,
    channel,
  } = useRadioOrchestrator();

  return (
    <div
      onClick={() => {
        if (isPowerOn && isUserListOpen) {
          setIsUserListOpen(false);
        }
      }}
      className={`w-full h-dvh sm:w-[360px] sm:h-[800px] bg-white sm:rounded-[40px] overflow-hidden relative sm:shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:border-[8px] sm:border-[#2a2d36] flex-shrink-0 flex flex-col ${getThemeClass(themeText)}`}
      style={{
        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.1)',
      }}
    >
      {isPanelOpen ? (
        <RadioPanels
          roomId={roomId}
          userId={userId}
          channelName={activeChannelObj?.name}
          isManageOpen={isManageOpen}
          setIsManageOpen={setIsManageOpen}
          isWalletOpen={isWalletOpen}
          setIsWalletOpen={setIsWalletOpen}
          isRoipOpen={isRoipOpen}
          setIsRoipOpen={setIsRoipOpen}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          isQueueOpen={isQueueOpen}
          setIsQueueOpen={setIsQueueOpen}
          isPrivateOpen={isPrivateOpen}
          setIsPrivateOpen={setIsPrivateOpen}
          isSettingsOpen={isSettingsOpen}
          setIsSettingsOpen={setIsSettingsOpen}
          isChannelListOpen={isChannelListOpen}
          setIsChannelListOpen={setIsChannelListOpen}
        />
      ) : (
        <div
          className="size-full flex flex-col items-center overflow-hidden relative transition-all duration-300"
          style={{
            background: 'var(--device-bg)',
            boxShadow: 'var(--device-shadow)',
            border: 'var(--device-border)',
          }}
        >
          {/* Header Section */}
          <RadioHeader
            isUserListOpen={isUserListOpen}
            setIsUserListOpen={setIsUserListOpen}
            marqueeText={marqueeText}
          />

          {/* Body Section */}
          <RadioBody
            isUserListOpen={isUserListOpen}
            setIsUserListOpen={setIsUserListOpen}
            floatingReactions={floatingReactions}
            waitTimer={waitTimer}
            isBusy={isBusy}
            status={status}
            dynamicUserList={dynamicUserList}
            channelNameStr={channelNameStr}
            onPressStart={() => {
              if (!pttAllowed) {
                toast.error(
                  status === 'muted'
                    ? 'Anda sedang dibungkam (muted) di channel ini.'
                    : status === 'ptt_blocked'
                      ? 'Hak PTT Anda diblokir di channel ini.'
                      : 'Tamu biasa dilarang menggunakan PTT di channel ini.'
                );
                return;
              }
              setIsTransmitting(true);
            }}
            onPressEnd={() => setIsTransmitting(false)}
            lcd={
              <RadioLCD
                userCount={dynamicUserCount}
                onUserCountClick={() => setIsUserListOpen(true)}
              />
            }
            footer={<RadioFooter onScan={() => setIsChannelListOpen(true)} onSet={handleSet} />}
            quickDock={
              <RadioQuickDock
                isUserListOpen={isUserListOpen}
                onOpenChat={() => setIsChatOpen(true)}
                onOpenQueue={() => setIsQueueOpen(true)}
                onSendReaction={handleSendReaction}
                getThemeClass={getThemeClass}
                channelNumber={channel}
              />
            }
            karaokePlayer={
              isPowerOn && audioMode === 'music' && isKaraokePlayerOpen ? (
                <div onClick={(e) => e.stopPropagation()}>
                  <Suspense fallback={<KaraokePlayerSkeleton />}>
                    <FloatingKaraokePlayer onClose={() => setIsKaraokePlayerOpen(false)} />
                  </Suspense>
                </div>
              ) : null
            }
          />
        </div>
      )}

      {/* Channel List Modal Dialog (Overlay when not main panel) */}
      {!isPanelOpen && isChannelListOpen && (
        <ChannelListModal
          onClose={() => setIsChannelListOpen(false)}
          onSelectChannel={(num: number) => setChannelNumber(num)}
        />
      )}

      {/* Preloaded Sound Reaction Players */}
      <audio id="audio-player-ketawa-nular" src="/sounds/ketawa_nular.mp3" preload="auto" />
      <audio id="audio-player-ketawa-anjay" src="/sounds/ketawa_anjay.mp3" preload="auto" />
    </div>
  );
}
