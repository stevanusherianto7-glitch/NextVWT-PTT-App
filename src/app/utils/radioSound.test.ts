import { describe, it, expect, beforeEach } from 'vitest';
import { playRadioTone, playPressSound, playReleaseSound, playChirpSound } from './radioSound';
import { __resetAudioContextForTest } from './audioContext';

describe('radioSound', () => {
  beforeEach(() => {
    // Reset the memoized AudioContext singleton between tests
    __resetAudioContextForTest();
  });

  it('plays each preset without throwing', () => {
    expect(() => playRadioTone('press')).not.toThrow();
    expect(() => playRadioTone('release')).not.toThrow();
    expect(() => playRadioTone('chirp-join')).not.toThrow();
    expect(() => playRadioTone('chirp-leave')).not.toThrow();
  });

  it('honors volume param — no throw at 0 and 100', () => {
    expect(() => playRadioTone('press', 0)).not.toThrow();
    expect(() => playRadioTone('press', 100)).not.toThrow();
  });

  it('convenience wrappers delegate correctly', () => {
    expect(() => playPressSound()).not.toThrow();
    expect(() => playReleaseSound()).not.toThrow();
    expect(() => playChirpSound(true)).not.toThrow();
    expect(() => playChirpSound(false)).not.toThrow();
  });

  it('does not throw when AudioContext creation fails', () => {
    const origAC = global.AudioContext;
    global.AudioContext = class {
      constructor() {
        throw new Error('no audio');
      }
    } as unknown as typeof AudioContext;
    expect(() => playRadioTone('press')).not.toThrow();
    global.AudioContext = origAC;
  });
});
