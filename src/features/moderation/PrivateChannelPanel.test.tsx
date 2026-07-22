import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('./useChannelRole', () => ({
  useChannelRole: vi.fn(),
}));
const mockGetSupabase = vi.fn();
vi.mock('../../app/utils/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { PrivateChannelPanel } from './PrivateChannelPanel';
import { useChannelRole } from './useChannelRole';
import { usePTTStore } from '../../app/store/usePTTStore';

describe('PrivateChannelPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChannelRole as any).mockReturnValue({ role: 'guest', loading: false });
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
        insert: () => Promise.resolve({ error: null }),
      }),
    });
    usePTTStore.setState({
      channelNumber: 100,
      userId: 'u1',
      setChannelNumber: vi.fn(),
      user: null,
      infoText: 'Budi',
      callSign: 'BD1',
    });
  });

  it('shows checking then restricted state', async () => {
    render(<PrivateChannelPanel onClose={vi.fn()} />);
    expect(screen.getByText(/Memeriksa status/i)).toBeInTheDocument();
    expect(await screen.findByText(/AKSES TERBATAS/i)).toBeInTheDocument();
    expect(screen.getByText(/Tukarkan Badge Merah/i)).toBeInTheDocument();
  });

  it('exchanges badge (free) on click', async () => {
    const { toast } = await import('sonner');
    render(<PrivateChannelPanel onClose={vi.fn()} />);
    await screen.findByText(/AKSES TERBATAS/i);
    fireEvent.click(screen.getByText(/Aktifkan Badge Merah/i));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it('red channel join without access opens PIN dialog', async () => {
    render(<PrivateChannelPanel onClose={vi.fn()} />);
    await screen.findByText(/AKSES TERBATAS/i);
    fireEvent.click(screen.getAllByText(/Kunci/i)[0]);
    expect(await screen.findByText(/Kode Akses PIN/i)).toBeInTheDocument();
  });

  it('correct PIN joins channel', async () => {
    const setChannelNumber = usePTTStore.getState().setChannelNumber;
    render(<PrivateChannelPanel onClose={vi.fn()} />);
    await screen.findByText(/AKSES TERBATAS/i);
    fireEvent.click(screen.getAllByText(/Kunci/i)[0]);
    await screen.findByText(/Kode Akses PIN/i);
    fireEvent.change(screen.getByPlaceholderText(/Masukkan 4-digit PIN/i), {
      target: { value: '1234' },
    });
    fireEvent.click(screen.getByText('Buka Kunci'));
    await waitFor(() => expect(setChannelNumber).toHaveBeenCalled());
  });

  it('operator has access -> Masuk button', async () => {
    (useChannelRole as any).mockReturnValue({ role: 'operator', loading: false });
    render(<PrivateChannelPanel onClose={vi.fn()} />);
    expect(await screen.findByText(/AKSES TERBUKA/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Masuk/i)[0]).toBeInTheDocument();
  });
});
