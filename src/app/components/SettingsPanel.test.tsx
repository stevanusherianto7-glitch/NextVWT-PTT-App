import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('./SettingsPanel/ProfileSettings', () => ({
  ProfileSettings: () => <div data-testid="profile-settings">PROFILE</div>,
}));
vi.mock('./SettingsPanel/AudioSettings', () => ({
  AudioSettings: () => <div data-testid="audio-settings">AUDIO</div>,
}));
vi.mock('./SettingsPanel/AppearanceSettings', () => ({
  AppearanceSettings: () => <div data-testid="appearance-settings">APPEARANCE</div>,
}));
vi.mock('./SettingsPanel/NetworkSettings', () => ({
  NetworkSettings: ({ onOpenModeration, onOpenRoip, onOpenUserGuide }: any) => (
    <div data-testid="network-settings">
      <button data-testid="open-mod" onClick={onOpenModeration}>
        mod
      </button>
      <button data-testid="open-roip" onClick={onOpenRoip}>
        roip
      </button>
      <button data-testid="open-guide" onClick={onOpenUserGuide}>
        guide
      </button>
    </div>
  ),
}));

import { SettingsPanel } from './SettingsPanel';

describe('SettingsPanel', () => {
  it('renders with profile tab active by default', () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
  });

  it('switches to audio tab', () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Audio'));
    expect(screen.getByTestId('audio-settings')).toBeInTheDocument();
  });

  it('switches to appearance tab', () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Tampilan'));
    expect(screen.getByTestId('appearance-settings')).toBeInTheDocument();
  });

  it('switches to network tab and opens user guide', () => {
    render(<SettingsPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Lainnya'));
    expect(screen.getByTestId('network-settings')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('open-guide'));
    expect(screen.getByText('Panduan Pengguna')).toBeInTheDocument();
  });

  it('calls onClose when back pressed', () => {
    const onClose = vi.fn();
    render(<SettingsPanel onClose={onClose} />);
    fireEvent.click(screen.getByText('Back'));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens moderation via network tab', () => {
    const onClose = vi.fn();
    const onOpenModeration = vi.fn();
    render(<SettingsPanel onClose={onClose} onOpenModeration={onOpenModeration} />);
    fireEvent.click(screen.getByText('Lainnya'));
    fireEvent.click(screen.getByTestId('open-mod'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenModeration).toHaveBeenCalled();
  });

  it('opens roip via network tab', () => {
    const onClose = vi.fn();
    const onOpenRoip = vi.fn();
    render(<SettingsPanel onClose={onClose} onOpenRoip={onOpenRoip} />);
    fireEvent.click(screen.getByText('Lainnya'));
    fireEvent.click(screen.getByTestId('open-roip'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenRoip).toHaveBeenCalled();
  });
});
