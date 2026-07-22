import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePTTStore } from '../../app/store/usePTTStore';

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

import { ROIPBridgePanel } from './ROIPBridgePanel';

describe('ROIPBridgePanel', () => {
  beforeEach(() => {
    usePTTStore.setState({ isTransmitting: false, setTransmitting: vi.fn() });
    localStorage.clear();
  });

  it('renders gateway and back button', () => {
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    expect(screen.getByText('ROIP BRIDGE GATEWAY')).toBeInTheDocument();
    expect(screen.getByLabelText('Kembali')).toBeInTheDocument();
  });

  it('verifies valid IAR license', async () => {
    const { toast } = await import('sonner');
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/YB1AAA/i), { target: { value: 'yb1aaa' } });
    fireEvent.click(screen.getByText('Verifikasi'));
    await waitFor(() => expect(toast.success).toHaveBeenCalled(), { timeout: 2500 });
    expect((await screen.findAllByText(/VERIFIED/i))[0]).toBeInTheDocument();
  });

  it('rejects invalid IAR license', async () => {
    const { toast } = await import('sonner');
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText(/YB1AAA/i), { target: { value: 'bad' } });
    fireEvent.click(screen.getByRole('button', { name: /Verifikasi/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled(), { timeout: 2500 });
  });

  it('two-way mode locked until verified', () => {
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    const twoWay = screen.getByLabelText(/Mode Dua Arah/i) as HTMLInputElement;
    expect(twoWay.disabled).toBe(true);
  });

  it('COR toggle sets localStorage', () => {
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('COR MATI'));
    expect(localStorage.getItem('nextvwt:cor_active')).toBe('true');
    expect(screen.getByText('COR AKTIF')).toBeInTheDocument();
  });

  it('TOT slider updates value', () => {
    render(<ROIPBridgePanel onClose={vi.fn()} />);
    const slider = screen.getByLabelText(/Time-Out Timer:/i) as HTMLInputElement;
    fireEvent.change(slider, { target: { value: '45' } });
    expect(screen.getByText('45 Detik')).toBeInTheDocument();
  });
});
