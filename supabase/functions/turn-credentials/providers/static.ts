// @ts-nocheck
import { IceServer, TurnProvider } from '../types.ts';

export class StaticProvider implements TurnProvider {
  async getIceServers(): Promise<IceServer[]> {
    // Ambil dari environment variable Supabase Edge Function secrets
    const turnUrl = Deno.env.get('COTURN_URL') ?? 'turn:YOUR_BIZNET_GIO_IP:3478';
    const turnUsername = Deno.env.get('COTURN_USERNAME') ?? '';
    const turnCredential = Deno.env.get('COTURN_CREDENTIAL') ?? '';

    const servers: IceServer[] = [
      // STUN (gratis, tidak butuh auth)
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Tambahkan TURN hanya jika credential tersedia
    if (turnUsername && turnCredential) {
      servers.push(
        {
          urls: turnUrl,
          username: turnUsername,
          credential: turnCredential,
        },
        // TURN over TLS (port 443 untuk bypass firewall ketat)
        {
          urls: turnUrl.replace('turn:', 'turns:').replace(':3478', ':443'),
          username: turnUsername,
          credential: turnCredential,
        }
      );
    }

    return servers;
  }
}
