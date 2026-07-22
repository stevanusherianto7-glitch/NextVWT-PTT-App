import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockFetchCoins = vi.fn();
const mockGetSupabase = vi.fn();

vi.mock('../../app/utils/supabase', () => ({
  getSupabase: () => mockGetSupabase(),
}));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { WalletPanel } from './WalletPanel';
import { usePTTStore } from '../../app/store/usePTTStore';

describe('WalletPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
          }),
        }),
      }),
    });
    usePTTStore.setState({
      user: { id: 'user-abc', user_metadata: {} } as any,
      coins: 5,
      fetchCoins: mockFetchCoins,
    });
    Object.defineProperty(globalThis, 'crypto', {
      value: { subtle: { importKey: vi.fn(), sign: vi.fn() } },
      configurable: true,
    });
  });

  it('renders balance and topup options', () => {
    render(<WalletPanel onClose={vi.fn()} />);
    expect(screen.getByText('Dompet Koin (Wallet)')).toBeInTheDocument();
    expect(screen.getByText('10 Koin')).toBeInTheDocument();
    expect(screen.getByText('250 Koin')).toBeInTheDocument();
  });

  it('generates QRIS on button click', async () => {
    render(<WalletPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Generate QRIS Dinamis/i));
    expect(await screen.findByText(/QRIS Dinamis Terbuat/i)).toBeInTheDocument();
    expect(screen.getByText(/Ref:/i)).toBeInTheDocument();
  });

  it('simulates payment success', async () => {
    const { toast } = await import('sonner');
    render(<WalletPanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(/Generate QRIS Dinamis/i));
    await screen.findByText(/QRIS Dinamis Terbuat/i);
    // mock fetch for webhook
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    fireEvent.click(screen.getByText(/Simulasi Sukses/i));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });
});
