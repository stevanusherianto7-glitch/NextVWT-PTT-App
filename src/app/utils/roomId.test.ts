import { describe, it, expect } from 'vitest';
import { resolveRoomId } from './roomId';

describe('resolveRoomId', () => {
  it('returns default when channel is null/undefined', () => {
    expect(resolveRoomId(null)).toBe('room:default');
    expect(resolveRoomId(undefined as unknown as null)).toBe('room:default');
  });

  it('prefers id over number over name', () => {
    expect(resolveRoomId({ id: 'abc', number: 5, name: 'Main' })).toBe('room:abc');
    expect(resolveRoomId({ number: 5, name: 'Main' })).toBe('room:5');
    expect(resolveRoomId({ name: 'Main' })).toBe('room:main');
  });

  it('normalizes whitespace and casing', () => {
    expect(resolveRoomId({ name: '  Hello World ' })).toBe('room:hello-world');
  });

  it('falls back to default when all fields missing', () => {
    expect(resolveRoomId({})).toBe('room:default');
  });
});
