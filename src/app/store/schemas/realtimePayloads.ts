/**
 * ─── Zod Schemas untuk Supabase Realtime Payloads ──────────────────────────
 *
 * [F-04 FIX] Semua payload dari Supabase Realtime harus divalidasi sebelum
 * digunakan untuk mengubah state. Tanpa validasi, attacker dapat mengirim
 * payload yang malformed dan menyebabkan state corruption.
 *
 * Gunakan `safeParseRealtimePayload(schema, payload)` di setiap handler.
 */

import { z } from 'zod';

// ─── Shared primitives ──────────────────────────────────────────────────────

const UserIdSchema = z.string().min(1).max(200);
const DisplayNameSchema = z.string().min(1).max(100);
const CallSignSchema = z.string().regex(/^[A-Z0-9]{2,8}$/);
const ChannelRoleSchema = z.enum(['noc', 'sys_admin', 'pjc', 'operator', 'guest']);

// ─── PTT State broadcast (ptt_state event) ─────────────────────────────────
export const PttStatePayloadSchema = z.object({
  userId: UserIdSchema,
  displayName: DisplayNameSchema,
  callSign: CallSignSchema,
  isTransmitting: z.boolean(),
  role: ChannelRoleSchema.optional(),
  isNewUser: z.boolean().optional(),
  timestamp: z.number().optional(),
});
export type PttStatePayload = z.infer<typeof PttStatePayloadSchema>;

// ─── Voice chunk broadcast (voice_chunk event) ──────────────────────────────
export const VoiceChunkPayloadSchema = z.object({
  userId: UserIdSchema,
  callSign: z.string().optional().nullable(),
  // base64 audio — max ~750KB per chunk (255ms Opus @ 128kbps)
  base64: z.string().min(1).max(1_100_000),
});
export type VoiceChunkPayload = z.infer<typeof VoiceChunkPayloadSchema>;

// ─── WebRTC signaling (webrtc_signaling event) ─────────────────────────────
const RTCSessionDescriptionSchema = z.object({
  type: z.enum(['offer', 'answer', 'rollback', 'pranswer']),
  sdp: z.string().optional(),
});
const RTCIceCandidateSchema = z.object({
  candidate: z.string().optional(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
});

export const WebRTCSignalingPayloadSchema = z.object({
  senderUserId: UserIdSchema,
  senderCallSign: z.string().optional().nullable(),
  targetUserId: UserIdSchema.optional().nullable(),
  targetCallSign: z.string().optional().nullable(),
  type: z.enum(['offer', 'answer', 'candidate']),
  data: z.union([RTCSessionDescriptionSchema, RTCIceCandidateSchema]),
});
export type WebRTCSignalingPayload = z.infer<typeof WebRTCSignalingPayloadSchema>;

// ─── Hang up broadcast (hang_up event) ──────────────────────────────────────
export const HangUpPayloadSchema = z.object({
  targetUserId: UserIdSchema,
  moderatorName: z.string().max(100).optional(),
});
export type HangUpPayload = z.infer<typeof HangUpPayloadSchema>;

// ─── Reaction broadcast (reaction event) ───────────────────────────────────
export const ReactionPayloadSchema = z.object({
  id: z.string().min(1).max(100),
  category: z.enum(['animation', 'sound', 'gift']),
  reaction: z.string().min(1).max(50),
  senderName: z.string().min(1).max(100),
  roomId: z.string().optional(),
  senderId: UserIdSchema.optional(),
  senderCallSign: z.string().optional().nullable(),
  createdAt: z.number().optional(),
});
export type ReactionPayload = z.infer<typeof ReactionPayloadSchema>;

// ─── Kick broadcast (kick event) ────────────────────────────────────────────
export const KickPayloadSchema = z.object({
  targetUserId: UserIdSchema,
  reason: z.string().max(200).optional(),
});
export type KickPayload = z.infer<typeof KickPayloadSchema>;

// ─── Presence metadata (Supabase presence sync) ─────────────────────────────
export const PresenceMetaSchema = z.object({
  userId: z.string().min(1).max(200).optional().nullable(),
  displayName: z.string().max(100).optional().nullable(),
  callSign: z.string().max(20).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  avatarUrl: z.string().max(1000).optional().nullable(),
  createdAt: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
});
export type PresenceMeta = z.infer<typeof PresenceMetaSchema>;

// ─── Update role broadcast (update_role event) ──────────────────────────────
export const UpdateRolePayloadSchema = z.object({
  targetUserId: UserIdSchema,
  nextRole: ChannelRoleSchema,
});
export type UpdateRolePayload = z.infer<typeof UpdateRolePayloadSchema>;

// ─── Update status broadcast (update_status event) ──────────────────────────
export const UpdateStatusPayloadSchema = z.object({
  targetUserId: UserIdSchema,
  statusType: z.enum(['normal', 'muted', 'controlled', 'wait', 'wait_controlled']),
});
export type UpdateStatusPayload = z.infer<typeof UpdateStatusPayloadSchema>;

// ─── Helper: safe parse dengan logging ──────────────────────────────────────

/**
 * Safely parse a Realtime payload against a Zod schema.
 * Returns the parsed data on success, null on failure (with a warning log).
 *
 * @example
 * const payload = safeParseRealtimePayload(PttStatePayloadSchema, rawPayload);
 * if (!payload) return; // silently drop invalid payloads
 */
export function safeParseRealtimePayload<T>(
  schema: z.ZodSchema<T>,
  rawPayload: unknown,
  eventName?: string
): T | null {
  const result = schema.safeParse(rawPayload);
  if (!result.success) {
    console.warn(
      `[Realtime] Invalid payload${eventName ? ` for event "${eventName}"` : ''} — dropped.`,
      result.error.issues
    );
    return null;
  }
  return result.data;
}
