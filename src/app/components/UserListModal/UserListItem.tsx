import React, { useState } from 'react';
import { UserProfile, getUserMode, isNewUserJoined, isGoogleDefaultAvatar } from './utils';
import iconVoice from '../../../assets/icon_voice.png';
import iconOperator from '../../../assets/icon_operator_otomatis.png';
import iconModerator from '../../../assets/icon_moderator.png';
import iconControlled from '../../../assets/icon_controlled.png';
import iconSilent from '../../../assets/icon_silent.png';
import iconWait from '../../../assets/icon_wait.png';
import iconWaitControlled from '../../../assets/icon_wait_controlled.png';
import iconUserBaru from '../../../assets/components/icon_tag_baru.svg';
import iconNoc from '../../../assets/icon_noc.png';

interface UserListItemProps {
  profile: UserProfile;
  isLocalUser: boolean;
  isSpeaking: boolean;
  avatarUrlToUse: string;
  hasVideoBackground?: boolean;
  onClick: () => void;
}

const MODE_ICONS = {
  voice: iconVoice,
  operator: iconOperator,
  moderator: iconModerator,
  silent: iconSilent,
  controlled: iconControlled,
  wait: iconWait,
  wait_controlled: iconWaitControlled,
};

const MODE_LABELS = {
  voice: 'Voice',
  operator: 'Operator',
  moderator: 'Moderator',
  silent: 'Silent (Mute)',
  controlled: 'Controlled',
  wait: 'Wait (Antri)',
  wait_controlled: 'Wait Controlled',
};

function AvatarImage({
  src,
  displayName,
  fallbackIconUrl,
  badge,
}: {
  src?: string;
  displayName: string;
  fallbackIconUrl: string;
  badge?: React.ReactNode;
}) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src || isGoogleDefaultAvatar(src)) {
    return (
      <div
        className="w-full h-full rounded-none flex items-center justify-center shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)] border border-white/20"
        style={{ backgroundColor: '#ffffff' }}
      >
        <img
          src={fallbackIconUrl}
          alt={displayName}
          className="w-full h-full object-contain p-1.5"
        />
      </div>
    );
  }

  return (
    <>
      <img
        src={src}
        alt={displayName}
        onError={() => setHasError(true)}
        className="w-full h-full rounded-none object-cover shadow-[0_2px_4px_rgba(0,0,0,0.15)] border border-white/20"
      />
      {badge}
    </>
  );
}

export function UserListItem({
  profile,
  isSpeaking,
  avatarUrlToUse,
  hasVideoBackground,
  onClick,
}: UserListItemProps) {
  const mode = getUserMode(profile);
  const fallbackIconUrl = profile.role === 'noc' ? iconNoc : MODE_ICONS[mode];

  const badgeNode = (
    <img
      src={fallbackIconUrl}
      alt={profile.role === 'noc' ? 'NOC' : MODE_LABELS[mode]}
      title={profile.role === 'noc' ? 'NOC' : MODE_LABELS[mode]}
      className="absolute bottom-0 right-0 w-[20px] h-[20px] mb-0.5 mr-0.5 object-contain drop-shadow-[0_1.5px_2.5px_rgba(0,0,0,0.35)]"
      style={
        mode === 'operator'
          ? {
              filter: 'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.75))',
            }
          : undefined
      }
      draggable={false}
    />
  );

  return (
    <div
      className={`w-full flex items-center pr-4 pl-0 transition-all duration-300 border-b cursor-pointer ${
        isSpeaking
          ? 'active-user-glow z-10'
          : hasVideoBackground
            ? 'bg-transparent border-white/10 hover:bg-white/10 active:bg-white/20'
            : 'bg-[#fafbfc] border-gray-300 hover:bg-white active:bg-gray-100'
      }`}
      onClick={onClick}
    >
      {/* Avatar with mode icon overlay */}
      <div className="relative w-[52px] h-[52px] shrink-0 select-none hover:scale-105 active:scale-95 transition-transform duration-200">
        <AvatarImage
          src={avatarUrlToUse}
          displayName={profile.displayName}
          fallbackIconUrl={fallbackIconUrl}
          badge={badgeNode}
        />
      </div>

      {/* Name & Details */}
      <div className="ml-3 flex-1 min-w-0 text-left">
        <div
          className={`text-[14px] font-medium truncate leading-snug ${hasVideoBackground ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]' : 'text-gray-800'}`}
        >
          <span className="truncate">{profile.displayName}</span>
        </div>
        <div className="flex items-center text-[11px] mt-0.5 truncate gap-px font-medium leading-none">
          {isNewUserJoined(profile) && (
            <img
              src={iconUserBaru}
              alt="Baru"
              className="h-[12px] w-auto object-contain select-none"
              style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}
              draggable={false}
            />
          )}
          {profile.badges &&
            profile.badges.map((badge, idx) => (
              <span key={idx} className="text-[11px] select-none" title="Lencana">
                {badge}
              </span>
            ))}
          <span
            className={`text-[#00C853] font-normal uppercase ${hasVideoBackground ? 'drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]' : ''}`}
          >
            {profile.callSign}
          </span>
          <span
            className={`${hasVideoBackground ? 'text-white/40' : 'text-gray-400'} font-normal mx-px`}
          >
            ·
          </span>
          <span
            className={`${hasVideoBackground ? 'text-white/70 drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.6)]' : 'text-gray-500'} font-normal uppercase`}
          >
            {profile.location}
          </span>
        </div>
      </div>

      {/* Active Speaker Megaphone Toa Icon */}
      {isSpeaking && (
        <div className="mr-1 flex items-center justify-center animate-pulse text-[#0088cc]">
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="currentColor">
            <path d="M16 5v14c0 .55-.45 1-1 1h-1l-4-4H6c-1.1 0-2-.9-2-2v-4c0-1.1.9-2 2-2h4l4-4h1c.55 0 1 .45 1 1zm3 7c0-2.03-1.02-3.82-2.58-4.88L15 8.56C16.2 9.29 17 10.55 17 12s-.8 2.71-2 3.44l1.42 1.44C17.98 15.82 19 14.03 19 12zm-3-2.28c.59.54.96 1.3.96 2.28s-.37 1.74-.96 2.28l1.42 1.42c1.07-1 1.71-2.39 1.71-3.7s-.64-2.7-1.71-3.7l-1.42 1.42z" />
          </svg>
        </div>
      )}
    </div>
  );
}
