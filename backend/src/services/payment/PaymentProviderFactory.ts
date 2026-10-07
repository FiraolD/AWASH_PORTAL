import { BasePaymentProvider } from './BasePaymentProvider';
import { TelebirrProvider } from './providers/TelebirrProvider';
import { ChapaPayProvider } from './providers/ChapaPayProvider';
// import { AwashBirrProvider } from './providers/AwashBirrProvider';
// import { ArifPayProvider } from './providers/ArifPayProvider';

export type PaymentProviderName = 'telebirr' | 'awashbirr' | 'chapa' | 'arifpay';

export class PaymentProviderFactory {
  private static providers: Map<PaymentProviderName, BasePaymentProvider> = new Map();

  static getProvider(name: PaymentProviderName): BasePaymentProvider {
    if (this.providers.has(name)) {
      return this.providers.get(name)!;
    }

    let provider: BasePaymentProvider;
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

  static getAvailableProviders(): { id: PaymentProviderName; name: string; logo: string }[] {
    return [
      { id: 'telebirr', name: 'Telebirr', logo: '/logos/telebirr.png' },
      { id: 'chapa', name: 'Chapa Pay', logo: '/logos/chapa.png' },
      // { id: 'awashbirr', name: 'AwashBirr', logo: '/logos/awashbirr.png' },
      // { id: 'arifpay', name: 'ArifPay', logo: '/logos/arifpay.png' },
    ];
  }
}