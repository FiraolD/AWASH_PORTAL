import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { CustomerButton, EmptyState, ErrorNotice, Field, formatMoney, LoadingBlock, OptionPicker, palette, ScreenHeading, StatusPill, type Claim, type Policy } from '@/components/CustomerScreens';

export default function ClaimsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { token } = useCustomerAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [policyId, setPolicyId] = useState('');
  const [incidentDate, setIncidentDate] = useState('');
  const [natureOfLoss, setNatureOfLoss] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const activePolicies = policies.filter((policy) => policy.status?.toUpperCase() === 'ACTIVE');
  const statusOptions = ['all', ...new Set(claims.map((claim) => claim.status?.toUpperCase()).filter(Boolean))];
  const filteredClaims = claims.filter((claim) => {
    const matchesStatus = statusFilter === 'all' || claim.status?.toUpperCase() === statusFilter;
    const searchable = `${claim.claimNumber} ${claim.policyNumber} ${claim.natureOfLoss} ${claim.policyType || ''}`.toLowerCase();
    return matchesStatus && searchable.includes(searchTerm.trim().toLowerCase());
  });

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [claimData, policyData] = await Promise.all([customerRequest<Claim[]>('/claims', token), customerRequest<Policy[]>('/policies/my-policies', token)]);
      setClaims(claimData);
      setPolicies(policyData);
      const activePolicy = policyData.find((policy) => policy.status?.toUpperCase() === 'ACTIVE');
      if (!policyId && activePolicy) setPolicyId(activePolicy.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load claims.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [token]);

  useEffect(() => {
    if (!id || !token) { setSelectedClaim(null); return; }
    let active = true;
    setDetailLoading(true);
    customerRequest<Record<string, unknown>>(`/claims/${encodeURIComponent(id)}`, token)
      .then((detail) => { if (active) setSelectedClaim(detail); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load claim details.'); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [id, token]);

  const submit = async () => {
    if (!token || !policyId || !incidentDate || !natureOfLoss || !description.trim()) {
      Alert.alert('Missing details', 'Select a policy and complete the incident details before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      await customerRequest('/claims', token, { method: 'POST', body: JSON.stringify({ policyId, incidentDate, natureOfLoss, incidentDescription: description.trim(), location: location.trim() || undefined, estimatedAmount: amount ? Number(amount) : undefined }) });
      setFormOpen(false);
      setIncidentDate(''); setNatureOfLoss(''); setDescription(''); setLocation(''); setAmount('');
      await load(true);
      Alert.alert('Claim submitted', 'Your claim has been sent to our team for review.');
    } catch (reason) { Alert.alert('Unable to submit', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  return <>
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
      <View style={styles.header}><ScreenHeading kicker="CLAIMS & INCIDENTS" title="My claims" subtitle="Follow the progress of a claim or report a new incident." /><Pressable disabled={!activePolicies.length} onPress={() => setFormOpen(true)} style={[styles.newButton, !activePolicies.length && styles.disabled]}><Text style={styles.newButtonText}>＋  New claim</Text></Pressable></View>
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
      {!loading && policies.length > 0 && !activePolicies.length ? <View style={styles.note}><Text style={styles.noteText}>A claim can be filed against an active policy. No active cover was found on your account.</Text></View> : null}
      {!loading && claims.length ? <View style={styles.filters}><TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search claim or policy number…" placeholderTextColor={palette.muted} style={styles.search} /><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{statusOptions.map((status) => <Pressable key={status} onPress={() => setStatusFilter(status)} style={[styles.chip, statusFilter === status && styles.selectedChip]}><Text style={[styles.chipText, statusFilter === status && styles.selectedChipText]}>{status === 'all' ? 'All statuses' : status.replaceAll('_', ' ')}</Text></Pressable>)}</ScrollView></View> : null}
      {loading ? <LoadingBlock /> : filteredClaims.length ? filteredClaims.map((claim) => <Pressable key={claim.id} onPress={() => router.push({ pathname: '/(tabs)/claims', params: { id: claim.id } } as Href)} style={styles.card}>
        <View style={styles.cardTop}><View style={styles.claimIcon}><Text style={styles.claimGlyph}>◇</Text></View><View style={styles.claimInfo}><Text style={styles.claimNumber}>{claim.claimNumber || 'Claim'}</Text><Text style={styles.policyText}>Policy {claim.policyNumber || 'details unavailable'}</Text></View><StatusPill status={claim.status} /></View>
        <View style={styles.rule} /><Text style={styles.loss}>{claim.natureOfLoss || 'Claim incident'}</Text>
        <View style={styles.claimBottom}><Text style={styles.date}>{claim.incidentDate ? `Incident ${new Date(claim.incidentDate).toLocaleDateString()}` : 'Date not provided'}</Text>{claim.estimatedAmount ? <Text style={styles.amount}>{formatMoney(claim.estimatedAmount)}</Text> : null}</View>
      </Pressable>) : <EmptyState title={claims.length ? 'No matching claims' : 'No claims filed'} detail={claims.length ? 'Try changing your search or status filter.' : policies.length ? 'If something happens, you can start a claim from here.' : 'You need a policy before you can submit a claim.'} />}
    </ScrollView>
    <Modal visible={!!id} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => router.replace('/(tabs)/claims' as Href)}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent}>
        <View style={styles.modalTop}><Text style={styles.modalTitle}>Claim details</Text><Pressable onPress={() => router.replace('/(tabs)/claims' as Href)}><Text style={styles.close}>Close</Text></Pressable></View>
        {detailLoading ? <LoadingBlock /> : selectedClaim ? <>
          <View style={detailStyles.hero}><Text style={detailStyles.eyebrow}>CLAIM REFERENCE</Text><Text style={detailStyles.number}>{String(selectedClaim.claimNumber || 'Claim')}</Text><StatusPill status={String(selectedClaim.status || '')} /></View>
          <View style={detailStyles.card}>
            <DetailLine label="Policy" value={String(selectedClaim.policyNumber || 'Not available')} />
            <DetailLine label="Product" value={String(selectedClaim.policyType || 'Insurance')} />
            <DetailLine label="Nature of loss" value={String(selectedClaim.natureOfLoss || 'Not provided')} />
            <DetailLine label="Incident date" value={formatDate(selectedClaim.incidentDate)} />
            <DetailLine label="Submitted" value={formatDate(selectedClaim.submittedDate)} />
            <DetailLine label="Estimated amount" value={formatMoney(selectedClaim.estimatedAmount as number)} last />
          </View>
          <View style={detailStyles.card}><Text style={detailStyles.heading}>Incident description</Text><Text style={detailStyles.body}>{String(selectedClaim.incidentDescription || 'No description provided.')}</Text></View>
          {selectedClaim.location ? <View style={detailStyles.card}><Text style={detailStyles.heading}>Location</Text><Text style={detailStyles.body}>{String(selectedClaim.location)}</Text></View> : null}
          {selectedClaim.officerRemarks ? <View style={detailStyles.card}><Text style={detailStyles.heading}>Review update</Text><Text style={detailStyles.body}>{String(selectedClaim.officerRemarks)}</Text></View> : null}
        </> : <ErrorNotice message="Could not load claim details." onRetry={() => router.replace('/(tabs)/claims' as Href)} />}
      </ScrollView>
    </Modal>
    <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFormOpen(false)}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalTop}><Text style={styles.modalTitle}>Report an incident</Text><Pressable onPress={() => setFormOpen(false)}><Text style={styles.close}>Close</Text></Pressable></View>
        <Text style={styles.modalHint}>Tell us what happened. Our claims team will contact you if more information is needed.</Text>
        <OptionPicker label="Policy" value={policyId} options={activePolicies.map((policy) => ({ label: policy.policyNumber || policy.type, value: policy.id }))} onChange={setPolicyId} />
        <Field label="Incident date" value={incidentDate} onChangeText={setIncidentDate} placeholder="YYYY-MM-DD" />
        <Field label="Type of loss" value={natureOfLoss} onChangeText={setNatureOfLoss} placeholder="e.g. Vehicle damage" />
        <Field label="What happened?" value={description} onChangeText={setDescription} placeholder="Describe the incident" multiline />
        <Field label="Location (optional)" value={location} onChangeText={setLocation} placeholder="City or address" />
        <Field label="Estimated amount (optional)" value={amount} onChangeText={setAmount} placeholder="0" keyboardType="numeric" />
        <CustomerButton title={submitting ? 'Submitting…' : 'Submit claim'} onPress={() => void submit()} disabled={submitting} />
        <CustomerButton title="Cancel" onPress={() => setFormOpen(false)} secondary />
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

const detailStyles = StyleSheet.create({ hero: { backgroundColor: palette.green, padding: 16, borderRadius: 11, marginTop: 16, alignItems: 'flex-start', gap: 8 }, eyebrow: { color: '#DBEAFE', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, number: { color: 'white', fontSize: 20, fontWeight: '800' }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginTop: 11 }, heading: { color: palette.ink, fontSize: 14, fontWeight: '800', paddingVertical: 10 }, body: { color: palette.muted, fontSize: 12, lineHeight: 18, paddingBottom: 12 }, line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 12 }, border: { borderBottomWidth: 1, borderBottomColor: palette.line }, label: { color: palette.muted, fontSize: 11, flex: 1 }, value: { color: palette.ink, fontSize: 11, fontWeight: '700', flex: 1, textAlign: 'right' } });

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' }, header: { gap: 10 }, filters: { marginTop: 12 }, search: { borderWidth: 1, borderColor: palette.line, borderRadius: 9, backgroundColor: 'white', minHeight: 44, paddingHorizontal: 12, color: palette.ink, fontSize: 13 }, chips: { gap: 7, paddingVertical: 10 }, chip: { borderWidth: 1, borderColor: palette.line, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7 }, selectedChip: { borderColor: palette.green, backgroundColor: '#EFF6FF' }, chipText: { color: palette.muted, fontSize: 10, fontWeight: '700', textTransform: 'capitalize' }, selectedChipText: { color: palette.green }, note: { backgroundColor: '#FEF3C7', borderRadius: 9, padding: 12, marginTop: 10 }, noteText: { color: '#854D0E', fontSize: 11, lineHeight: 16 }, newButton: { alignSelf: 'flex-start', backgroundColor: palette.green, minHeight: 39, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 8 }, newButtonText: { color: 'white', fontSize: 12, fontWeight: '800' }, disabled: { opacity: 0.5 }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 10 }, cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, claimIcon: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#FEF3C7' }, claimGlyph: { color: '#854D0E', fontSize: 22, fontWeight: '800' }, claimInfo: { flex: 1 }, claimNumber: { color: palette.ink, fontSize: 13, fontWeight: '800' }, policyText: { color: palette.muted, fontSize: 10, marginTop: 4 }, rule: { height: 1, backgroundColor: palette.line, marginVertical: 12 }, loss: { color: palette.ink, fontSize: 13, fontWeight: '700', textTransform: 'capitalize' }, claimBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }, date: { color: palette.muted, fontSize: 10 }, amount: { color: palette.ink, fontSize: 11, fontWeight: '700' }, modal: { flex: 1, backgroundColor: palette.paper }, modalContent: { padding: 22, paddingBottom: 35, maxWidth: 600, width: '100%', alignSelf: 'center' }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: palette.ink, fontSize: 21, fontWeight: '800' }, close: { color: palette.green, fontSize: 13, fontWeight: '800' }, modalHint: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 8 } });