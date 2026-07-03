import { useState, useEffect } from 'react';
import { UserProfile, getUserMode, isNewUserJoined, isGoogleDefaultAvatar } from './utils';
import { ChannelRole } from '../../../features/moderation/permissions';
import { usePTTStore } from '../../store/usePTTStore';

import iconVoice from '../../../assets/icon_voice.png';
import iconOperator from '../../../assets/icon_operator_otomatis.png';
import iconModerator from '../../../assets/icon_moderator.png';
import iconControlled from '../../../assets/icon_controlled.png';
import iconSilent from '../../../assets/icon_silent.png';
import iconWait from '../../../assets/icon_wait.png';
import iconWaitControlled from '../../../assets/icon_wait_controlled.png';
import iconUserBaru from '../../../assets/components/icon_tag_baru.svg';
import iconNoc from '../../../assets/icon_noc.png';

interface ModerationActionSheetProps {
  activeZoomedAvatar: UserProfile;
  localRole: string;
  canModerateTarget: boolean;
  onClose: () => void;
  handleUpdateStatus: (
    uId: string,
    statusType: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled'
  ) => void;
  handleUpdateRole: (uId: string, nextRole: ChannelRole) => void;
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

export function ModerationActionSheet({
  activeZoomedAvatar,
  localRole,
  canModerateTarget,
  onClose,
  handleUpdateStatus,
  handleUpdateRole,
}: ModerationActionSheetProps) {
  const [zoomedHasError, setZoomedHasError] = useState(false);

  useEffect(() => {
    setZoomedHasError(false);
  }, [activeZoomedAvatar]);

  const mode = getUserMode(activeZoomedAvatar);
  const fallbackIconUrl = activeZoomedAvatar.role === 'noc' ? iconNoc : MODE_ICONS[mode];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-[340px] w-full mx-4 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-200 border border-gray-100 text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Expanded Avatar */}
        <div className="w-40 h-40 rounded-none overflow-hidden shadow-lg border-2 border-[#00C853] relative flex items-center justify-center bg-gray-100">
          {activeZoomedAvatar.avatarUrl &&
          !zoomedHasError &&
          !isGoogleDefaultAvatar(activeZoomedAvatar.avatarUrl) ? (
            <img
              src={activeZoomedAvatar.avatarUrl}
              alt={activeZoomedAvatar.displayName}
              onError={() => setZoomedHasError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ backgroundColor: '#ffffff' }}
            >
              <img
                src={fallbackIconUrl}
                alt={activeZoomedAvatar.displayName}
                className="w-full h-full object-contain p-4"
              />
            </div>
          )}
        </div>

        {/* Profile Info Details */}
        <h3 className="mt-4 text-lg font-bold text-gray-900 text-center truncate w-full">
          {activeZoomedAvatar.displayName}
        </h3>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {isNewUserJoined(activeZoomedAvatar) && (
            <img
              src={iconUserBaru}
              alt="Baru"
              className="h-[12px] w-auto object-contain select-none"
              style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.15))' }}
              draggable={false}
            />
          )}
          {activeZoomedAvatar.badges &&
            activeZoomedAvatar.badges.map((badge, idx) => (
              <span key={idx} className="text-sm select-none" title="Lencana">
                {badge}
              </span>
            ))}
          <span className="text-sm font-semibold text-[#00C853] tracking-wider">
            {activeZoomedAvatar.callSign}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5 uppercase tracking-wide">
          {activeZoomedAvatar.location}
        </div>

        {/* Moderation Conditioning Panel */}
        {canModerateTarget && (
          <div className="w-full mt-4 pt-4 border-t border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2">
              Mode Moderasi Jalur
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {/* Voice / Normal */}
              <button
                type="button"
                onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'normal')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  !activeZoomedAvatar.isMuted &&
                  !activeZoomedAvatar.isControlled &&
                  !activeZoomedAvatar.isWait &&
                  !activeZoomedAvatar.isWaitControlled
                    ? 'bg-emerald-50 border-emerald-500/30 text-emerald-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img src={iconVoice} className="w-3.5 h-3.5 object-contain" alt="Voice" />
                Voice
              </button>

              {/* Silent / Muted */}
              <button
                type="button"
                onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'muted')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.isMuted
                    ? 'bg-red-50 border-red-500/30 text-red-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img src={iconSilent} className="w-3.5 h-3.5 object-contain" alt="Silent" />
                Silent
              </button>

              {/* Controlled */}
              <button
                type="button"
                onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'controlled')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.isControlled
                    ? 'bg-amber-50 border-amber-500/30 text-amber-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img src={iconControlled} className="w-3.5 h-3.5 object-contain" alt="Controlled" />
                Controlled
              </button>

              {/* Wait */}
              <button
                type="button"
                onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'wait')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.isWait
                    ? 'bg-blue-50 border-blue-500/30 text-blue-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img src={iconWait} className="w-3.5 h-3.5 object-contain" alt="Wait" />
                Wait (Antri)
              </button>

              {/* Wait Controlled */}
              <button
                type="button"
                onClick={() => handleUpdateStatus(activeZoomedAvatar.userId, 'wait_controlled')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.isWaitControlled
                    ? 'bg-indigo-50 border-indigo-500/30 text-indigo-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <img
                  src={iconWaitControlled}
                  className="w-3.5 h-3.5 object-contain"
                  alt="Wait Controlled"
                />
                Wait Ctrl
              </button>

              {/* Hang Up */}
              <button
                type="button"
                id="btn-hang-up-user"
                onClick={() => {
                  usePTTStore.getState().hangUpUser(activeZoomedAvatar.userId);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 bg-red-50 border-red-500/30 text-red-700 hover:bg-red-100 cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                </svg>
                Hang Up
              </button>
            </div>

            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mt-3.5 mb-2">
              Peran / Jabatan Jalur
            </div>
            <div className="grid grid-cols-2 gap-1.5 w-full">
              {/* Operator */}
              <button
                type="button"
                onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'operator')}
                className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.role === 'operator'
                    ? 'bg-teal-50 border-teal-500/30 text-teal-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <img
                  src={iconOperator}
                  className="w-3.5 h-3.5 object-contain"
                  style={{ filter: 'drop-shadow(0px 1px 1.5px rgba(0,0,0,0.75))' }}
                  alt="Operator"
                />
                Operator
              </button>

              {/* Moderator */}
              <button
                type="button"
                onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'pjc')}
                className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                  activeZoomedAvatar.role === 'pjc'
                    ? 'bg-rose-50 border-rose-500/30 text-rose-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <img src={iconModerator} className="w-3.5 h-3.5 object-contain" alt="Moderator" />
                PJC (Mod)
              </button>

              {/* Sys Admin */}
              {(localRole === 'noc' || localRole === 'sys_admin') && (
                <button
                  type="button"
                  onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'sys_admin')}
                  className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                    activeZoomedAvatar.role === 'sys_admin'
                      ? 'bg-purple-50 border-purple-500/30 text-purple-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-3.5 h-3.5 fill-current text-purple-600"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                  Sys Admin
                </button>
              )}

              {/* NOC Bintang Merah */}
              {localRole === 'noc' && (
                <button
                  type="button"
                  onClick={() => handleUpdateRole(activeZoomedAvatar.userId, 'noc')}
                  className={`flex items-center justify-center gap-0.5 py-1 rounded-lg border text-[10px] font-semibold transition-all duration-200 cursor-pointer ${
                    activeZoomedAvatar.role === 'noc'
                      ? 'bg-red-50 border-red-500/30 text-red-700 shadow-sm'
                      : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-[#E53935] font-bold text-[12px] mr-0.5">★</span>
                  NOC (★ Merah)
                </button>
              )}
            </div>

            {/* NOC Only: Banned Button */}
            {localRole === 'noc' && (
              <button
                type="button"
                id="btn-banned-user"
                onClick={() => {
                  handleUpdateStatus(activeZoomedAvatar.userId, 'muted');
                  usePTTStore.getState().kickUser(activeZoomedAvatar.userId, 'Banned by NOC');
                  usePTTStore.getState().setChannelNumber(302);
                  onClose();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 mt-2.5 rounded-lg border text-[11px] font-semibold transition-all duration-200 bg-red-800 border-red-900 text-white shadow-md hover:bg-red-700 active:scale-[0.98] cursor-pointer"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-3.5 h-3.5 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
                </svg>
                Banned (Pindah ke CH 302)
              </button>
            )}
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-5 px-6 py-2 bg-gray-800 hover:bg-gray-700 active:bg-gray-900 text-white text-xs font-semibold rounded-full shadow transition-colors duration-200 w-full text-center cursor-pointer"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
