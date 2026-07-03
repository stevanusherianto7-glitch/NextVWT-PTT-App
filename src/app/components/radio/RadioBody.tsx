import { PTTButton } from '../PTTButton';
import { UserListModalProps } from '../UserListModal';
import { usePTTStore } from '../../store/usePTTStore';
import { FloatingReaction, ReactionsOverlay } from './ReactionsOverlay';
import { PTTArea } from './PTTArea';
import { UserListOverlay } from './UserListOverlay';

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
  const { isPowerOn, channelNumber: channel, showPTT, isTransmitting } = usePTTStore();

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
        <UserListOverlay
          isPowerOn={isPowerOn}
          channel={channel}
          channelNameStr={channelNameStr}
          dynamicUserList={dynamicUserList}
          floatingReactions={floatingReactions}
          onClose={() => setIsUserListOpen(false)}
        />
      ) : (
        <PTTArea lcd={lcd} footer={footer} />
      )}

      {/* Floating Reactions Overlay */}
      {isPowerOn && floatingReactions.length > 0 && (
        <ReactionsOverlay isUserListOpen={isUserListOpen} floatingReactions={floatingReactions} />
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
