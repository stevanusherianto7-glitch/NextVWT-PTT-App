import { Suspense, lazy } from 'react';
import { ChannelManagePanel } from '../../../features/moderation/ChannelManagePanel';
import { WalletPanel } from '../../../features/payment/WalletPanel';
import { ROIPBridgePanel } from '../../../features/roip/ROIPBridgePanel';
import { ChatRoomPanel } from '../../../features/chat/ChatRoomPanel';
import { KaraokeQueuePanel } from '../../../features/karaoke-queue/KaraokeQueuePanel';
import { PrivateChannelPanel } from '../../../features/moderation/PrivateChannelPanel';
import { ChannelListModal } from '../ChannelListModal';
import { FeedbackModal } from '../FeedbackModal';
import { SettingsPanelSkeleton } from '../SkeletonLoaders';
import { usePTTStore } from '../../store/usePTTStore';

// Lazy-loaded settings panel
const SettingsPanel = lazy(async () => {
  const m = await import('../SettingsPanel');
  return {
    default: m.SettingsPanel,
  };
});

interface RadioPanelsProps {
  roomId: string;
  userId: string;
  channelName: string | undefined;
  isManageOpen: boolean;
  setIsManageOpen: (open: boolean) => void;
  isWalletOpen: boolean;
  setIsWalletOpen: (open: boolean) => void;
  isRoipOpen: boolean;
  setIsRoipOpen: (open: boolean) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  isQueueOpen: boolean;
  setIsQueueOpen: (open: boolean) => void;
  isPrivateOpen: boolean;
  setIsPrivateOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  isChannelListOpen: boolean;
  setIsChannelListOpen: (open: boolean) => void;
}

export function RadioPanels({
  roomId,
  userId,
  channelName,
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
  isSettingsOpen,
  setIsSettingsOpen,
  isChannelListOpen,
  setIsChannelListOpen,
}: RadioPanelsProps) {
  const { setChannelNumber } = usePTTStore();

  if (isManageOpen) {
    return (
      <ChannelManagePanel
        roomId={roomId}
        userId={userId}
        initialChannelName={channelName}
        onClose={() => setIsManageOpen(false)}
        onOpenPrivate={() => {
          setIsManageOpen(false);
          setIsPrivateOpen(true);
        }}
      />
    );
  }

  if (isWalletOpen) {
    return <WalletPanel onClose={() => setIsWalletOpen(false)} />;
  }

  if (isRoipOpen) {
    return <ROIPBridgePanel onClose={() => setIsRoipOpen(false)} />;
  }

  if (isChatOpen) {
    return <ChatRoomPanel onClose={() => setIsChatOpen(false)} />;
  }

  if (isQueueOpen) {
    return <KaraokeQueuePanel onClose={() => setIsQueueOpen(false)} />;
  }

  if (isPrivateOpen) {
    return <PrivateChannelPanel onClose={() => setIsPrivateOpen(false)} />;
  }

  if (isSettingsOpen) {
    return (
      <Suspense fallback={<SettingsPanelSkeleton />}>
        <SettingsPanel
          onClose={() => setIsSettingsOpen(false)}
          onOpenModeration={() => setIsManageOpen(true)}
          onOpenRoip={() => setIsRoipOpen(true)}
        />
      </Suspense>
    );
  }

  return (
    <>
      {isChannelListOpen && (
        <ChannelListModal
          onClose={() => setIsChannelListOpen(false)}
          onSelectChannel={(num) => setChannelNumber(num)}
        />
      )}
      <FeedbackModal />
    </>
  );
}
