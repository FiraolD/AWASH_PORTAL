import { TelebirrProvider } from './providers/TelebirrProvider';
import { ChapaPayProvider } from './providers/ChapaPayProvider';
export class PaymentProviderFactory {
    static getProvider(name) {
        if (this.providers.has(name)) {
            return this.providers.get(name);
        }
        let provider;
        switch (name) {
            case 'telebirr':
                provider = new TelebirrProvider();
                break;
            case 'chapa':
                provider = new ChapaPayProvider();
                break;
            // Add more providers here
            default:
                throw new Error(`Unknown payment provider: ${name}`);
        }
        this.providers.set(name, provider);
        return provider;
    }
    static getAvailableProviders() {
        return [
            { id: 'telebirr', name: 'Telebirr', logo: '/logos/telebirr.png' },
            { id: 'chapa', name: 'Chapa Pay', logo: '/logos/chapa.png' },
            // { id: 'awashbirr', name: 'AwashBirr', logo: '/logos/awashbirr.png' },
            // { id: 'arifpay', name: 'ArifPay', logo: '/logos/arifpay.png' },
        ];
    }
}
PaymentProviderFactory.providers = new Map();
