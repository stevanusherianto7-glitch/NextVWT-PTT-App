import { describe, it, expect, vi } from 'vitest';
import {
  PttStatePayloadSchema,
  VoiceChunkPayloadSchema,
  WebRTCSignalingPayloadSchema,
  HangUpPayloadSchema,
  KickPayloadSchema,
  ReactionPayloadSchema,
  PresenceMetaSchema,
  UpdateRolePayloadSchema,
  UpdateStatusPayloadSchema,
  safeParseRealtimePayload,
} from './realtimePayloads';

describe('PttStatePayloadSchema', () => {
  const validPttPayload = {
    userId: 'user-abc-123',
    displayName: 'Anto Bandung',
    callSign: 'ANTA1',
    isTransmitting: true,
  };

  it('payload lengkap valid → sukses', () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, role: 'noc' });
    expect(res.success).toBe(true);
  });

  it('field role opsional → sukses tanpa role', () => {
    const res = PttStatePayloadSchema.safeParse(validPttPayload);
    expect(res.success).toBe(true);
  });

  it("userId string kosong '' → gagal (min 1)", () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, userId: '' });
    expect(res.success).toBe(false);
  });

  it('userId > 200 karakter → gagal', () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, userId: 'A'.repeat(201) });
    expect(res.success).toBe(false);
  });

  it('displayName > 100 karakter → gagal', () => {
    const res = PttStatePayloadSchema.safeParse({
      ...validPttPayload,
      displayName: 'D'.repeat(101),
    });
    expect(res.success).toBe(false);
  });

  it("callSign lowercase 'ab1' → gagal (harus UPPERCASE atau pattern /^[A-Z0-9]{2,8}$/)", () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, callSign: 'ab1' });
    expect(res.success).toBe(false);
  });

  it('callSign > 8 karakter → gagal', () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, callSign: 'ABCDEFGHI' });
    expect(res.success).toBe(false);
  });

  it("isTransmitting bukan boolean (string 'true') → gagal", () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, isTransmitting: 'true' });
    expect(res.success).toBe(false);
  });

  it('timestamp negatif → terima (tidak ada constraint positif)', () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, timestamp: -1000 });
    expect(res.success).toBe(true);
  });

  it("role nilai tidak valid 'admin' → gagal", () => {
    const res = PttStatePayloadSchema.safeParse({ ...validPttPayload, role: 'admin' });
    expect(res.success).toBe(false);
  });
});

describe('VoiceChunkPayloadSchema', () => {
  it('base64 valid → sukses', () => {
    const res = VoiceChunkPayloadSchema.safeParse({ userId: 'u1', base64: 'aW1hZ2U=' });
    expect(res.success).toBe(true);
  });

  it("base64 kosong '' → gagal (min 1)", () => {
    const res = VoiceChunkPayloadSchema.safeParse({ userId: 'u1', base64: '' });
    expect(res.success).toBe(false);
  });

  it('base64 > 1_100_000 karakter → gagal (DOS prevention)', () => {
    const res = VoiceChunkPayloadSchema.safeParse({ userId: 'u1', base64: 'A'.repeat(1_100_001) });
    expect(res.success).toBe(false);
  });

  it('callSign null → sukses (nullable)', () => {
    const res = VoiceChunkPayloadSchema.safeParse({ userId: 'u1', base64: 'abc', callSign: null });
    expect(res.success).toBe(true);
  });

  it('userId hilang → gagal', () => {
    const res = VoiceChunkPayloadSchema.safeParse({ base64: 'abc' });
    expect(res.success).toBe(false);
  });
});

describe('WebRTCSignalingPayloadSchema', () => {
  const baseSig = {
    senderUserId: 'sender-1',
  };

  it("type='offer' dengan SDP string → sukses", () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      ...baseSig,
      type: 'offer',
      data: { type: 'offer', sdp: 'v=0...' },
    });
    expect(res.success).toBe(true);
  });

  it("type='answer' dengan SDP string → sukses", () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      ...baseSig,
      type: 'answer',
      data: { type: 'answer', sdp: 'v=0...' },
    });
    expect(res.success).toBe(true);
  });

  it("type='candidate' dengan ICE object → sukses", () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      ...baseSig,
      type: 'candidate',
      data: { candidate: 'candidate:1...', sdpMid: '0', sdpMLineIndex: 0 },
    });
    expect(res.success).toBe(true);
  });

  it("type='invalid_type' → gagal", () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      ...baseSig,
      type: 'invalid_type',
      data: { type: 'offer' },
    });
    expect(res.success).toBe(false);
  });

  it('senderUserId kosong → gagal', () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      senderUserId: '',
      type: 'offer',
      data: { type: 'offer' },
    });
    expect(res.success).toBe(false);
  });

  it('targetUserId tidak ada → sukses (opsional)', () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      senderUserId: 'sender-1',
      type: 'offer',
      data: { type: 'offer' },
    });
    expect(res.success).toBe(true);
  });

  it('data bukan RTCSdp atau ICE → gagal', () => {
    const res = WebRTCSignalingPayloadSchema.safeParse({
      senderUserId: 'sender-1',
      type: 'offer',
      data: 'invalid_string_instead_of_object',
    });
    expect(res.success).toBe(false);
  });
});

