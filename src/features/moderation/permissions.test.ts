import { describe, it, expect } from 'vitest';
import {
  roleRank,
  isHigherRole,
  canModerateRole,
  canPerformAction,
  canUsePTT,
  canUseChat,
  canUseReaction,
  getGlobalRole,
  type ModerationAction,
} from './permissions';

describe('permissions – roleRank', () => {
  it('ranks roles from lowest to highest', () => {
    expect(roleRank.guest).toBeLessThan(roleRank.member);
    expect(roleRank.member).toBeLessThan(roleRank.operator);
    expect(roleRank.operator).toBeLessThan(roleRank.pjc);
    expect(roleRank.pjc).toBeLessThan(roleRank.sys_admin);
    expect(roleRank.sys_admin).toBeLessThan(roleRank.noc);
  });
});

describe('permissions – isHigherRole', () => {
  it('detects strictly higher rank', () => {
    expect(isHigherRole('noc', 'guest')).toBe(true);
    expect(isHigherRole('operator', 'guest')).toBe(true);
    expect(isHigherRole('guest', 'noc')).toBe(false);
    expect(isHigherRole('operator', 'operator')).toBe(false);
  });
});

describe('permissions – canModerateRole', () => {
  it('NOC can moderate everyone except NOC', () => {
    expect(canModerateRole('noc', 'sys_admin')).toBe(true);
    expect(canModerateRole('noc', 'guest')).toBe(true);
    expect(canModerateRole('noc', 'noc')).toBe(false);
  });

  it('sys_admin can moderate except NOC and sys_admin', () => {
    expect(canModerateRole('sys_admin', 'pjc')).toBe(true);
    expect(canModerateRole('sys_admin', 'operator')).toBe(true);
    expect(canModerateRole('sys_admin', 'noc')).toBe(false);
    expect(canModerateRole('sys_admin', 'sys_admin')).toBe(false);
  });

  it('PJC can moderate operators and guests only', () => {
    expect(canModerateRole('pjc', 'operator')).toBe(true);
    expect(canModerateRole('pjc', 'guest')).toBe(true);
    expect(canModerateRole('pjc', 'sys_admin')).toBe(false);
    expect(canModerateRole('pjc', 'noc')).toBe(false);
  });

  it('operators and guests cannot moderate anyone', () => {
    expect(canModerateRole('operator', 'guest')).toBe(false);
    expect(canModerateRole('guest', 'guest')).toBe(false);
    expect(canModerateRole('member', 'guest')).toBe(false);
  });
});

describe('permissions – canPerformAction', () => {
  const allActions: ModerationAction[] = [
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
  ];

  it('NOC and sys_admin can perform every action', () => {
    for (const a of allActions) {
      expect(canPerformAction('noc', a)).toBe(true);
      expect(canPerformAction('sys_admin', a)).toBe(true);
    }
  });

  it('PJC cannot manage channel but can manage roles/settings', () => {
    expect(canPerformAction('pjc', 'MANAGE_CHANNEL')).toBe(false);
    expect(canPerformAction('pjc', 'MANAGE_ROLES')).toBe(true);
    expect(canPerformAction('pjc', 'MANAGE_SETTINGS')).toBe(true);
    expect(canPerformAction('pjc', 'VIEW_ADMIN_PANEL')).toBe(true);
  });

  it('operator only sees admin panel and manages queue', () => {
    expect(canPerformAction('operator', 'VIEW_ADMIN_PANEL')).toBe(true);
    expect(canPerformAction('operator', 'MANAGE_QUEUE')).toBe(true);
    expect(canPerformAction('operator', 'KICK_USER')).toBe(false);
    expect(canPerformAction('operator', 'BAN_USER')).toBe(false);
  });

  it('member and guest can perform nothing', () => {
    for (const a of allActions) {
      expect(canPerformAction('member', a)).toBe(false);
      expect(canPerformAction('guest', a)).toBe(false);
    }
  });
});

describe('permissions – canUsePTT', () => {
  it('blocks muted/ptt_blocked/banned/suspended', () => {
    expect(canUsePTT({ role: 'operator', status: 'muted', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'operator', status: 'ptt_blocked', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'operator', status: 'banned', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'operator', status: 'suspended', allowGuestPTT: true })).toBe(false);
  });

  it('guest needs allowGuestPTT', () => {
    expect(canUsePTT({ role: 'guest', status: 'active', allowGuestPTT: true })).toBe(true);
    expect(canUsePTT({ role: 'guest', status: 'active', allowGuestPTT: false })).toBe(false);
  });

  it('active non-guest can always transmit', () => {
    expect(canUsePTT({ role: 'member', status: 'active', allowGuestPTT: false })).toBe(true);
    expect(canUsePTT({ role: 'operator', status: 'active', allowGuestPTT: false })).toBe(true);
  });
});

describe('permissions – canUseChat', () => {
  it('blocks muted/chat_blocked/banned/suspended', () => {
    expect(canUseChat({ role: 'operator', status: 'muted', allowGuestChat: true })).toBe(false);
    expect(canUseChat({ role: 'member', status: 'chat_blocked', allowGuestChat: true })).toBe(
      false
    );
    expect(canUseChat({ role: 'guest', status: 'banned', allowGuestChat: true })).toBe(false);
    expect(canUseChat({ role: 'guest', status: 'suspended', allowGuestChat: true })).toBe(false);
  });

  it('guest needs allowGuestChat', () => {
    expect(canUseChat({ role: 'guest', status: 'active', allowGuestChat: true })).toBe(true);
    expect(canUseChat({ role: 'guest', status: 'active', allowGuestChat: false })).toBe(false);
  });
});

describe('permissions – canUseReaction', () => {
  it('blocks muted/banned/suspended', () => {
    expect(canUseReaction({ role: 'operator', status: 'muted', allowGuestReaction: true })).toBe(
      false
    );
    expect(canUseReaction({ role: 'guest', status: 'banned', allowGuestReaction: true })).toBe(
      false
    );
    expect(canUseReaction({ role: 'member', status: 'suspended', allowGuestReaction: true })).toBe(
      false
    );
  });

  it('guest needs allowGuestReaction', () => {
    expect(canUseReaction({ role: 'guest', status: 'active', allowGuestReaction: true })).toBe(
      true
    );
    expect(canUseReaction({ role: 'guest', status: 'active', allowGuestReaction: false })).toBe(
      false
    );
  });

  it('active non-guest can react', () => {
    expect(canUseReaction({ role: 'member', status: 'active', allowGuestReaction: false })).toBe(
      true
    );
  });
});

describe('permissions – getGlobalRole (deprecated stub)', () => {
  it('always returns null (security: no client-side hardcoded roles)', () => {
    expect(getGlobalRole('some-id', 'Pebe Herianto', 'ABC12')).toBeNull();
    expect(getGlobalRole('', undefined, undefined)).toBeNull();
  });
});
