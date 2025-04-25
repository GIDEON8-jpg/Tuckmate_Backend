const QRCode = require('qrcode');
const crypto = require('crypto');
const config = require('../config/config');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);

class QRService {
    static async generateOrderQR(orderId, paymentMethod) {
        const expiryMinutes = paymentMethod === 'cash'
            ? config.qr.cashExpiryMinutes
            : config.qr.ecocashExpiryMinutes;

        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

        const payload = {
            orderId,
            paymentMethod,
            expiry: expiry.toISOString()
        };

        // Create a signature for verification
        const hmac = crypto.createHmac('sha256', config.qr.secret);
        hmac.update(JSON.stringify(payload));
        const signature = hmac.digest('hex');

        const dataToEncode = {
            ...payload,
            signature
        };

        const dataString = JSON.stringify(dataToEncode);

        // Generate QR code image
        const qrCodePath = path.join(__dirname, `../../public/qrcodes/order_${orderId}.png`);
        await QRCode.toFile(qrCodePath, dataString, {
            color: {
                dark: '#000000',
                light: '#ffffff'
            },
            width: 300,
            margin: 1
        });

        return {
            data: dataString,
            expiry,
            imageUrl: `/qrcodes/order_${orderId}.png`
        };
    }

    static async verifyQR(data) {
        try {
            const parsedData = JSON.parse(data);

            // Verify signature
            const hmac = crypto.createHmac('sha256', config.qr.secret);
            hmac.update(JSON.stringify({
                orderId: parsedData.orderId,
                paymentMethod: parsedData.paymentMethod,
                expiry: parsedData.expiry
            }));
            const calculatedSignature = hmac.digest('hex');

            if (calculatedSignature !== parsedData.signature) {
                return { valid: false, error: 'Invalid QR code signature' };
            }

            // Check expiration
            if (new Date(parsedData.expiry) < new Date()) {
                return {
                    valid: false,
                    error: 'QR code expired',
                    expired: true,
                    orderId: parsedData.orderId
                };
            }

            return { valid: true, data: parsedData };
        } catch (error) {
            return { valid: false, error: 'Invalid QR code data' };
        }
    }
}

module.exports = QRService;