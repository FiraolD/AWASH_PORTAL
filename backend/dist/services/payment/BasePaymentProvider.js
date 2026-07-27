export class BasePaymentProvider {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
        this.merchantId = config.merchantId;
        this.baseUrl = config.baseUrl;
    }
}