describe('HangUpPayloadSchema', () => {
  it('targetUserId valid → sukses', () => {
    const res = HangUpPayloadSchema.safeParse({ targetUserId: 'user-1' });
    expect(res.success).toBe(true);
  });

  it('moderatorName opsional → sukses tanpa field ini', () => {
    const res = HangUpPayloadSchema.safeParse({ targetUserId: 'user-1' });
    expect(res.success).toBe(true);
  });

  it('moderatorName > 100 karakter → gagal', () => {
    const res = HangUpPayloadSchema.safeParse({
      targetUserId: 'user-1',
      moderatorName: 'M'.repeat(101),
    });
    expect(res.success).toBe(false);
  });

  it('targetUserId kosong → gagal', () => {
    const res = HangUpPayloadSchema.safeParse({ targetUserId: '' });
    expect(res.success).toBe(false);
  });
});

describe('KickPayloadSchema', () => {
  it('payload valid → sukses', () => {
    const res = KickPayloadSchema.safeParse({ targetUserId: 'user-1', reason: 'spam' });
    expect(res.success).toBe(true);
  });

  it('targetUserId kosong → gagal', () => {
    const res = KickPayloadSchema.safeParse({ targetUserId: '' });
    expect(res.success).toBe(false);
  });

  it('field opsional tidak ada → sukses', () => {
    const res = KickPayloadSchema.safeParse({ targetUserId: 'user-1' });
    expect(res.success).toBe(true);
  });
});

describe('ReactionPayloadSchema', () => {
  const validReaction = {
    id: 'r1',
    reaction: '👍',
    senderName: 'Anto',
  };

  it("category='animation' → sukses", () => {
    const res = ReactionPayloadSchema.safeParse({ ...validReaction, category: 'animation' });
    expect(res.success).toBe(true);
  });

  it("category='sound' → sukses", () => {
    const res = ReactionPayloadSchema.safeParse({ ...validReaction, category: 'sound' });
    expect(res.success).toBe(true);
  });

  it("category='gift' → sukses", () => {
    const res = ReactionPayloadSchema.safeParse({ ...validReaction, category: 'gift' });
    expect(res.success).toBe(true);
  });

  it("category='unknown' → gagal", () => {
    const res = ReactionPayloadSchema.safeParse({ ...validReaction, category: 'unknown' });
    expect(res.success).toBe(false);
  });

  it('reaction string kosong → gagal', () => {
    const res = ReactionPayloadSchema.safeParse({
      ...validReaction,
      category: 'animation',
      reaction: '',
    });
    expect(res.success).toBe(false);
  });
});

describe('UpdateRolePayloadSchema', () => {
  it("nextRole='noc' → sukses", () => {
    const res = UpdateRolePayloadSchema.safeParse({ targetUserId: 'u1', nextRole: 'noc' });
    expect(res.success).toBe(true);
  });

  it("nextRole='invalid' → gagal", () => {
    const res = UpdateRolePayloadSchema.safeParse({ targetUserId: 'u1', nextRole: 'invalid' });
    expect(res.success).toBe(false);
  });

  it('targetUserId ada → sukses', () => {
    const res = UpdateRolePayloadSchema.safeParse({ targetUserId: 'u1', nextRole: 'guest' });
    expect(res.success).toBe(true);
  });
});

describe('UpdateStatusPayloadSchema', () => {
  it("statusType='muted' → sukses", () => {
    const res = UpdateStatusPayloadSchema.safeParse({ targetUserId: 'u1', statusType: 'muted' });
    expect(res.success).toBe(true);
  });

  it("statusType='unknown_status' → gagal", () => {
    const res = UpdateStatusPayloadSchema.safeParse({
      targetUserId: 'u1',
      statusType: 'unknown_status',
    });
    expect(res.success).toBe(false);
  });
});

describe('PresenceMetaSchema', () => {
  it('payload lengkap → sukses', () => {
    const res = PresenceMetaSchema.safeParse({
      userId: 'u1',
      displayName: 'User 1',
      callSign: 'USR1',
      status: 'wait_controlled',
      role: 'noc',
    });
    expect(res.success).toBe(true);
  });

  it("status='wait_controlled' → sukses", () => {
    const res = PresenceMetaSchema.safeParse({ status: 'wait_controlled' });
    expect(res.success).toBe(true);
  });

  it("role='noc' → sukses", () => {
    const res = PresenceMetaSchema.safeParse({ role: 'noc' });
    expect(res.success).toBe(true);
  });
});

describe('safeParseRealtimePayload helper', () => {
  it('payload valid → kembalikan data parsed (bukan null)', () => {
    const data = safeParseRealtimePayload(KickPayloadSchema, { targetUserId: 'u1' });
    expect(data).toEqual({ targetUserId: 'u1' });
  });

  it('payload invalid → kembalikan null (tidak throw)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = safeParseRealtimePayload(KickPayloadSchema, { targetUserId: '' });
    expect(data).toBeNull();
    spy.mockRestore();
  });

  it('payload null → kembalikan null', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = safeParseRealtimePayload(KickPayloadSchema, null);
    expect(data).toBeNull();
    spy.mockRestore();
  });

  it('payload undefined → kembalikan null', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = safeParseRealtimePayload(KickPayloadSchema, undefined);
    expect(data).toBeNull();
    spy.mockRestore();
  });

  it('payload number 42 → kembalikan null', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = safeParseRealtimePayload(KickPayloadSchema, 42);
    expect(data).toBeNull();
    spy.mockRestore();
  });

  it("payload string 'hello' → kembalikan null", () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const data = safeParseRealtimePayload(KickPayloadSchema, 'hello');
    expect(data).toBeNull();
    spy.mockRestore();
  });
});
