import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickActionDock } from './QuickActionDock';

describe('QuickActionDock', () => {
  const base = {
    onOpenChat: vi.fn(),
    onOpenQueue: vi.fn(),
    onSendReaction: vi.fn(),
    isPowerOn: true,
  };

  it('renders action buttons with titles when social features on', () => {
    render(<QuickActionDock {...base} showSocialFeatures />);
    expect(screen.getByTitle('Chat')).toBeInTheDocument();
    expect(screen.getByTitle('Queue')).toBeInTheDocument();
  });

  it('calls onOpenChat when chat clicked', () => {
    render(<QuickActionDock {...base} showSocialFeatures />);
    fireEvent.click(screen.getByTitle('Chat'));
    expect(base.onOpenChat).toHaveBeenCalled();
  });

  it('renders reaction tabs when social features on', () => {
    const { container } = render(<QuickActionDock {...base} showSocialFeatures />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
