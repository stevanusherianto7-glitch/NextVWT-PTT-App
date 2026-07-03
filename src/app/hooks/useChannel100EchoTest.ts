import { useState, useRef, useCallback } from 'react';
import { useAudioPlayback } from './useAudioPlayback';

export const useChannel100EchoTest = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasChunks, setHasChunks] = useState(false);
  const [isPlayingBack, setIsPlayingBack] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isCapturingRef = useRef(false);
  const isPlayingBackRef = useRef(false);

  const { playAudioChunk } = useAudioPlayback();

  const startEchoCapture = useCallback(async () => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setIsCapturing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false },
      });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setHasChunks(false);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
          setHasChunks(true);
        }
      };

      mediaRecorder.onstop = async () => {
        isCapturingRef.current = false;
        setIsCapturing(false);
        const chunks = chunksRef.current;
        if (chunks.length > 0 && isPlayingBackRef.current) {
          try {
            // Combine all chunks into a single Blob (a complete WebM file)
            const combinedBlob = new Blob(chunks, { type: mediaRecorder.mimeType });
            const arrayBuffer = await combinedBlob.arrayBuffer();

            // Convert to base64
            const base64String = btoa(
              new Uint8Array(arrayBuffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                ''
              )
            );

            // Play the complete audio file
            await playAudioChunk(base64String);
          } catch (error) {
            console.error('[EchoTest] Error processing audio playback:', error);
          } finally {
            isPlayingBackRef.current = false;
            setIsPlayingBack(false);
          }
        }
      };

      mediaRecorder.start(100);
    } catch (err: unknown) {
      isCapturingRef.current = false;
      setIsCapturing(false);
      setHasChunks(false);
      const errorName = err instanceof Error ? err.name : '';
      if (errorName === 'NotAllowedError') {
        throw new Error('MicPermissionDenied', { cause: err });
      } else if (errorName === 'NotFoundError') {
        throw new Error('MicNotFound', { cause: err });
      }
      throw err;
    }
  }, [playAudioChunk]);

  const stopEchoAndPlayback = useCallback(() => {
    if (mediaRecorderRef.current && isCapturingRef.current) {
      isPlayingBackRef.current = true;
      setIsPlayingBack(true);
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  }, []);

  const cancelEcho = useCallback(() => {
    if (mediaRecorderRef.current && isCapturingRef.current) {
      isCapturingRef.current = false;
      setIsCapturing(false);
      isPlayingBackRef.current = false;
      setIsPlayingBack(false);
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    }
  }, []);

  return {
    startEchoCapture,
    stopEchoAndPlayback,
    cancelEcho,
    echoStatus: { isCapturing, hasChunks, isPlayingBack },
  };
};
