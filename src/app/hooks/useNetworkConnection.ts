import { useEffect } from 'react';
import { usePTTStore } from '../store/usePTTStore';
import { toast } from 'sonner';

/**
 * Handles online/offline network events.
 * Reconnects the Supabase channel on reconnect and clears state on disconnect.
 */
export function useNetworkConnection() {
  useEffect(() => {
    const handleOnline = () => {
      toast.success('Koneksi internet terhubung kembali. Menghubungkan radio...');
      const store = usePTTStore.getState();
      store.setConnected(true);
      if (store.isPowerOn) {
        store.subscribeToChannel(store.channelNumber);
      }
    };

    const handleOffline = () => {
      toast.error('Koneksi internet terputus. Radio offline.');
      const store = usePTTStore.getState();
      store.setConnected(false);
      usePTTStore.setState({
        activeUsers: [],
        activeTransmitter: null,
        progress: 0,
        isTransmitting: false,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
}
