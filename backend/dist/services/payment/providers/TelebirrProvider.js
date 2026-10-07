import axios from 'axios';
import { BasePaymentProvider } from '../BasePaymentProvider.js';
export class TelebirrProvider extends BasePaymentProvider {
    constructor() {
        super({
            apiKey: process.env.TELEBIRR_API_KEY || '',
            apiSecret: process.env.TELEBIRR_API_SECRET || '',
            merchantId: process.env.TELEBIRR_MERCHANT_ID || '',
            baseUrl: process.env.TELEBIRR_BASE_URL || 'https://api.telebirr.com',
        });
        this.appId = process.env.TELEBIRR_APP_ID || '';
        this.shortCode = process.env.TELEBIRR_SHORT_CODE || '';
    }
    async initiatePayment(request) {
        try {
            const payload = {
                appId: this.appId,
                appKey: this.apiKey,
                nonce: Date.now().toString(),
                notifyUrl: request.callbackUrl,
                outTradeNo: request.reference,
                returnUrl: request.returnUrl,
                shortCode: this.shortCode,
                subject: request.description,
                timeoutExpress: '30',
                timestamp: new Date().toISOString(),
                totalAmount: request.amount.toFixed(2),
            };
            const response = await axios.post(`${this.baseUrl}/api/v1/payment/prepay`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiSecret}`,
                },
            });
            return {
                success: true,
                transactionId: response.data.data?.tradeNo || '',
                providerReference: response.data.data?.toPayUrl || '',
                checkoutUrl: response.data.data?.toPayUrl,
                message: 'Payment initiated successfully',
            };
        }
        catch (error) {
            console.error('Telebirr payment error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || 'Payment initiation failed',
            };
        }
    }
    async verifyPayment(reference) {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/payment/query/${reference}`, {
                headers: { 'Authorization': `Bearer ${this.apiSecret}` },
            });
            const data = response.data;
            return {
                providerReference: reference,
                status: data.data?.tradeState === 'SUCCESS' ? 'success' : 'pending',
                amount: parseFloat(data.data?.totalAmount || '0'),
            };
        }
        catch (error) {
            return { providerReference: reference, status: 'failed' };
        }
    }
    async handleWebhook(payload) {
        return {
            providerReference: payload.outTradeNo,
            transactionId: payload.tradeNo,
            status: payload.tradeState === 'SUCCESS' ? 'success' : 'failed',
            amount: parseFloat(payload.totalAmount || '0'),
        };
    }
}
