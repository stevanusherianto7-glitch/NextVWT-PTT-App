import { describe, it, expect } from 'vitest';
import { getIceServersConfig, getWebRTCConfig } from './webrtcConfig';

describe('webrtcConfig', () => {
  it('getIceServersConfig returns an array of RTCIceServer', () => {
    const servers = getIceServersConfig();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
    for (const s of servers) {
      expect(s).toHaveProperty('urls');
    }
  });

  it('getWebRTCConfig returns RTCConfiguration with iceServers', () => {
    const cfg = getWebRTCConfig();
    expect(cfg).toHaveProperty('iceServers');
    expect(Array.isArray(cfg.iceServers)).toBe(true);
  });
});
