import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@lottiefiles/react-lottie-player', () => ({
  Player: () => <div data-testid="lottie" />,
}));

import { ReactionsOverlay } from './ReactionsOverlay';

const baseProps = { isUserListOpen: false, floatingReactions: [] as any[] };

describe('ReactionsOverlay', () => {
  it('renders nothing when empty', () => {
    const { container } = render(<ReactionsOverlay {...baseProps} />);
    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('renders sound emoji reaction', () => {
    render(
      <ReactionsOverlay
        {...baseProps}
        floatingReactions={[{ id: '1', category: 'sound', reaction: 'laugh', x: 50 }]}
      />
    );
    expect(screen.getByText('🤣')).toBeInTheDocument();
  });

  it('renders gift emoji reaction', () => {
    render(
      <ReactionsOverlay
        {...baseProps}
        floatingReactions={[{ id: '1', category: 'gift', reaction: 'rose', x: 50 }]}
      />
    );
    expect(screen.getByText('🌹')).toBeInTheDocument();
  });

  it('renders bart svg reaction', () => {
    render(
      <ReactionsOverlay {...baseProps} floatingReactions={[{ id: '1', reaction: 'bart', x: 50 }]} />
    );
    expect(screen.getByAltText('Bart Simpson')).toBeInTheDocument();
  });

  it('renders rocket emoji reaction', () => {
    render(
      <ReactionsOverlay
        {...baseProps}
        floatingReactions={[{ id: '1', reaction: 'rocket', x: 50 }]}
      />
    );
    expect(screen.getByText('🚀')).toBeInTheDocument();
  });

  it('renders lion video background when user list closed', () => {
    const { container } = render(
      <ReactionsOverlay
        isUserListOpen={false}
        floatingReactions={[{ id: '1', reaction: 'lion', x: 50 }]}
      />
    );
    expect(container.querySelector('iframe')).toBeInTheDocument();
  });

  it('hides lion video when user list open (rendered in modal instead)', () => {
    const { container } = render(
      <ReactionsOverlay
        isUserListOpen={true}
        floatingReactions={[{ id: '1', reaction: 'lion', x: 50 }]}
      />
    );
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });
});
