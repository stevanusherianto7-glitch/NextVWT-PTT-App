import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackModal } from './FeedbackModal';

describe('FeedbackModal', () => {
  it('renders without crashing', () => {
    expect(() => render(<FeedbackModal />)).not.toThrow();
  });
});
