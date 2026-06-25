package com.nextvwt.roip

object ROIPGateway {
    private var isTransmitLocked: Boolean = false
    private var lastTransmitTimestamp: Long = 0L
    private const val TIME_OUT_TIMER_LIMIT = 60000L // Batas TOT maksimal 60 detik demi aspek perlindungan hardware

    fun initGPIO() {
        // Inisialisasi pin hardware pada microcomputer gateway (misal Raspberry Pi GPIO)
        nativeSetupGPIO()
    }

    @Synchronized
    fun setRadioPTTState(active: Boolean): Boolean {
        if (active) {
            // Cegah pengaktifan jika sedang terkunci akibat aturan pencegahan kerusakan (overheat protection)
            if (isTransmitLocked) return false

            // Aturan Kerja: Deteksi Carrier Operated Relay (COR) - Pastikan frekuensi analog tidak sedang sibuk
            if (nativeIsChannelBusy()) return false

            lastTransmitTimestamp = System.currentTimeMillis()
            nativeSetGPIOPinHigh()

            // Jalankan background checker untuk memantau Time-Out Timer secara realtime
            startTOTMonitor()
            return true
        } else {
            nativeSetGPIOPinLow()
            return true
        }
    }

    private fun startTOTMonitor() {
        Thread {
            while (true) {
                Thread.sleep(500)
                if (System.currentTimeMillis() - lastTransmitTimestamp > TIME_OUT_TIMER_LIMIT) {
                    // Paksa mematikan transmisi karena melanggar batas waktu TOT maksimal
                    forceShutdown()
                    break
                }
            }
        }.start()
    }

    @Synchronized
    private fun forceShutdown() {
        nativeSetGPIOPinLow()
        isTransmitLocked = true
        // Kunci pemancar selama 30 detik untuk memberikan ruang pendinginan fisik komponen radio
        Thread {
            Thread.sleep(30000)
            isTransmitLocked = false
        }.start()
    }

    private external fun nativeSetupGPIO()
    private external fun nativeSetGPIOPinHigh()
    private external fun nativeSetGPIOPinLow()
    private external fun nativeIsChannelBusy(): Boolean
}
