import { ChannelRole } from '../../../features/moderation/permissions';

export interface UserProfile {
  userId: string;
  displayName: string;
  callSign: string;
  location: string;
  avatarColor: string;
  avatarUrl: string;
  isNewUser?: boolean;
  joinedAt?: string;
  role?: ChannelRole;
  isMuted?: boolean;
  isControlled?: boolean;
  isWait?: boolean;
  isWaitControlled?: boolean;
  badges?: string[];
}

export type UserMode =
  | 'voice'
  | 'operator'
  | 'moderator'
  | 'silent'
  | 'controlled'
  | 'wait'
  | 'wait_controlled';

export function isGoogleDefaultAvatar(url?: string): boolean {
  if (!url) return false;
  return url.includes('googleusercontent.com/a/default-user') || url.includes('/default-user');
}

export function isNewUserJoined(profile: UserProfile): boolean {
  if (profile.role === 'noc' || profile.role === 'sys_admin' || profile.callSign === 'N.O.C') {
    return false;
  }
  if (!profile.isNewUser) return false;
  if (!profile.joinedAt) return true;

  const joinedDate = new Date(profile.joinedAt);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= 14;
}

export function getUserMode(profile: UserProfile): UserMode {
  if (profile.isMuted) return 'silent';
  if (profile.isControlled) return 'controlled';
  if (profile.isWait) return 'wait';
  if (profile.isWaitControlled) return 'wait_controlled';

  if (profile.role === 'operator') return 'operator';
  if (profile.role === 'pjc' || profile.role === 'sys_admin' || profile.role === 'noc')
    return 'moderator';
  return 'voice';
}
