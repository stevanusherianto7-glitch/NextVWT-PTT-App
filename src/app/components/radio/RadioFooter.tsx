import { ControlButtons } from '../ControlButtons';
import { QuickActionDock } from '../QuickActionDock';
import { usePTTStore } from '../../store/usePTTStore';

interface RadioFooterProps {
  onScan: () => void;
  onSet: () => void;
}

export function RadioFooter({ onScan, onSet }: RadioFooterProps) {
  const { isPowerOn, isScanning, channelUp, channelDown } = usePTTStore();

  return (
    <div
      className={`mt-1 mb-0.5 flex justify-center transition-opacity duration-300 w-full ${isPowerOn ? '' : 'pointer-events-none'}`}
    >
      <ControlButtons
        onScan={onScan}
        onSet={onSet}
        onUp={channelUp}
        onDown={channelDown}
        isScanning={isScanning}
      />
    </div>
  );
}

interface RadioQuickDockProps {
  isUserListOpen: boolean;
  onOpenChat: () => void;
  onOpenQueue: () => void;
  onSendReaction: (category: 'animation' | 'sound' | 'gift', reactionType: string) => void;
  getThemeClass: (theme: string) => string;
}

export function RadioQuickDock({
  isUserListOpen,
  onOpenChat,
  onOpenQueue,
  onSendReaction,
  getThemeClass,
}: RadioQuickDockProps) {
  const { isPowerOn, themeText } = usePTTStore();

  if (!isUserListOpen) return null;

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center z-20 mt-3">
      <QuickActionDock
        onOpenChat={onOpenChat}
        onOpenQueue={onOpenQueue}
        onSendReaction={onSendReaction}
        isPowerOn={isPowerOn}
        showSocialFeatures={isPowerOn}
        themeKey={getThemeClass(themeText)}
      />
    </div>
  );
}
