import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { CustomerButton, EmptyState, ErrorNotice, Field, formatMoney, LoadingBlock, OptionPicker, palette, ScreenHeading, StatusPill, type Policy } from '@/components/CustomerScreens';

interface Product { id: string; name: string; code: string; description?: string; }
interface ProductField { name: string; label: string; type: string; required: boolean; options?: (string | { label: string; value: string })[]; }
interface ProductDetails { customFields?: ProductField[]; }
interface PremiumEstimate { totalPremium: number; monthlyPremium: number; basePremium: number; }

export default function PoliciesScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useCustomerAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [applicationOpen, setApplicationOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [productFields, setProductFields] = useState<ProductField[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [coverage, setCoverage] = useState('500000');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [estimate, setEstimate] = useState<PremiumEstimate | null>(null);
  const [working, setWorking] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setPolicies(await customerRequest<Policy[]>('/policies/my-policies', token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load policies.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [token]);

  useEffect(() => {
    if (!id || !token) { setSelectedPolicy(null); return; }
    let active = true;
    setDetailLoading(true);
    customerRequest<Record<string, unknown>>(`/policies/${encodeURIComponent(id)}/details`, token)
      .then((detail) => { if (active) setSelectedPolicy(detail); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load policy details.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  const productTypes = ['all', ...new Set(policies.map((policy) => policy.type?.toLowerCase()).filter(Boolean))];
  const filteredPolicies = policies.filter((policy) => {
    const matchesType = typeFilter === 'all' || policy.type?.toLowerCase() === typeFilter;
    const matchesSearch = `${policy.policyNumber} ${policy.type} ${policy.status}`.toLowerCase().includes(searchTerm.trim().toLowerCase());
    return matchesType && matchesSearch;
  });

  const beginApplication = async () => {
    if (!token) return;
    setApplicationOpen(true);
    if (products.length) return;
    setWorking(true);
    try { setProducts(await customerRequest<Product[]>('/products/available', token)); }
    catch (reason) { Alert.alert('Unable to load products', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setWorking(false); }
  };

  const chooseProduct = async (next: Product) => {
    if (!token) return;
    setProduct(next);
    setProductFields([]);
    setFieldValues({});
    setEstimate(null);
    setWorking(true);
    try {
      const details = await customerRequest<ProductDetails>(`/products/${next.id}`, token);
      setProductFields(details.customFields || []);
    } catch (reason) {
      Alert.alert('Product details unavailable', reason instanceof Error ? reason.message : 'Please try again.');
    } finally { setWorking(false); }
  };

  const calculate = async () => {
    if (!token || !product || Number(coverage) < 100000) {
      Alert.alert('Coverage amount', 'Choose a product and enter coverage of at least ETB 100,000.');
      return;
    }
    setWorking(true);
    try {
      setEstimate(await customerRequest<PremiumEstimate>('/policies/calculate-premium', token, { method: 'POST', body: JSON.stringify({ productType: product.code, coverageAmount: Number(coverage), termMonths: 12, productDetails: fieldValues }) }));
    } catch (reason) { Alert.alert('Unable to calculate premium', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setWorking(false); }
  };

  const submitApplication = async () => {
    if (!token || !product || !estimate) return;
    const missing = productFields.find((field) => field.required && !fieldValues[field.name]?.trim());
    if (missing) { Alert.alert('More details needed', `Please complete ${missing.label}.`); return; }
    if (!agreed) { Alert.alert('Terms required', 'Please confirm the application details before submitting.'); return; }
    setWorking(true);
    try {
      const effectiveDate = new Date().toISOString().slice(0, 10);
      const expirationDate = new Date(new Date(`${effectiveDate}T00:00:00`).setFullYear(new Date(`${effectiveDate}T00:00:00`).getFullYear() + 1)).toISOString().slice(0, 10);
      const result = await customerRequest<{ policyNumber: string }>('/policies', token, { method: 'POST', body: JSON.stringify({ type: product.code, coverageAmount: Number(coverage), premiumFrequency: 'ANNUALLY', effectiveDate, expirationDate, productDetails: fieldValues }) });
      setApplicationOpen(false);
      setProduct(null); setProductFields([]); setFieldValues({}); setEstimate(null); setAgreed(false);
      await load(true);
      Alert.alert('Application submitted', `Your reference is ${result.policyNumber}. We will notify you when it has been reviewed.`);
    } catch (reason) { Alert.alert('Unable to submit application', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setWorking(false); }
  };

  return <>
  <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
    <View style={styles.header}><ScreenHeading kicker="YOUR INSURANCE" title="My policies" subtitle="Coverage and policy details for your account." /><Pressable onPress={() => void beginApplication()} style={styles.applyButton}><Text style={styles.applyText}>＋  Apply for cover</Text></Pressable></View>
    <View style={styles.filters}><TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search policies…" placeholderTextColor={palette.muted} style={styles.search} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{productTypes.map((type) => <Pressable key={type} onPress={() => setTypeFilter(type)} style={[styles.chip, typeFilter === type && styles.selectedChip]}><Text style={[styles.chipText, typeFilter === type && styles.selectedChipText]}>{type === 'all' ? 'All' : type}</Text></Pressable>)}</ScrollView></View>
    {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
    {loading ? <LoadingBlock /> : filteredPolicies.length ? filteredPolicies.map((policy) => <Pressable key={policy.id} onPress={() => router.push({ pathname: '/(tabs)/policies', params: { id: policy.id } } as Href)} style={styles.card}>
      <View style={styles.cardTop}><View style={styles.policyType}><Text style={styles.mark}>A</Text><View><Text style={styles.typeText}>{policy.type || 'Insurance'} cover</Text><Text style={styles.policyNumber}>{policy.policyNumber || 'Application pending'}</Text></View></View><StatusPill status={policy.status} /></View>
      <View style={styles.rule} />
      <View style={styles.details}><View style={styles.detail}><Text style={styles.label}>COVERAGE</Text><Text style={styles.value}>{formatMoney(policy.coverageAmount)}</Text></View><View style={styles.detail}><Text style={styles.label}>PREMIUM</Text><Text style={styles.value}>{formatMoney(policy.premium)}</Text></View></View>
      <Text style={styles.dates}>{policy.effectiveDate ? `Effective ${new Date(policy.effectiveDate).toLocaleDateString()}` : 'Coverage dates will be shown once active'}{policy.expirationDate ? `  ·  Ends ${new Date(policy.expirationDate).toLocaleDateString()}` : ''}</Text>
    </Pressable>) : <EmptyState title={policies.length ? 'No matching policies' : 'Nothing here yet'} detail={policies.length ? 'Try changing your search or product filter.' : 'Your policy applications and active cover will appear here.'} />}
  </ScrollView>
  <Modal visible={!!id} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => router.replace('/(tabs)/policies' as Href)}>
    <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
      <View style={styles.modalTop}><Text style={styles.modalTitle}>Policy details</Text><Pressable onPress={() => router.replace('/(tabs)/policies' as Href)}><Text style={styles.close}>Close</Text></Pressable></View>
      {detailLoading ? <LoadingBlock /> : selectedPolicy ? <>
        <View style={detailStyles.hero}><Text style={detailStyles.heroEyebrow}>{String(selectedPolicy.type || 'INSURANCE')} COVER</Text><Text style={detailStyles.heroNumber}>{String(selectedPolicy.policyNumber || 'Policy')}</Text><StatusPill status={String(selectedPolicy.status || '')} /></View>
        <View style={detailStyles.card}>
          <DetailLine label="Coverage amount" value={formatMoney(selectedPolicy.coverageAmount as number)} />
          <DetailLine label="Premium" value={formatMoney(selectedPolicy.premium as number)} />
          <DetailLine label="Effective date" value={formatDate(selectedPolicy.effectiveDate)} />
          <DetailLine label="Expiration date" value={formatDate(selectedPolicy.expirationDate)} last />
        </View>
        {selectedPolicy.underwriterNotes ? <View style={detailStyles.card}><Text style={detailStyles.heading}>Underwriter notes</Text><Text style={detailStyles.note}>{String(selectedPolicy.underwriterNotes)}</Text></View> : null}
        {selectedPolicy.productDetails ? <View style={detailStyles.card}><Text style={detailStyles.heading}>Insured details</Text>{Object.entries(typeof selectedPolicy.productDetails === 'string' ? safeParse(selectedPolicy.productDetails) : selectedPolicy.productDetails as Record<string, unknown>).filter(([, value]) => typeof value !== 'object' && value != null).map(([key, value]) => <DetailLine key={key} label={humanize(key)} value={String(value)} />)}</View> : null}
      </> : <ErrorNotice message="Could not load policy details." onRetry={() => router.replace('/(tabs)/policies' as Href)} />}
    </ScrollView>
  </Modal>
  <Modal visible={applicationOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setApplicationOpen(false)}>
    <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
      <View style={styles.modalTop}><Text style={styles.modalTitle}>Apply for cover</Text><Pressable onPress={() => setApplicationOpen(false)}><Text style={styles.close}>Close</Text></Pressable></View>
      <Text style={styles.modalHint}>Choose a product, share the required details, and review your estimated premium.</Text>
      <Text style={styles.fieldLabel}>Insurance product</Text>
      {working && !products.length ? <LoadingBlock /> : products.length ? <View style={styles.products}>{products.map((item) => <Pressable key={item.id} onPress={() => void chooseProduct(item)} style={[styles.productOption, product?.id === item.id && styles.selectedProduct]}><Text style={[styles.productName, product?.id === item.id && styles.selectedProductName]}>{item.name}</Text>{item.description ? <Text style={styles.productDescription} numberOfLines={2}>{item.description}</Text> : null}</Pressable>)}</View> : <EmptyState title="No products available" detail="Please check back with us later." />}
      {product ? <>
        {productFields.map((field) => field.type === 'select' && field.options?.length ? <OptionPicker key={field.name} label={`${field.label}${field.required ? ' *' : ''}`} value={fieldValues[field.name] || ''} options={field.options.map((option) => typeof option === 'string' ? { label: option, value: option } : option)} onChange={(value) => setFieldValues((current) => ({ ...current, [field.name]: value }))} /> : <Field key={field.name} label={`${field.label}${field.required ? ' *' : ''}`} value={fieldValues[field.name] || ''} onChangeText={(value) => setFieldValues((current) => ({ ...current, [field.name]: value }))} placeholder={field.label} keyboardType={field.type === 'number' ? 'numeric' : field.type === 'email' ? 'email-address' : 'default'} />)}
        <Field label="Coverage amount (ETB)" value={coverage} onChangeText={(value) => { setCoverage(value); setEstimate(null); }} placeholder="500000" keyboardType="numeric" />
        <CustomerButton title={working ? 'Calculating…' : 'Calculate premium'} onPress={() => void calculate()} disabled={working} secondary />
      </> : null}
      {estimate ? <View style={styles.estimate}><Text style={styles.estimateLabel}>ESTIMATED ANNUAL PREMIUM</Text><Text style={styles.estimateAmount}>{formatMoney(estimate.totalPremium)}</Text><Text style={styles.estimateMonthly}>{formatMoney(estimate.monthlyPremium)} monthly equivalent</Text></View> : null}
      {estimate ? <Pressable style={styles.agreement} onPress={() => setAgreed((value) => !value)}><View style={[styles.checkbox, agreed && styles.checked]}><Text style={styles.checkmark}>{agreed ? '✓' : ''}</Text></View><Text style={styles.agreementText}>I confirm the information above is accurate and understand this is an application pending review.</Text></Pressable> : null}
      {estimate ? <CustomerButton title={working ? 'Submitting…' : 'Submit application'} onPress={() => void submitApplication()} disabled={working || !agreed} /> : null}
    </ScrollView>
  </Modal>
  </>;
}

function DetailLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[detailStyles.line, !last && detailStyles.border]}><Text style={detailStyles.label}>{label}</Text><Text style={detailStyles.value}>{value || 'Not provided'}</Text></View>;
}

function formatDate(value: unknown) {
  if (!value) return 'Not available';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function humanize(value: string) { return value.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, (character) => character.toUpperCase()); }

function safeParse(value: string): Record<string, unknown> {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' }, header: { gap: 9 }, filters: { marginTop: 14 }, search: { borderWidth: 1, borderColor: palette.line, borderRadius: 9, backgroundColor: 'white', minHeight: 44, paddingHorizontal: 12, color: palette.ink, fontSize: 13 }, chips: { gap: 7, paddingVertical: 10 }, chip: { borderWidth: 1, borderColor: palette.line, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 7 }, selectedChip: { borderColor: palette.green, backgroundColor: '#EFF6FF' }, chipText: { color: palette.muted, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }, selectedChipText: { color: palette.green }, applyButton: { alignSelf: 'flex-start', backgroundColor: palette.green, minHeight: 39, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 8 }, applyText: { color: 'white', fontSize: 12, fontWeight: '800' }, card: { backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 15, marginTop: 11 }, cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, policyType: { flexDirection: 'row', alignItems: 'center', gap: 10 }, mark: { height: 39, width: 39, lineHeight: 39, borderRadius: 10, overflow: 'hidden', textAlign: 'center', backgroundColor: palette.paleGreen, color: palette.green, fontWeight: '900', fontSize: 17 }, typeText: { color: palette.ink, fontSize: 14, fontWeight: '800', textTransform: 'capitalize' }, policyNumber: { color: palette.muted, fontSize: 11, marginTop: 4 }, rule: { height: 1, backgroundColor: palette.line, marginVertical: 13 }, details: { flexDirection: 'row', gap: 25 }, detail: { flex: 1 }, label: { color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 }, value: { color: palette.ink, fontSize: 15, fontWeight: '800', marginTop: 5 }, dates: { color: palette.muted, fontSize: 10, marginTop: 13 }, modal: { flex: 1, backgroundColor: palette.paper }, modalContent: { padding: 22, paddingBottom: 35, maxWidth: 600, width: '100%', alignSelf: 'center' }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: palette.ink, fontSize: 21, fontWeight: '800' }, close: { color: palette.green, fontSize: 13, fontWeight: '800' }, modalHint: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 7 }, fieldLabel: { color: palette.ink, fontSize: 12, fontWeight: '700', marginTop: 18, marginBottom: 7 }, products: { gap: 8 }, productOption: { backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 9, padding: 12 }, selectedProduct: { borderColor: palette.green, backgroundColor: palette.paleGreen }, productName: { color: palette.ink, fontSize: 13, fontWeight: '800' }, selectedProductName: { color: palette.green }, productDescription: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, estimate: { backgroundColor: palette.ink, borderRadius: 10, padding: 16, marginTop: 16 }, estimateLabel: { color: '#A8C8B4', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, estimateAmount: { color: 'white', fontSize: 23, fontWeight: '800', marginTop: 7 }, estimateMonthly: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 3 }, agreement: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 16 }, checkbox: { width: 22, height: 22, borderWidth: 1, borderColor: palette.line, borderRadius: 5, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' }, checked: { backgroundColor: palette.green, borderColor: palette.green }, checkmark: { color: 'white', fontSize: 13, fontWeight: '900' }, agreementText: { flex: 1, color: palette.muted, fontSize: 11, lineHeight: 17 } });

const detailStyles = StyleSheet.create({ hero: { backgroundColor: palette.green, padding: 16, borderRadius: 11, marginTop: 16, alignItems: 'flex-start', gap: 8 }, heroEyebrow: { color: '#DBEAFE', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, heroNumber: { color: 'white', fontSize: 20, fontWeight: '800' }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginTop: 11 }, heading: { color: palette.ink, fontSize: 14, fontWeight: '800', paddingVertical: 10 }, note: { color: palette.muted, fontSize: 12, lineHeight: 18, paddingBottom: 12 }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }, border: { borderBottomWidth: 1, borderBottomColor: palette.line }, label: { color: palette.muted, fontSize: 11, flex: 1 }, value: { color: palette.ink, fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' } });