import { UserListModal, UserListModalProps } from '../UserListModal';
import { FloatingReaction } from './ReactionsOverlay';

interface UserListOverlayProps {
  isPowerOn: boolean;
  channel: number;
  channelNameStr: string;
  dynamicUserList: UserListModalProps['users'];
  floatingReactions: FloatingReaction[];
  onClose: () => void;
}

export function UserListOverlay({
  isPowerOn,
  channel,
  channelNameStr,
  dynamicUserList,
  floatingReactions,
  onClose,
}: UserListOverlayProps) {
  const showVideo =
    isPowerOn && floatingReactions.some((r) => r.reaction === 'lion' || r.reaction === 'aquarium');
  const activeReaction = floatingReactions.find(
    (r) => r.reaction === 'lion' || r.reaction === 'aquarium'
  );
  const isLion = activeReaction?.reaction === 'lion';
  const videoId = isLion ? 'SvBAptWsNZo' : 'jBbqxCpUsjM';

  return (
    <div className="w-full max-w-[340px] h-[426px] relative -mt-[14px] overflow-hidden">
      {/* Background Video Reaction (Lion or Aquarium) */}
      {showVideo && (
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
      )}
      <UserListModal
        channel={channel}
        channelName={channelNameStr}
        users={dynamicUserList}
        onClose={onClose}
        hasVideoBackground={showVideo}
      />
    </div>
  );
}
