import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setActiveChannelSubscription,
  cleanupHeartbeat,
  cleanupAllTimers,
  heartbeatState,
} from './subscription';

describe('store/subscription', () => {
  beforeEach(() => {
    heartbeatState.heartbeatInterval = null;
    heartbeatState.heartbeatTimeout = null;
    heartbeatState.activeTransmitterTimeout = null;
    heartbeatState.expectedPingId = null;
    heartbeatState.missedPings = 0;
    setActiveChannelSubscription(null);
  });

  it('setActiveChannelSubscription does not throw', () => {
    const fake = { unsubscribe: vi.fn() } as never;
    expect(() => setActiveChannelSubscription(fake)).not.toThrow();
    expect(() => setActiveChannelSubscription(null)).not.toThrow();
  });

  it('cleanupHeartbeat clears heartbeat interval/timeout and resets counters', () => {
    heartbeatState.heartbeatInterval = setInterval(() => {}, 1000);
    heartbeatState.heartbeatTimeout = setTimeout(() => {}, 1000);
    heartbeatState.expectedPingId = 'ping-1';
    heartbeatState.missedPings = 3;
    cleanupHeartbeat();
    expect(heartbeatState.heartbeatInterval).toBeNull();
    expect(heartbeatState.heartbeatTimeout).toBeNull();
    expect(heartbeatState.expectedPingId).toBeNull();
    expect(heartbeatState.missedPings).toBe(0);
    clearInterval(heartbeatState.heartbeatInterval as never);
    clearTimeout(heartbeatState.heartbeatTimeout as never);
  });

  it('cleanupAllTimers also clears activeTransmitterTimeout', () => {
    heartbeatState.activeTransmitterTimeout = setTimeout(() => {}, 1000);
    cleanupAllTimers();
    expect(heartbeatState.activeTransmitterTimeout).toBeNull();
    clearTimeout(heartbeatState.activeTransmitterTimeout as never);
  });

  it('setActiveChannelSubscription(null) triggers cleanupAllTimers', () => {
    heartbeatState.heartbeatInterval = setInterval(() => {}, 1000);
    setActiveChannelSubscription({ unsubscribe: vi.fn() } as never);
    setActiveChannelSubscription(null);
    expect(heartbeatState.heartbeatInterval).toBeNull();
    clearInterval(heartbeatState.heartbeatInterval as never);
  });
});
