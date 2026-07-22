import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { usePTTStore } from '../../store/usePTTStore';

vi.mock('../ToggleSwitch', () => ({
  ToggleSwitch: (props: any) => (
    <button data-testid="toggle" onClick={props.onToggle}>
      {props.isOn ? 'ON' : 'OFF'}
    </button>
  ),
}));
vi.mock('../LCDPanel', () => ({
  LCDPanel: () => <div data-testid="lcd">LCD</div>,
}));

import { RadioHeader, RadioLCD } from './RadioHeader';

describe('RadioHeader', () => {
  beforeEach(() => {
    usePTTStore.setState({
      isPowerOn: true,
      isTransmitting: false,
      isConnected: true,
      channelNumber: 100,
    });
  });

  it('renders marquee text', () => {
    render(<RadioHeader isUserListOpen={false} setIsUserListOpen={vi.fn()} marqueeText="HALO" />);
    expect(screen.getByText('HALO')).toBeInTheDocument();
  });

  it('toggles user list on logo click when power on', () => {
    const setIsUserListOpen = vi.fn();
    render(
      <RadioHeader isUserListOpen={false} setIsUserListOpen={setIsUserListOpen} marqueeText="X" />
    );
    // Logo section is the div wrapping the svg + text; click the VWT text container
    const logo = screen.getByText('VWT').parentElement!.parentElement!;
    fireEvent.click(logo);
    expect(setIsUserListOpen).toHaveBeenCalledWith(true);
  });

  it('does not toggle user list on logo click when power off', () => {
    usePTTStore.setState({ isPowerOn: false });
    const setIsUserListOpen = vi.fn();
    render(
      <RadioHeader isUserListOpen={false} setIsUserListOpen={setIsUserListOpen} marqueeText="X" />
    );
    const logo = screen.getByText('VWT').parentElement!.parentElement!;
    fireEvent.click(logo);
    expect(setIsUserListOpen).not.toHaveBeenCalled();
  });

  it('shows transmitting indicator when transmitting', () => {
    usePTTStore.setState({ isTransmitting: true });
    render(<RadioHeader isUserListOpen={false} setIsUserListOpen={vi.fn()} marqueeText="X" />);
    expect(screen.getByTestId('transmitting-indicator')).toBeInTheDocument();
  });

  it('toggles power via ToggleSwitch', () => {
    render(<RadioHeader isUserListOpen={false} setIsUserListOpen={vi.fn()} marqueeText="X" />);
    fireEvent.click(screen.getByTestId('toggle'));
    expect(usePTTStore.getState().isPowerOn).toBe(false);
  });

  it('RadioLCD renders LCDPanel with userCount', () => {
    render(<RadioLCD userCount={5} onUserCountClick={vi.fn()} />);
    expect(screen.getByTestId('lcd')).toBeInTheDocument();
  });
});
