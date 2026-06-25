package com.nextvwt.payment

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class PaymentGateway(private val apiKey: String) {

    fun createQRISInvoice(amount: Double, description: String, onSuccess: (invoiceId: String, qrisData: String) -> Unit, onFailure: (error: String) -> Unit) {
        Thread {
            try {
                val url = URL("https://api.localgateway.co.id/v1/invoices")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "POST"
                conn.setRequestProperty("Authorization", "Bearer $apiKey")
                conn.setRequestProperty("Content-Type", "application/json")
                conn.doOutput = true

                val payload = JSONObject().apply {
                    put("amount", amount)
                    put("description", description)
                    put("payment_type", "QRIS_DYNAMIC")
                }

                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(Charsets.UTF_8))
                }

                if (conn.responseCode == 200) {
                    val response = conn.inputStream.bufferedReader().use { it.readText() }
                    val jsonResponse = JSONObject(response)
                    val invoiceId = jsonResponse.getString("id")
                    val qrisData = jsonResponse.getJSONObject("payment_data").getString("qr_string")
                    onSuccess(invoiceId, qrisData)
                } else {
                    onFailure("HTTP Error: ${conn.responseCode}")
                }
            } catch (e: Exception) {
                onFailure(e.message ?: "Unknown Connection Error")
            }
        }.start()
    }
}

object WalletManager {
    private var internalCoinBalance: Int = 0

    @Synchronized
    fun getBalance(): Int = internalCoinBalance

    @Synchronized
    fun creditCoins(amount: Int) {
        if (amount > 0) {
            internalCoinBalance += amount
        }
    }

    @Synchronized
    fun debitCoins(amount: Int): Boolean {
        return if (internalCoinBalance >= amount) {
            internalCoinBalance -= amount
            true
        } else {
            false
        }
    }
}
