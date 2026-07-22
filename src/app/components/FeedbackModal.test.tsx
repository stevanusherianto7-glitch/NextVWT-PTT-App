import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeedbackModal } from './FeedbackModal';

describe('FeedbackModal', () => {
  it('renders without crashing', () => {
    expect(() => render(<FeedbackModal />)).not.toThrow();
  });
});
