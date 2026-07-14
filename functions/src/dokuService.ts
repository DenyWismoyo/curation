// functions/src/dokuService.ts
import * as crypto from 'crypto';

// Menggunakan endpoint Sandbox
const DOKU_BASE_URL = 'https://api-sandbox.doku.com'; 

// Helper: Format Timestamp ISO8601 dengan Timezone +07:00 (Standar Wajib SNAP BI)
const getDokuTimestamp = (): string => {
  const date = new Date();
  const offset = 7 * 60; // +07:00 (WIB)
  const localDate = new Date(date.getTime() + offset * 60 * 1000);
  return localDate.toISOString().replace('Z', '+07:00');
};

/**
 * FASE 1: Mendapatkan Access Token B2B (RSA-SHA256)
 */
export const getDokuB2BToken = async (clientId: string, privateKey: string): Promise<string> => {
  const timestamp = getDokuTimestamp();
  const path = '/authorization/v1/access-token/b2b';
  
  const stringToSign = `${clientId}|${timestamp}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(stringToSign);
  sign.end();
  const signatureBase64 = sign.sign(privateKey, 'base64');

  const headers = {
    'X-CLIENT-KEY': clientId,
    'X-TIMESTAMP': timestamp,
    'X-SIGNATURE': signatureBase64,
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${DOKU_BASE_URL}${path}`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ grantType: 'client_credentials' })
  });

  const data = await response.json();
  if (!response.ok || !data.accessToken) {
    throw new Error(`DOKU Token Error: ${JSON.stringify(data)}`);
  }

  return data.accessToken;
};

/**
 * FASE 2: Mendapatkan String QRIS MPM (HMAC-SHA512)
 */
export const generateDokuQRIS = async (
  clientId: string, 
  secretKey: string, 
  accessToken: string, 
  invoiceNumber: string,
  amount: number
): Promise<{ qrContent: string, referenceNo: string }> => {
  const timestamp = getDokuTimestamp();
  const path = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate'; 
  
  // Format Payload Standar SNAP BI untuk QRIS
  const payload = {
    partnerReferenceNo: invoiceNumber,
    amount: {
      value: Number(amount).toFixed(2), // Wajib menyertakan 2 angka desimal
      currency: "IDR"
    },
    feeAmount: {
      value: "0.00",
      currency: "IDR"
    }
  };

  const minifiedBody = JSON.stringify(payload);
  const bodyHash = crypto.createHash('sha256').update(minifiedBody).digest('hex').toLowerCase();

  // String to Sign (Symmetric)
  const stringToSign = `POST:${path}:${accessToken}:${bodyHash}:${timestamp}`;
  const hmac = crypto.createHmac('sha512', secretKey);
  hmac.update(stringToSign);
  const signatureBase64 = hmac.digest('base64');

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'X-TIMESTAMP': timestamp,
    'X-SIGNATURE': signatureBase64,
    'X-PARTNER-ID': clientId,
    'X-EXTERNAL-ID': invoiceNumber, 
    'CHANNEL-ID': 'SDK',
    'Content-Type': 'application/json'
  };

  const response = await fetch(`${DOKU_BASE_URL}${path}`, {
    method: 'POST',
    headers: headers,
    body: minifiedBody
  });

  const data = await response.json();
  if (!response.ok || !data.qrContent) {
    throw new Error(`DOKU QRIS Error: ${JSON.stringify(data)}`);
  }

  return {
    qrContent: data.qrContent,
    referenceNo: data.referenceNo
  };
};