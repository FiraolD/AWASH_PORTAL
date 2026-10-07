import axios from 'axios';
import { BasePaymentProvider } from '../BasePaymentProvider.js';
export class ChapaPayProvider extends BasePaymentProvider {
    constructor() {
        super({
            apiKey: process.env.CHAPA_SECRET_KEY || '',
            apiSecret: process.env.CHAPA_SECRET_KEY || '',
            merchantId: process.env.CHAPA_MERCHANT_ID || '',
            baseUrl: 'https://api.chapa.co/v1',
        });
        this.publicKey = process.env.CHAPA_PUBLIC_KEY || '';
    }
    async initiatePayment(request) {
        try {
            const response = await axios.post(`${this.baseUrl}/transaction/initialize`, {
                amount: request.amount.toFixed(2),
                currency: request.currency || 'ETB',
                email: request.customerEmail || 'customer@example.com',
                first_name: request.customerName.split(' ')[0] || '',
                last_name: request.customerName.split(' ').slice(1).join(' ') || '',
                tx_ref: request.reference,
                callback_url: request.callbackUrl,
                return_url: request.returnUrl,
                customization: {
                    title: request.description,
                    description: request.description,
                },
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return {
                success: true,
                transactionId: response.data.data?.tx_ref,
                providerReference: response.data.data?.reference,
                checkoutUrl: response.data.data?.checkout_url,
                message: 'Payment initiated',
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || 'Chapa payment failed',
            };
        }
    }
    async verifyPayment(reference) {
        try {
            const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` },
            });
            return {
                providerReference: reference,
                status: response.data.status === 'success' ? 'success' : 'failed',
                amount: parseFloat(response.data.data?.amount || '0'),
            };
        }
        catch (error) {
            return { providerReference: reference, status: 'failed' };
        }
    }
    async handleWebhook(payload) {
        return {
            providerReference: payload.reference,
            status: payload.status === 'success' ? 'success' : 'failed',
            amount: parseFloat(payload.amount || '0'),
        };
    }
}
