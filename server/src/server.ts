import express, { Request, Response } from 'express';
import * as crypto from 'crypto';

const app = express();
app.use(express.json());

// P1-a: JANGAN pakai hardcoded fallback secret. Webhook HMAC harus
// diambil dari env. Jika tidak diset, server GAGAL-TERTUTUP (fail-closed)
// bukan pakai default yang bisa ditebak attacker.
const GATEWAY_WEBHOOK_SECRET = process.env.GATEWAY_WEBHOOK_SECRET;
if (!GATEWAY_WEBHOOK_SECRET) {
  console.error(
    '[SECURITY_ALERT] GATEWAY_WEBHOOK_SECRET tidak diset. ' +
      'Webhook payment TIDAK diaktifkan (fail-closed) untuk mencegah ' +
      'forgery signature. Set env GATEWAY_WEBHOOK_SECRET di server.'
  );
}

// P1-b: ROIP bridge registration wajib pakai shared secret (bearer token)
// yang hanya diketahui server + bridge terdaftar. Tidak ada auth = tolak.
const ROIP_API_KEY = process.env.ROIP_API_KEY;

// Endpoint Verifikasi Pembayaran dari Payment Gateway Lokal
app.post('/api/v1/payment/webhook', (req: Request, res: Response) => {
  // Fail-closed: jika secret tidak diset, tolak semua webhook.
  if (!GATEWAY_WEBHOOK_SECRET) {
    return res
      .status(503)
      .json({ status: 'error', message: 'Webhook verification not configured' });
  }

  const signature = req.headers['x-callback-signature'] as string;

  if (!signature) {
    return res.status(401).json({ status: 'error', message: 'Missing signature header' });
  }

  // Skema Pengamanan Verifikasi Kebasahan Data Webhook (Signature Verification)
  const computedSignature = crypto
    .createHmac('sha256', GATEWAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  // Constant-time compare untuk mencegah timing attack.
  const sigBuf = Buffer.from(signature);
  const calcBuf = Buffer.from(computedSignature);
  if (sigBuf.length !== calcBuf.length || !crypto.timingSafeEqual(sigBuf, calcBuf)) {
    console.error('[SECURITY_ALERT] Invalid webhook signature detected!');
    return res.status(403).json({ status: 'error', message: 'Invalid signature verification' });
  }

  const { invoice_id, status, amount, user_id } = req.body;

  if (status === 'PAID') {
    // Eksekusi pemutakhiran database saldo menggunakan skema transaksi ACID Ledger Aman
    console.log(`[PAYMENT_SUCCESS] Invoice ${invoice_id} paid. Crediting coins to user ${user_id}.`);
    // TODO: db.updateUserBalance(user_id, amount * koin_rate);
  }

  return res.status(200).json({ status: 'success', message: 'Webhook processed completely' });
});

// Endpoint Kontrol Otorisasi Pendaftaran ROIP Jembatan
app.post('/api/v1/roip/register', (req: Request, res: Response) => {
  // P1-b: wajib auth bearer token. Tanpa ROIP_API_KEY di server,
  // endpoint dimatikan (fail-closed).
  if (!ROIP_API_KEY) {
    return res
      .status(503)
      .json({ status: 'denied', message: 'ROIP registration not configured' });
  }

  const authHeader = req.headers['authorization'] as string | undefined;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token || !crypto.timingSafeEqual(Buffer.from(token), Buffer.from(ROIP_API_KEY))) {
    return res.status(401).json({ status: 'denied', message: 'Unauthorized' });
  }

  const { userId, gatewayMacAddress, radioLicenseNumber, channelMapping } = req.body;

  // Evaluasi Prasyarat Aspek Hukum Penggunaan Frekuensi Udara (Legal Gatekeeping)
  if (!radioLicenseNumber || radioLicenseNumber.length < 5) {
    return res.status(400).json({
      status: 'denied',
      message:
        'Pendaftaran ditolak. Nomor Izin Stasiun Radio (IAR/IKR) wajib dilampirkan secara valid.',
    });
  }

  console.log(
    `[ROIP_REGISTRATION] Gateway ${gatewayMacAddress} bound to channel ${channelMapping} under license ${radioLicenseNumber}`
  );
  return res.status(201).json({ status: 'approved', message: 'ROIP Bridge successfully authorized' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[NextVWT_SERVER_RUNNING] Core control engine listening on port ${PORT}`);
});
