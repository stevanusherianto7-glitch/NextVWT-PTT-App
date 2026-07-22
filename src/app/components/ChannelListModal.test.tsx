import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePTTStore } from '../store/usePTTStore';

vi.mock('../utils/supabase', () => ({
  getSupabase: vi.fn(() => Promise.resolve((globalThis as any).__sb)),
}));

import { ChannelListModal } from './ChannelListModal';

const sampleChannels = [
  { number: 100, name: 'Landing Channel', type: 'green', users: [] as string[] },
  { number: 1, name: 'Ruang Bebas', type: 'green', users: ['Budi'] },
  { number: 5, name: 'Musik Dangdut', type: 'red', users: [] as string[] },
];

describe('ChannelListModal', () => {
  beforeEach(() => {
    (globalThis as any).__sb = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
      }),
    };
    usePTTStore.setState({
      channels: sampleChannels as any,
      userId: 'user-x',
      user: null,
      infoText: 'Budi User',
      callSign: 'BD1',
    });
    localStorage.clear();
  });

  it('renders channel list', () => {
    render(<ChannelListModal onClose={vi.fn()} onSelectChannel={vi.fn()} />);
    expect(screen.getByText('Landing Channel')).toBeInTheDocument();
    expect(screen.getByText('Ruang Bebas')).toBeInTheDocument();
  });

  it('filters channels by search', () => {
    render(<ChannelListModal onClose={vi.fn()} onSelectChannel={vi.fn()} />);
    const input = screen.getByPlaceholderText(/Cari channel/i);
    fireEvent.change(input, { target: { value: 'dangdut' } });
    expect(screen.getByText('Musik Dangdut')).toBeInTheDocument();
    expect(screen.queryByText('Ruang Bebas')).not.toBeInTheDocument();
  });

  it('selects a green channel directly', async () => {
    const onSelectChannel = vi.fn();
    const onClose = vi.fn();
    render(<ChannelListModal onClose={onClose} onSelectChannel={onSelectChannel} />);
    fireEvent.click(screen.getByText('Ruang Bebas'));
    // opens private overlay
    fireEvent.click(await screen.findByText(/Menuju Channel 1/i));
    await waitFor(() => expect(onSelectChannel).toHaveBeenCalledWith(1));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows restricted overlay for red channel without access', async () => {
    const onSelectChannel = vi.fn();
    render(<ChannelListModal onClose={vi.fn()} onSelectChannel={onSelectChannel} />);
    fireEvent.click(screen.getByText('Musik Dangdut'));
    fireEvent.click(await screen.findByText(/Menuju Channel 5/i));
    expect(await screen.findByText('Channel 5 terbatas')).toBeInTheDocument();
    expect(onSelectChannel).not.toHaveBeenCalled();
  });

  it('closes on backdrop click', () => {
    const onClose = vi.fn();
    render(<ChannelListModal onClose={onClose} onSelectChannel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalled();
  });
});
