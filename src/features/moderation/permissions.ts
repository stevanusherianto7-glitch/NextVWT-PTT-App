export type ChannelRole = 'noc' | 'sys_admin' | 'pjc' | 'operator' | 'member' | 'guest';

export type ChannelUserStatus =
  | 'active'
  | 'muted'
  | 'ptt_blocked'
  | 'chat_blocked'
  | 'suspended'
  | 'banned';

/**
 * @deprecated REMOVED — Hardcoded userIds/displayNames are a critical security hole.
 *
 * Role authority MUST come exclusively from the `channel_roles` Supabase table,
 * not from client-side display name comparisons. Anyone could register with the
 * display name "Pebe Herianto" and receive NOC-level access.
 *
 * To assign global roles (NOC / sys_admin):
 *   1. Insert a row into `public.channel_roles` via the Supabase Dashboard
 *      or a server-side Edge Function using the service_role key.
 *   2. The `useChannelRole` hook reads the role from the DB on each channel join.
 *
 * This function now always returns null — it is kept as a stub so callers
 * that still reference it get a compile error guiding them to the DB approach.
 *
 * @see src/features/moderation/useChannelRole.ts
 */
export function getGlobalRole(_userId: string, _displayName?: string, _callSign?: string): null {
  // ⛔ DO NOT restore hardcoded checks here.
  // Role checks must be server-authoritative (Supabase channel_roles table).
  return null;
}

export type ModerationAction =
  | 'VIEW_ADMIN_PANEL'
  | 'MANAGE_CHANNEL'
  | 'MANAGE_ROLES'
  | 'MANAGE_SETTINGS'
  | 'MUTE_USER'
  | 'KICK_USER'
  | 'BAN_USER'
  | 'BLOCK_PTT'
  | 'BLOCK_CHAT'
  | 'MANAGE_QUEUE'
  | 'MANAGE_THEME'
  | 'VIEW_LOGS';

export const roleRank: Record<ChannelRole, number> = {
  guest: 1,
  member: 1.5,
  operator: 2,
  pjc: 3,
  sys_admin: 4,
  noc: 5,
};

/**
 * Checks if actor role is strictly higher than target role rank.
 */
export function isHigherRole(actor: ChannelRole, target: ChannelRole): boolean {
  return roleRank[actor] > roleRank[target];
}

/**
 * Checks if an actor can moderate a target user based on their roles.
 * - NOC can moderate everyone except other NOCs
 * - Sys Admin can moderate everyone except NOCs and other Sys Admins
 * - PJC can moderate Operators and Guests
 * - Operators and Guests cannot moderate anyone
 */
export function canModerateRole(actor: ChannelRole, target: ChannelRole): boolean {
  if (actor === 'noc') return target !== 'noc';
  if (actor === 'sys_admin') return target !== 'noc' && target !== 'sys_admin';
  if (actor === 'pjc') return target === 'operator' || target === 'guest';
  return false;
}

/**
 * Checks if a role is permitted to perform a general moderation/admin action.
 */
export function canPerformAction(role: ChannelRole, action: ModerationAction): boolean {
  const permissions: Record<ChannelRole, ModerationAction[]> = {
    noc: [
      'VIEW_ADMIN_PANEL',
      'MANAGE_CHANNEL',
      'MANAGE_ROLES',
      'MANAGE_SETTINGS',
      'MUTE_USER',
      'KICK_USER',
      'BAN_USER',
      'BLOCK_PTT',
      'BLOCK_CHAT',
      'MANAGE_QUEUE',
      'MANAGE_THEME',
      'VIEW_LOGS',
    ],
    sys_admin: [
      'VIEW_ADMIN_PANEL',
      'MANAGE_CHANNEL',
      'MANAGE_ROLES',
      'MANAGE_SETTINGS',
      'MUTE_USER',
      'KICK_USER',
      'BAN_USER',
      'BLOCK_PTT',
      'BLOCK_CHAT',
      'MANAGE_QUEUE',
      'MANAGE_THEME',
      'VIEW_LOGS',
    ],
    pjc: [
      'VIEW_ADMIN_PANEL',
      'MANAGE_ROLES', // Enabled so PJC can change roles of operators & guests
      'MANAGE_SETTINGS',
      'MUTE_USER',
      'KICK_USER',
      'BAN_USER',
      'BLOCK_PTT',
      'BLOCK_CHAT',
      'MANAGE_QUEUE',
      'MANAGE_THEME',
      'VIEW_LOGS',
    ],
    operator: ['VIEW_ADMIN_PANEL', 'MANAGE_QUEUE'],
    member: [],
    guest: [],
  };

  return permissions[role]?.includes(action) || false;
}

/**
 * Checks if a user is allowed to transmit voice via PTT.
 */
export function canUsePTT(params: {
  role: ChannelRole;
  status: string;
  allowGuestPTT: boolean;
}): boolean {
  const { role, status, allowGuestPTT } = params;

  if (status === 'muted') return false;
  if (status === 'ptt_blocked') return false;
  if (status === 'banned') return false;
  if (status === 'suspended') return false;

  if (role === 'guest' && !allowGuestPTT) return false;

  return true;
}

/**
 * Checks if a user is allowed to send chat messages.
 */
export function canUseChat(params: {
  role: ChannelRole;
  status: string;
  allowGuestChat: boolean;
}): boolean {
  const { role, status, allowGuestChat } = params;

  if (status === 'muted') return false;
  if (status === 'chat_blocked') return false;
  if (status === 'banned') return false;
  if (status === 'suspended') return false;

  if (role === 'guest' && !allowGuestChat) return false;

  return true;
}

/**
 * Checks if a user is allowed to trigger reaction animations/sounds.
 */
export function canUseReaction(params: {
  role: ChannelRole;
  status: string;
  allowGuestReaction: boolean;
}): boolean {
  const { role, status, allowGuestReaction } = params;

  if (status === 'muted') return false;
  if (status === 'banned') return false;
  if (status === 'suspended') return false;

  if (role === 'guest' && !allowGuestReaction) return false;

  return true;
}
