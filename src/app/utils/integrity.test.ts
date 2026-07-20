import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  checkDOMIntegrity,
  checkDomainAuthorization,
  detectDevTools,
  checkFunctionIntegrity,
  runIntegrityCheck,
} from './integrity';

describe('integrity', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  describe('checkDOMIntegrity', () => {
    it('returns true when only same-origin scripts present', () => {
      document.body.innerHTML = '<script src="/app.js"></script>';
      expect(checkDOMIntegrity()).toBe(true);
    });

    it('returns false when external script detected', () => {
      document.body.innerHTML = '<script src="https://evil.com/x.js"></script>';
      expect(checkDOMIntegrity()).toBe(false);
    });

    it('ignores inline scripts (no src)', () => {
      document.body.innerHTML = '<script>console.log(1)</script>';
      expect(checkDOMIntegrity()).toBe(true);
    });
  });

  describe('checkDomainAuthorization', () => {
    it('allows localhost', () => {
      vi.stubGlobal('window', { ...window, location: { origin: 'http://localhost:5188', hostname: 'localhost' } });
      expect(checkDomainAuthorization()).toBe(true);
    });

    it('allows authorized subdomain', () => {
      vi.stubGlobal('window', { ...window, location: { origin: 'https://app.nextvwt.id', hostname: 'app.nextvwt.id' } });
      expect(checkDomainAuthorization()).toBe(true);
    });

    it('rejects unknown domain', () => {
      vi.stubGlobal('window', { ...window, location: { origin: 'https://evil.com', hostname: 'evil.com' } });
      expect(checkDomainAuthorization()).toBe(false);
    });
  });

  describe('detectDevTools', () => {
    it('returns false when window dimensions are normal', () => {
      vi.stubGlobal('window', { ...window, outerWidth: 1920, innerWidth: 1920, outerHeight: 1080, innerHeight: 1080 });
      expect(detectDevTools()).toBe(false);
    });

    it('returns true when outer-inner width gap exceeds threshold', () => {
      vi.stubGlobal('window', { ...window, outerWidth: 2100, innerWidth: 1920, outerHeight: 1080, innerHeight: 1080 });
      expect(detectDevTools()).toBe(true);
    });
  });

  describe('checkFunctionIntegrity', () => {
    it('returns true when critical globals intact', () => {
      expect(checkFunctionIntegrity()).toBe(true);
    });

    it('returns false when fetch is tampered', () => {
      const orig = window.fetch;
      // @ts-expect-error force tamper
      window.fetch = undefined;
      expect(checkFunctionIntegrity()).toBe(false);
      window.fetch = orig;
    });
  });

  describe('runIntegrityCheck', () => {
    it('passes on authorized localhost and stores result', () => {
      vi.stubGlobal('window', { ...window, location: { origin: 'http://localhost:5188', hostname: 'localhost' } });
      document.body.innerHTML = '';
      const res = runIntegrityCheck();
      expect(res.passed).toBe(true);
      expect(res.violations).toEqual([]);
      expect(sessionStorage.getItem('nvt_integrity_v1')).toContain('"passed":true');
    });

    it('records violations when domain unauthorized', () => {
      vi.stubGlobal('window', { ...window, location: { origin: 'https://evil.com', hostname: 'evil.com' } });
      const res = runIntegrityCheck();
      expect(res.passed).toBe(false);
      expect(res.violations).toContain('DOMAIN_MISMATCH');
    });

    it('survives sessionStorage write failure', () => {
      vi.stubGlobal('sessionStorage', {
        setItem: () => {
          throw new Error('quota');
        },
        getItem: () => null,
      });
      vi.stubGlobal('window', { ...window, location: { origin: 'http://localhost:5188', hostname: 'localhost' } });
      document.body.innerHTML = '';
      expect(() => runIntegrityCheck()).not.toThrow();
    });
  });
});
