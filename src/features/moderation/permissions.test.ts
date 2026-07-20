import { describe, it, expect } from 'vitest';
import {
  canModerateRole,
  canPerformAction,
  canUsePTT,
  canUseChat,
  canUseReaction,
  roleRank,
  isHigherRole,
} from './permissions';

describe('role hierarchy', () => {
  it('roleRank is strictly increasing', () => {
    expect(roleRank.guest).toBeLessThan(roleRank.member);
    expect(roleRank.member).toBeLessThan(roleRank.operator);
    expect(roleRank.operator).toBeLessThan(roleRank.pjc);
    expect(roleRank.pjc).toBeLessThan(roleRank.sys_admin);
    expect(roleRank.sys_admin).toBeLessThan(roleRank.noc);
  });

  it('isHigherRole respects rank', () => {
    expect(isHigherRole('noc', 'guest')).toBe(true);
    expect(isHigherRole('guest', 'noc')).toBe(false);
    expect(isHigherRole('operator', 'operator')).toBe(false);
  });
});

describe('canModerateRole', () => {
  it('NOC can moderate everyone except NOC', () => {
    expect(canModerateRole('noc', 'sys_admin')).toBe(true);
    expect(canModerateRole('noc', 'noc')).toBe(false);
  });
  it('sys_admin cannot moderate NOC or sys_admin', () => {
    expect(canModerateRole('sys_admin', 'noc')).toBe(false);
    expect(canModerateRole('sys_admin', 'sys_admin')).toBe(false);
    expect(canModerateRole('sys_admin', 'operator')).toBe(true);
  });
  it('PJC can moderate operator and guest only', () => {
    expect(canModerateRole('pjc', 'operator')).toBe(true);
    expect(canModerateRole('pjc', 'guest')).toBe(true);
    expect(canModerateRole('pjc', 'noc')).toBe(false);
    expect(canModerateRole('pjc', 'sys_admin')).toBe(false);
  });
  it('operator and guest cannot moderate anyone', () => {
    expect(canModerateRole('operator', 'guest')).toBe(false);
    expect(canModerateRole('guest', 'guest')).toBe(false);
  });
});

describe('canPerformAction', () => {
  it('guest can do nothing', () => {
    expect(canPerformAction('guest', 'KICK_USER')).toBe(false);
    expect(canPerformAction('guest', 'MUTE_USER')).toBe(false);
  });
  it('operator limited to view panel + queue', () => {
    expect(canPerformAction('operator', 'VIEW_ADMIN_PANEL')).toBe(true);
    expect(canPerformAction('operator', 'MANAGE_QUEUE')).toBe(true);
    expect(canPerformAction('operator', 'KICK_USER')).toBe(false);
    expect(canPerformAction('operator', 'MUTE_USER')).toBe(false);
  });
  it('noc/sys_admin can do everything listed', () => {
    const actions = ['MANAGE_ROLES', 'MUTE_USER', 'KICK_USER', 'BAN_USER', 'BLOCK_PTT', 'VIEW_LOGS'];
    for (const a of actions) {
      expect(canPerformAction('noc', a as never)).toBe(true);
      expect(canPerformAction('sys_admin', a as never)).toBe(true);
    }
  });
});

describe('canUsePTT / canUseChat / canUseReaction', () => {
  it('PTT blocked when muted/ptt_blocked/banned/suspended', () => {
    expect(canUsePTT({ role: 'member', status: 'muted', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'member', status: 'ptt_blocked', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'member', status: 'banned', allowGuestPTT: true })).toBe(false);
    expect(canUsePTT({ role: 'member', status: 'suspended', allowGuestPTT: true })).toBe(false);
  });
  it('guest PTT gated by allowGuestPTT', () => {
    expect(canUsePTT({ role: 'guest', status: 'active', allowGuestPTT: false })).toBe(false);
    expect(canUsePTT({ role: 'guest', status: 'active', allowGuestPTT: true })).toBe(true);
  });
  it('chat and reaction gated similarly', () => {
    expect(canUseChat({ role: 'guest', status: 'active', allowGuestChat: false })).toBe(false);
    expect(canUseReaction({ role: 'guest', status: 'banned', allowGuestReaction: true })).toBe(false);
  });
});
