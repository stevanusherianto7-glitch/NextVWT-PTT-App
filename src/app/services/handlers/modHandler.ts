import { RealtimeChannel } from '@supabase/supabase-js';
import { usePTTStore } from '../../store/usePTTStore';
import { safeParseRealtimePayload } from '../../store/schemas/realtimePayloads';
import {
  HangUpPayloadSchema,
  KickPayloadSchema,
  UpdateRolePayloadSchema,
  UpdateStatusPayloadSchema,
} from '../../store/schemas/realtimePayloads';
import { ChannelRole } from '../../../features/moderation/permissions';

export function handleHangUp(rawPayload: unknown, clearWatchdog: () => void) {
  const payload = safeParseRealtimePayload(HangUpPayloadSchema, rawPayload, 'hang_up');
  if (!payload) return;
  const state = usePTTStore.getState();

  if (payload.targetUserId === state.userId && state.isTransmitting) {
    console.warn(
      `[Hang Up] Transmission interrupted by moderator${payload.moderatorName ? ` (${payload.moderatorName})` : ''}`
    );
    usePTTStore.setState({ isTransmitting: false, progress: 0 });
  }

  const currentTx = state.activeTransmitter;
  if (currentTx && currentTx.userId === payload.targetUserId) {
    usePTTStore.setState({ activeTransmitter: null, progress: 0 });
    clearWatchdog();
  }
}

export function handleKick(rawPayload: unknown) {
  const payload = safeParseRealtimePayload(KickPayloadSchema, rawPayload, 'kick');
  if (!payload) return;
  const state = usePTTStore.getState();

  if (payload.targetUserId === state.userId) {
    console.warn(
      `[Kick] You have been kicked/banned. Reason: ${payload.reason || 'No reason'}. Moving to CH 302...`
    );
    state.setChannelNumber(302);
  }
}

export function handleUpdateRole(
  rawPayload: unknown,
  channelNum: number,
  activeChannelSubscription: RealtimeChannel | null
) {
  const payload = safeParseRealtimePayload(UpdateRolePayloadSchema, rawPayload, 'update_role');
  if (!payload) return;
  const roomId = `ptt-room-${channelNum}`;
  localStorage.setItem(`channel-role:${roomId}:${payload.targetUserId}`, payload.nextRole);
  window.dispatchEvent(new Event('channel-role-changed'));

  const currentStore = usePTTStore.getState();
  if (payload.targetUserId === currentStore.userId) {
    usePTTStore.setState({ myChannelRole: payload.nextRole as ChannelRole });
  }
  if (payload.targetUserId === currentStore.userId && activeChannelSubscription) {
    const userMeta = currentStore.user;
    const displayName =
      currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
    const location = currentStore.locationText;
    const avatarUrl =
      currentStore.profilePhotoOption === 'google'
        ? userMeta?.user_metadata?.avatar_url || ''
        : currentStore.customPhotoUrl;

    const localStatus =
      localStorage.getItem(`channel-status:${roomId}:${currentStore.userId}`) || 'active';
    let presenceStatus: 'normal' | 'muted' | 'controlled' | 'wait' | 'wait_controlled' = 'normal';
    if (
      localStatus === 'muted' ||
      localStatus === 'controlled' ||
      localStatus === 'wait' ||
      localStatus === 'wait_controlled'
    ) {
      presenceStatus = localStatus as typeof presenceStatus;
    }

    activeChannelSubscription
      .track({
        userId: currentStore.userId,
        displayName: displayName,
        callSign: currentStore.callSign || '2DYUA',
        location: location,
        avatarUrl: avatarUrl,
        createdAt: userMeta?.created_at,
        role: payload.nextRole,
        status: presenceStatus,
      })
      .catch((err: unknown) => console.warn('Failed to update presence on role sync:', err));
  }
}

export function handleUpdateStatus(
  rawPayload: unknown,
  channelNum: number,
  activeChannelSubscription: RealtimeChannel | null
) {
  const payload = safeParseRealtimePayload(UpdateStatusPayloadSchema, rawPayload, 'update_status');
  if (!payload) return;
  const roomId = `ptt-room-${channelNum}`;
  const statusVal = payload.statusType === 'normal' ? 'active' : payload.statusType;
  localStorage.setItem(`channel-status:${roomId}:${payload.targetUserId}`, statusVal);
  window.dispatchEvent(new Event('channel-role-changed'));

  const currentStore = usePTTStore.getState();
  if (payload.targetUserId === currentStore.userId) {
    usePTTStore.setState({ myChannelStatus: payload.statusType });
  }
  if (payload.targetUserId === currentStore.userId && activeChannelSubscription) {
    const userMeta = currentStore.user;
    const displayName =
      currentStore.infoText || userMeta?.user_metadata?.full_name || 'Pebe Herianto';
    const location = currentStore.locationText;
    const avatarUrl =
      currentStore.profilePhotoOption === 'google'
        ? userMeta?.user_metadata?.avatar_url || ''
        : currentStore.customPhotoUrl;

    const localRole = (localStorage.getItem(`channel-role:${roomId}:${currentStore.userId}`) ||
      'guest') as ChannelRole;

    activeChannelSubscription
      .track({
        userId: currentStore.userId,
        displayName: displayName,
        callSign: currentStore.callSign || '2DYUA',
        location: location,
        avatarUrl: avatarUrl,
        createdAt: userMeta?.created_at,
        role: localRole,
        status: payload.statusType,
      })
      .catch((err: unknown) => console.warn('Failed to update presence on status sync:', err));
  }
}
