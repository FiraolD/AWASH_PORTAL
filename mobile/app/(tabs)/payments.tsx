import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { EmptyState, ErrorNotice, formatMoney, LoadingBlock, palette, ScreenHeading, StatusPill } from '@/components/CustomerScreens';

interface PaymentReference {
  id: string;
  reference: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  paidAt?: string | null;
  policyNumber?: string | null;
  claimNumber?: string | null;
}

interface PaymentLookup extends PaymentReference {
  isExpired: boolean;
  expiresAt: string;
}

export default function PaymentsScreen() {
  const { token } = useCustomerAuth();
  const [payments, setPayments] = useState<PaymentReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const [lookup, setLookup] = useState<PaymentLookup | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setPayments(await customerRequest<PaymentReference[]>('/payments/my-references', token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load payment references.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const findReference = async () => {
    const reference = referenceInput.trim();
    if (!reference) { setLookupError('Enter a payment reference number.'); return; }
    setLookupLoading(true);
    setLookupError('');
    try { setLookup(await customerRequest<PaymentLookup>(`/payments/lookup/${encodeURIComponent(reference)}`, token || '')); }
    catch (reason) { setLookup(null); setLookupError(reason instanceof Error ? reason.message : 'Payment reference not found.'); }
    finally { setLookupLoading(false); }
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
    <ScreenHeading kicker="PAYMENTS" title="Make a payment" subtitle="Look up a reference or review your payment history." />
    <View style={styles.lookupCard}>
      <Text style={styles.lookupTitle}>Payment reference</Text>
      <Text style={styles.lookupHint}>Enter the reference number provided for your policy or claim.</Text>
      <View style={styles.lookupRow}><TextInput value={referenceInput} onChangeText={setReferenceInput} onSubmitEditing={() => void findReference()} autoCapitalize="characters" placeholder="e.g. AHO-20260115-0001" placeholderTextColor={palette.muted} style={styles.lookupInput} /><Pressable accessibilityRole="button" onPress={() => void findReference()} disabled={lookupLoading} style={[styles.lookupButton, lookupLoading && styles.disabled]}><Text style={styles.lookupButtonText}>{lookupLoading ? 'Checking…' : 'Look up'}</Text></Pressable></View>
      {lookupError ? <Text style={styles.lookupError}>{lookupError}</Text> : null}
    </View>
    {lookup ? <View style={styles.lookupResult}>
      <View style={styles.resultTop}><View><Text style={styles.label}>PAYMENT DETAILS</Text><Text selectable style={styles.reference}>{lookup.reference}</Text></View><StatusPill status={lookup.isExpired && lookup.status === 'PENDING' ? 'EXPIRED' : lookup.status} /></View>
      <View style={styles.rule} />
      <View style={styles.bottom}><View><Text style={styles.label}>AMOUNT DUE</Text><Text style={styles.amount}>{formatMoney(lookup.amount)}</Text></View><View style={styles.related}><Text style={styles.label}>DESCRIPTION</Text><Text style={styles.relatedValue}>{lookup.description}</Text></View></View>
      {lookup.policyNumber ? <Text style={styles.detailLine}>Policy {lookup.policyNumber}</Text> : null}{lookup.claimNumber ? <Text style={styles.detailLine}>Claim {lookup.claimNumber}</Text> : null}
      {lookup.status === 'PENDING' && !lookup.isExpired ? <View style={styles.instruction}><Text style={styles.instructionTitle}>How to pay</Text><Text style={styles.instructionText}>Use Telebirr, AwashBirr, or your bank app. Enter the reference exactly and pay {formatMoney(lookup.amount)}.</Text><Text style={styles.expiry}>Expires {new Date(lookup.expiresAt).toLocaleDateString()}</Text></View> : null}
      {lookup.status === 'PAID' ? <View style={styles.paid}><Text style={styles.paidTitle}>Payment successful</Text><Text style={styles.paidText}>Thank you for your payment.</Text></View> : null}
      {lookup.isExpired && lookup.status === 'PENDING' ? <View style={styles.expired}><Text style={styles.expiredTitle}>Reference expired</Text><Text style={styles.expiredText}>Contact support to request a new payment reference.</Text></View> : null}
    </View> : null}
    <Text style={styles.historyHeading}>My payment history</Text>
    {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
    {loading ? <LoadingBlock /> : payments.length ? payments.map((payment) => <View key={payment.id || payment.reference} style={styles.card}>
      <View style={styles.top}><View style={styles.referenceBlock}><Text style={styles.label}>PAYMENT REFERENCE</Text><Text selectable style={styles.reference}>{payment.reference}</Text></View><StatusPill status={payment.status} /></View>
      <Text style={styles.description}>{payment.description || 'Insurance payment'}</Text>
      <View style={styles.rule} />
      <View style={styles.bottom}><View><Text style={styles.label}>AMOUNT</Text><Text style={styles.amount}>{formatMoney(payment.amount)}</Text></View><View style={styles.related}><Text style={styles.label}>RELATED TO</Text><Text style={styles.relatedValue}>{payment.policyNumber ? `Policy ${payment.policyNumber}` : payment.claimNumber ? `Claim ${payment.claimNumber}` : 'Account payment'}</Text></View></View>
      <Text style={styles.date}>{payment.paidAt ? `Paid ${new Date(payment.paidAt).toLocaleDateString()}` : `Created ${new Date(payment.createdAt).toLocaleDateString()}`}</Text>
    </View>) : <EmptyState title="No payment references" detail="References associated with your policy and claim payments will appear here." />}
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' }, lookupCard: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 8 }, lookupTitle: { color: palette.ink, fontSize: 14, fontWeight: '800' }, lookupHint: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, lookupRow: { flexDirection: 'row', gap: 8, marginTop: 12 }, lookupInput: { flex: 1, minWidth: 0, minHeight: 45, borderWidth: 1, borderColor: palette.line, borderRadius: 8, backgroundColor: 'white', paddingHorizontal: 11, color: palette.ink, fontSize: 12 }, lookupButton: { minWidth: 75, minHeight: 45, paddingHorizontal: 12, borderRadius: 8, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' }, lookupButtonText: { color: 'white', fontSize: 11, fontWeight: '800' }, disabled: { opacity: 0.6 }, lookupError: { color: palette.coral, fontSize: 11, marginTop: 8 }, lookupResult: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 10 }, resultTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, label: { color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, reference: { color: palette.ink, fontSize: 14, fontWeight: '800', marginTop: 5 }, rule: { height: 1, backgroundColor: palette.line, marginVertical: 12 }, bottom: { flexDirection: 'row', gap: 12 }, amount: { color: palette.green, fontSize: 15, fontWeight: '800', marginTop: 5 }, related: { flex: 1 }, relatedValue: { color: palette.ink, fontSize: 11, fontWeight: '700', marginTop: 5 }, detailLine: { color: palette.muted, fontSize: 10, marginTop: 7 }, instruction: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', borderWidth: 1, borderRadius: 8, padding: 11, marginTop: 12 }, instructionTitle: { color: palette.green, fontSize: 11, fontWeight: '800' }, instructionText: { color: palette.ink, fontSize: 11, lineHeight: 17, marginTop: 5 }, expiry: { color: palette.muted, fontSize: 9, marginTop: 6 }, paid: { backgroundColor: '#ECFDF5', padding: 11, borderRadius: 8, marginTop: 12 }, paidTitle: { color: '#166534', fontSize: 11, fontWeight: '800' }, paidText: { color: '#166534', fontSize: 10, marginTop: 4 }, expired: { backgroundColor: '#F3F4F6', padding: 11, borderRadius: 8, marginTop: 12 }, expiredTitle: { color: palette.ink, fontSize: 11, fontWeight: '800' }, expiredText: { color: palette.muted, fontSize: 10, marginTop: 4 }, historyHeading: { color: palette.ink, fontSize: 17, fontWeight: '800', marginTop: 22, marginBottom: 2 }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 12, padding: 15, marginTop: 11 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, referenceBlock: { flex: 1 }, description: { color: palette.muted, fontSize: 11, marginTop: 11 }, date: { color: palette.muted, fontSize: 10, marginTop: 12 } });