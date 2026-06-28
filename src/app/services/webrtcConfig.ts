export interface WebRTCConfiguration {
  iceServers: RTCIceServer[];
  iceTransportPolicy?: RTCIceTransportPolicy;
}

/**
 * Returns ICE server configuration prioritized for Indonesian mobile operators (Biznet Gio TURN)
 * with Google STUN servers as fallbacks.
 */
export const getIceServersConfig = (): RTCIceServer[] => {
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  const iceServers: RTCIceServer[] = [];

  // Primary: Biznet Gio TURN server if configured
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({
      urls: turnUrl,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  // Fallbacks: Google public STUN servers
  iceServers.push(
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  );

  return iceServers;
};

/**
 * Helper that returns a complete RTCConfiguration object ready for RTCPeerConnection initialization.
 */
export const getWebRTCConfig = (): RTCConfiguration => {
  return {
    iceServers: getIceServersConfig(),
    iceTransportPolicy: 'all',
  };
};
