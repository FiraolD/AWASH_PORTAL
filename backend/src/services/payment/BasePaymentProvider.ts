// Base interface all payment providers must implement
export interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  callbackUrl: string;
  returnUrl: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  providerReference?: string;
  checkoutUrl?: string;       // For redirect-based payments
  deeplink?: string;          // For mobile app payments
  message?: string;
  error?: string;
}

export interface PaymentCallback {
  transactionId?: string;
  providerReference: string;
  status: 'success' | 'failed' | 'pending';
  amount?: number;
  metadata?: Record<string, any>;
}

export abstract class BasePaymentProvider {
  protected apiKey: string;
  protected apiSecret: string;
  protected merchantId: string;
  protected baseUrl: string;

  constructor(config: {
    apiKey: string;
    apiSecret: string;
    merchantId: string;
    baseUrl: string;
  }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.merchantId = config.merchantId;
    this.baseUrl = config.baseUrl;
  }

  abstract initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;
  abstract verifyPayment(reference: string): Promise<PaymentCallback>;
  abstract handleWebhook(payload: any): Promise<PaymentCallback>;
}