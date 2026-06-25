package com.nextvwt.ai

object CodecManager {
    enum class AudioCodec { OPUS, CODEC2 }

    private var currentCodec: AudioCodec = AudioCodec.OPUS
    private var isFallbackEnabled: Boolean = false

    fun initialize() {
        // Panggil inisialisasi native library binding JNI C++
        System.loadLibrary("nextvwt_audio_native")
        nativeInitCodecEngine()
    }

    fun setCodec(codec: AudioCodec) {
        this.currentCodec = codec
    }

    fun evaluateNetworkQuality(packetLossRate: Double, latencyMs: Long) {
        // Skenario fallback otomatis jika kualitas sinyal seluler di Indonesia memburuk secara ekstrem
        if ((packetLossRate > 0.40 || latencyMs > 600) && currentCodec == AudioCodec.OPUS) {
            setCodec(AudioCodec.CODEC2)
            isFallbackEnabled = true
        } else if (packetLossRate < 0.15 && latencyMs < 200 && isFallbackEnabled) {
            setCodec(AudioCodec.OPUS)
            isFallbackEnabled = false
        }
    }

    fun encodeAudioFrame(frame: ShortArray): ByteArray {
        return when (currentCodec) {
            AudioCodec.OPUS -> nativeEncodeOpus(frame)
            AudioCodec.CODEC2 -> nativeEncodeCodec2(frame)
        }
    }

    fun decodeAudioFrame(data: ByteArray): ShortArray {
        return when (currentCodec) {
            AudioCodec.OPUS -> nativeDecodeOpus(data)
            AudioCodec.CODEC2 -> nativeDecodeCodec2(data)
        }
    }

    // Penanda fungsi Native C++ JNI Binding
    private external fun nativeInitCodecEngine()
    private external fun nativeEncodeOpus(frame: ShortArray): ByteArray
    private external fun nativeEncodeCodec2(frame: ShortArray): ByteArray
    private external fun nativeDecodeOpus(data: ByteArray): ShortArray
    private external fun nativeDecodeCodec2(data: ByteArray): ShortArray
}
