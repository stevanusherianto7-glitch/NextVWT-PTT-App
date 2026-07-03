import { IceServer, TurnProvider } from '../types.ts';

export class TwilioProvider implements TurnProvider {
  async getIceServers(): Promise<IceServer[]> {
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing');
    }

    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Twilio API failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    interface TwilioIceServer {
      url?: string;
      urls?: string | string[];
      username?: string;
      credential?: string;
    }
    const iceServers = data.ice_servers.map((server: TwilioIceServer) => ({
      urls: server.urls || server.url || '',
      username: server.username,
      credential: server.credential
    }));

    return iceServers as IceServer[];
  }
}
