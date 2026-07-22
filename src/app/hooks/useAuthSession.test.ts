import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuthSession } from './useAuthSession';
import { usePTTStore } from '../store/usePTTStore';
import { getSupabase } from '../utils/supabase';

vi.mock('../utils/supabase', () => {
  const mockAuth = {
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  };
  return {
    getSupabase: vi.fn(() => Promise.resolve({ auth: mockAuth })),
    supabase: { auth: mockAuth },
  };
});

describe('useAuthSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePTTStore.setState({ user: null, infoText: 'Pebe Herianto' });
    // Re-arm getSupabase mock per test
    const mockAuth = {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    };
    vi.mocked(getSupabase).mockResolvedValue({ auth: mockAuth } as never);
  });

  it('skips guest users (isGuest flag)', async () => {
    usePTTStore.setState({
      user: { id: 'guest-1', isGuest: true } as never,
    });
    renderHook(() => useAuthSession());
    await waitFor(() => {});
    // applyUser returns early for guest; setUser never called with a real user
    expect(usePTTStore.getState().user).toMatchObject({ isGuest: true });
  });

  it('applies authenticated user and syncs display name', async () => {
    const mockAuth = {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: {
                id: 'user-123',
                email: 'budi@example.com',
                user_metadata: { full_name: 'Budi Santoso' },
              },
            },
          },
        })
      ),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    };
    vi.mocked(getSupabase).mockResolvedValue({ auth: mockAuth } as never);

    renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(usePTTStore.getState().user).not.toBeNull();
    });
    expect(usePTTStore.getState().user?.id).toBe('user-123');
    expect(usePTTStore.getState().infoText).toBe('Budi Santoso');
  });

  it('falls back to email prefix when no full_name', async () => {
    const mockAuth = {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: {
            session: {
              user: { id: 'user-456', email: 'sari@example.com', user_metadata: {} },
            },
          },
        })
      ),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    };
    vi.mocked(getSupabase).mockResolvedValue({ auth: mockAuth } as never);

    renderHook(() => useAuthSession());

    await waitFor(() => {
      expect(usePTTStore.getState().infoText).toBe('sari');
    });
  });
});
