import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectEmulator, performSecurityAudit, verifyInstallationSource } from '../utils/appSecurity';

// Capacitor is a hard import in appSecurity.ts; mock it with a mutable flag
// so we can exercise both the web (native=false) and native (native=true) paths.
let native = false;
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native, Plugins: {} },
  registerPlugin: () => ({}),
}));

function stubWindow(overrides: Record<string, unknown>) {
  const base: Record<string, any> = {
    location: { hostname: 'localhost', protocol: 'http:' },
    outerWidth: 1920,
    innerWidth: 1920,
    outerHeight: 1080,
    innerHeight: 1080,
    Capacitor: { isNativePlatform: () => native, Plugins: {} },
  };
  const merged: Record<string, any> = { ...base, ...overrides };
  vi.stubGlobal('window', merged);
  // navigator/screen are read-only in jsdom — mutate their props, don't replace.
  const nav = (overrides.navigator as Record<string, any>) || {
    userAgent: 'Mozilla/5.0',
    hardwareConcurrency: 8,
    maxTouchPoints: 5,
  };
  const scr = (overrides.screen as Record<string, any>) || { width: 1080, height: 1920 };
  const g = globalThis as any;
  for (const [k, v] of Object.entries(nav)) {
    Object.defineProperty(g.navigator, k, { value: v, configurable: true, writable: true });
  }
  for (const [k, v] of Object.entries(scr)) {
    Object.defineProperty(g.screen, k, { value: v, configurable: true, writable: true });
  }
}

describe('detectEmulator (native path)', () => {
  beforeEach(() => {
    native = true;
    stubWindow({});
  });
  afterEach(() => {
    native = false;
    vi.unstubAllGlobals();
  });

  it('returns false on a normal native device', () => {
    expect(detectEmulator()).toBe(false);
  });

  it('detects emulator when 3+ indicators positive', () => {
    stubWindow({
      navigator: {
        userAgent: 'Android SDK built for x86 emulator',
        hardwareConcurrency: 1,
        maxTouchPoints: 0,
      },
      screen: { width: 1080, height: 1920 },
    });
    expect(detectEmulator()).toBe(true);
  });
});

describe('detectEmulator (web path)', () => {
  beforeEach(() => {
    native = false;
    stubWindow({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('always false on web (not a native target)', () => {
    stubWindow({
      navigator: {
        userAgent: 'Android SDK built for x86 emulator',
        hardwareConcurrency: 1,
        maxTouchPoints: 0,
      },
    });
    expect(detectEmulator()).toBe(false);
  });
});

describe('performSecurityAudit', () => {
  beforeEach(() => {
    native = false;
    stubWindow({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('web localhost → legitimate, no domain/https issues, score 100', async () => {
    const r = await performSecurityAudit();
    expect(r.score).toBe(100);
    expect(r.issues).not.toContain('UNAUTHORIZED_DOMAIN');
    expect(r.issues).not.toContain('NO_HTTPS');
    expect(r.blocked).toBe(false);
  });

  it('unauthorized web domain → UNAUTHORIZED_DOMAIN issue', async () => {
    stubWindow({ location: { hostname: 'evil.com', protocol: 'https:' } });
    const r = await performSecurityAudit();
    expect(r.issues).toContain('UNAUTHORIZED_DOMAIN');
  });

  it('http non-local → NO_HTTPS issue', async () => {
    stubWindow({ location: { hostname: 'nextvwt.example.com', protocol: 'http:' } });
    const r = await performSecurityAudit();
    expect(r.issues).toContain('NO_HTTPS');
  });
});

describe('verifyInstallationSource', () => {
  beforeEach(() => {
    native = false;
    stubWindow({});
  });
  afterEach(() => vi.unstubAllGlobals());

  it('web platform → legitimate:true, source:web', async () => {
    const r = await verifyInstallationSource();
    expect(r.legitimate).toBe(true);
    expect(r.source).toBe('web');
  });
});
