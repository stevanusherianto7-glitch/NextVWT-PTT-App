import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useModerationActions } from './useModerationActions';

const mockInvoke = vi.fn();
const mockSend = vi.fn();
const mockRemove = vi.fn();
const mockSubscribe = vi.fn();

vi.mock('../../app/utils/supabase', () => ({
  getSupabase: vi.fn(() =>
    Promise.resolve({
      functions: { invoke: mockInvoke },
      channel: () => ({
        subscribe: (cb: (s: string) => void) => {
          mockSubscribe(cb);
          cb('SUBSCRIBED');
          return { send: mockSend, unsubscribe: mockRemove };
        },
        send: mockSend,
        removeChannel: mockRemove,
      }),
      removeChannel: mockRemove,
    })
  ),
}));

const ctx = { roomId: 'ptt-room-1', actorId: 'actor-1' };

describe('useModerationActions — client-side guard', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockSend.mockReset();
    mockRemove.mockReset();
    mockSubscribe.mockReset();
    mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
  });

  it('setUserRole → calls edge fn when actor allowed + hierarchy ok', async () => {
    const a = useModerationActions({ ...ctx, actorRole: 'noc' });
    await a.setUserRole('target-1', 'guest', 'operator');
    expect(mockInvoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({
        body: expect.objectContaining({ action: 'SET_USER_ROLE', target_user_id: 'target-1' }),
      })
    );
  });

  it('setUserRole → THROWS if actor lacks MANAGE_ROLES (guest/operator)', async () => {
    const guest = useModerationActions({ ...ctx, actorRole: 'guest' });
    await expect(guest.setUserRole('t', 'guest', 'operator')).rejects.toThrow(/izin/);
    const op = useModerationActions({ ...ctx, actorRole: 'operator' });
    await expect(op.setUserRole('t', 'guest', 'operator')).rejects.toThrow(/izin/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('setUserRole → THROWS if actor cannot moderate target rank', async () => {
    // pjc can moderate operator/guest but NOT sys_admin/noc
    const pjc = useModerationActions({ ...ctx, actorRole: 'pjc' });
    await expect(pjc.setUserRole('t', 'sys_admin', 'operator')).rejects.toThrow(/tingkat/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('setUserRole → THROWS if nextRole rank >= actor rank', async () => {
    const pjc = useModerationActions({ ...ctx, actorRole: 'pjc' });
    await expect(pjc.setUserRole('t', 'guest', 'noc')).rejects.toThrow(/lebih tinggi/);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('muteUser/blockPTT/blockChat → gated by action permission', async () => {
    const guest = useModerationActions({ ...ctx, actorRole: 'guest' });
    await expect(guest.muteUser('t')).rejects.toThrow(/izin/);
    const noc = useModerationActions({ ...ctx, actorRole: 'noc' });
    await noc.muteUser('t', 'guest', 15);
    expect(mockInvoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({ body: expect.objectContaining({ action: 'MUTE_USER' }) })
    );
  });

  it('kickUser → subscribes a moderation channel, broadcasts kick, then calls edge fn', async () => {
    const noc = useModerationActions({ ...ctx, actorRole: 'noc' });
    await noc.kickUser('target-9', 'guest');
    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ event: 'kick' }));
    expect(mockInvoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({ body: expect.objectContaining({ action: 'KICK_USER' }) })
    );
  });

  it('banUser → calls BAN_USER then kicks', async () => {
    const noc = useModerationActions({ ...ctx, actorRole: 'noc' });
    await noc.banUser('target-9', 'guest', 'spam', 0);
    expect(mockInvoke).toHaveBeenCalledWith(
      'moderate-channel',
      expect.objectContaining({ body: expect.objectContaining({ action: 'BAN_USER' }) })
    );
  });

  it('edge fn error → propagates (no silent swallow)', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'Forbidden' } });
    const noc = useModerationActions({ ...ctx, actorRole: 'noc' });
    await expect(noc.muteUser('t', 'guest', 15)).rejects.toThrow(/Forbidden/);
  });
});
