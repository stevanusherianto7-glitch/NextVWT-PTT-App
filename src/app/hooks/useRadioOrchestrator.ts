import { useEffect, useState } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { STATIC_CHANNELS } from '../utils/constants';
import { BRAND } from '../utils/config';
import { useChannelRole } from '../../features/moderation/useChannelRole';
import { useChannelSettings } from '../../features/moderation/useChannelSettings';
import { canUsePTT } from '../../features/moderation/permissions';
import { useRadioAudioEngine } from './useRadioAudioEngine';
import { useRadioModeration } from './useRadioModeration';
import { useRadioReactions } from './useRadioReactions';
import type { UserListModalProps } from '../components/UserListModal';

/**
 * Composition root for the radio screen.
 *
 * This hook no longer contains audio/moderation/reaction logic directly —
 * those responsibilities live in useRadioAudioEngine, useRadioModeration and
 * useRadioReactions. Here we only wire them together and expose the derived
 * view-model (user list, theme class, marquee, panel flags) to RadioLayout.
 */
export function useRadioOrchestrator() {
  const {
    isPowerOn,
    isTransmitting,
    isScanning,
    setProgress,
    channelUp,
    setChannelNumber,
    activeUsers,
    activeTransmitter,
    themeText,
    audioMode,
    fullDuplex,
    isKaraokePlayerOpen,
    setKaraokePlayerOpen: setIsKaraokePlayerOpen,
    userId,
    channelNumber: channel,
    infoText,
    locationText,
    setTransmitting: setIsTransmitting,
    setPower: setIsPowerOn,
  } = usePTTStore();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChannelListOpen, setIsChannelListOpen] = useState(false);
  const [isUserListOpen, setIsUserListOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isRoipOpen, setIsRoipOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isPrivateOpen, setIsPrivateOpen] = useState(false);
  const [simulatedUsers, setSimulatedUsers] = useState<UserListModalProps['users']>([]);

  const activeChannelObj = STATIC_CHANNELS.find((ch) => ch.number === channel);
  const roomId = `ptt-room-${channel}`;

  const { role, status: channelStatus } = useChannelRole(roomId, userId);
  const { settings: channelSettings } = useChannelSettings(roomId, activeChannelObj?.name);

  const pttAllowed = canUsePTT({
    role,
    status: channelStatus,
    allowGuestPTT: channelSettings?.allow_guest_ptt ?? true,
  });

  const isReceiving =
    activeTransmitter &&
    (activeTransmitter.userId !== usePTTStore.getState().userId ||
      activeTransmitter.callSign !== usePTTStore.getState().callSign);
  const isFullDuplexActive = fullDuplex || audioMode === 'music';
  const isBusy = !isFullDuplexActive && !!isReceiving;

  const safeActiveUsers = activeUsers || [];
  const rawList = [...safeActiveUsers, ...(activeChannelObj?.users || []), ...simulatedUsers];

  // Deduplicate by normalizing key (lowercase) and preferring objects over strings
  const uniqueUsersMap = new Map<string, (typeof rawList)[number]>();
  rawList.forEach((u) => {
    const key = typeof u === 'string' ? u : u.userId;
    if (key) {
      const normalizedKey = key.toLowerCase();
      if (!uniqueUsersMap.has(normalizedKey) || typeof u !== 'string') {
        uniqueUsersMap.set(normalizedKey, u);
      }
    }
  });

  const dynamicUserList = Array.from(uniqueUsersMap.values());
  // Simulated user offset is demo-only; forced to 0 in production.
  const dynamicUserCount = dynamicUserList.length + (BRAND.simulatedUserOffset || 0);

  const getThemeClass = (theme: string) => {
    const t = theme?.toLowerCase() || '';
    if (t === 'theme-classic' || t.includes('classic')) return 'theme-classic';
    if (t === 'theme-v1' || t.includes('v1')) return 'theme-v1';
    if (t === 'theme-v2' || t.includes('v2')) return 'theme-v2';
    if (t === 'theme-v3' || t.includes('v3')) return 'theme-v3';
    if (t === 'theme-v4' || t.includes('v4')) return 'theme-v4';
    if (t === 'theme-v5' || t.includes('v5')) return 'theme-v5';
    if (t === 'theme-v6' || t.includes('v6')) return 'theme-v6';
    if (t === 'theme-monokrom' || t.includes('monokrom') || t === 'mono') return 'theme-monokrom';
    return 'theme-classic';
  };

  // ── Child hooks ──────────────────────────────────────────────────────────────
  const { handleUserListChange } = useRadioAudioEngine({
    isPowerOn,
    isTransmitting,
    isScanning,
    channel,
    activeTransmitter,
    status: channelStatus,
    setProgress,
  });

  const { waitTimer } = useRadioModeration(roomId, userId, isPowerOn, channelStatus);

  const { floatingReactions, handleSendReaction } = useRadioReactions(isPowerOn, infoText, channel);

  // Drive the join/leave chirp from the deduplicated user list.
  useEffect(() => {
    const ids = dynamicUserList.map((u) => (typeof u === 'string' ? u : u.userId));
    handleUserListChange(ids);
  }, [dynamicUserList, handleUserListChange]);

  // Reset simulated users when power state changes.
  useEffect(() => {
    if (!isPowerOn) setSimulatedUsers([]);
  }, [isPowerOn]);

  // Close all panels when powering off.
  useEffect(() => {
    if (!isPowerOn) {
      setIsSettingsOpen(false);
      setIsChannelListOpen(false);
      setIsUserListOpen(false);
      setIsKaraokePlayerOpen(false);
      setIsManageOpen(false);
      setIsWalletOpen(false);
      setIsRoipOpen(false);
      setIsChatOpen(false);
      setIsQueueOpen(false);
      setIsPrivateOpen(false);
    }
  }, [isPowerOn, setIsKaraokePlayerOpen]);

  const handleSet = () => {
    if (isPowerOn) {
      setIsSettingsOpen(true);
    }
  };

  const displayUser = infoText ? infoText.toUpperCase() : 'USER';
  const displayLoc = locationText ? locationText.toUpperCase() : 'BANDUNG, JABAR';
  const channelNameStr = activeChannelObj ? activeChannelObj.name.toUpperCase() : 'STANDBY CHANNEL';
  const programName = channelSettings?.channel_description;
  const marqueeText = programName
    ? `PROGRAM SAAT INI: ${programName.toUpperCase()} • CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`
    : `CHANNEL ${channel} • ${channelNameStr} • ${displayUser} (${displayLoc}) • STANDBY • READY`;

  const isPanelOpen =
    isManageOpen ||
    isWalletOpen ||
    isRoipOpen ||
    isChatOpen ||
    isQueueOpen ||
    isPrivateOpen ||
    isSettingsOpen;

  return {
    isPowerOn,
    isTransmitting,
    isScanning,
    setProgress,
    channelUp,
    setChannelNumber,
    activeUsers,
    activeTransmitter,
    themeText,
    audioMode,
    fullDuplex,
    isKaraokePlayerOpen,
    setIsKaraokePlayerOpen,
    userId,
    channel,
    infoText,
    locationText,
    setIsTransmitting,
    setIsPowerOn,
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
    status: channelStatus,
    pttAllowed,
    isBusy,
    handleSet,
    handleSendReaction,
    marqueeText,
    channelNameStr,
    isPanelOpen,
    roomId,
  };
}
