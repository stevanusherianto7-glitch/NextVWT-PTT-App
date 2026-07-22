import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanelSkeleton, KaraokePlayerSkeleton, AquariumSkeleton } from './SkeletonLoaders';

describe('SkeletonLoaders', () => {
  it('SettingsPanelSkeleton renders', () => {
    expect(() => render(<SettingsPanelSkeleton />)).not.toThrow();
  });

  it('KaraokePlayerSkeleton renders', () => {
    expect(() => render(<KaraokePlayerSkeleton />)).not.toThrow();
  });

  it('AquariumSkeleton renders', () => {
    expect(() => render(<AquariumSkeleton />)).not.toThrow();
  });
});
