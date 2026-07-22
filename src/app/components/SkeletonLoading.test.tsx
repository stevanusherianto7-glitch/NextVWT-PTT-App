import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonLoading } from './SkeletonLoading';

describe('SkeletonLoading', () => {
  it('renders without crashing', () => {
    expect(() => render(<SkeletonLoading />)).not.toThrow();
  });
});
