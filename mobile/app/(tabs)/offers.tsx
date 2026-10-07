import { useEffect, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { CustomerButton, EmptyState, ErrorNotice, Field, formatMoney, LoadingBlock, palette, ScreenHeading, type PolicyOffer } from '@/components/CustomerScreens';

type Decision = 'ACCEPT' | 'REJECT';

export default function OffersScreen() {
  const { token } = useCustomerAuth();
  const [offers, setOffers] = useState<PolicyOffer[]>([]);
  const [selected, setSelected] = useState<PolicyOffer | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setOffers(await customerRequest<PolicyOffer[]>('/policies/pending-decision', token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load policy offers.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const submitDecision = async () => {
    if (!token || !selected || !decision) return;
    setSubmitting(true);
    try {
      await customerRequest(`/policies/${selected.id}/respond`, token, { method: 'POST', body: JSON.stringify({ decision, notes: notes.trim() }) });
      setSelected(null); setDecision(null); setNotes('');
      await load(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit your decision.');
    } finally { setSubmitting(false); }
  };

  const savings = (offer: PolicyOffer) => Number(offer.originalPremium) - Number(offer.adjustedPremium);

  return <>
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
      <ScreenHeading kicker="YOUR POLICY APPLICATIONS" title="Policy offers" subtitle="Review premium adjustments from your underwriter." />
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingBlock /> : offers.length ? offers.map((offer) => <View key={offer.id} style={styles.card}>
        <View style={styles.top}><View style={styles.offerInfo}><Text style={styles.policyNumber}>{offer.policyNumber}</Text><Text style={styles.product}>{offer.type} insurance · {formatMoney(offer.coverageAmount)} cover</Text></View><Text style={styles.pending}>OFFER PENDING</Text></View>
        <View style={styles.comparison}><View style={styles.premiumBlock}><Text style={styles.label}>ORIGINAL REQUEST</Text><Text style={styles.original}>{formatMoney(offer.originalPremium)}</Text></View><Text style={styles.arrow}>›</Text><View style={styles.premiumBlock}><Text style={styles.label}>ADJUSTED OFFER</Text><Text style={styles.adjusted}>{formatMoney(offer.adjustedPremium)}</Text></View></View>
        <Text style={[styles.change, savings(offer) >= 0 ? styles.saving : styles.increase]}>{savings(offer) >= 0 ? `Premium reduced by ${formatMoney(savings(offer))}` : `Premium increased by ${formatMoney(Math.abs(savings(offer)))}`}</Text>
        {offer.underwriterNotes ? <View style={styles.message}><Text style={styles.messageLabel}>MESSAGE FROM UNDERWRITER</Text><Text style={styles.messageBody}>{offer.underwriterNotes}</Text></View> : null}
        <Text style={styles.date}>Offer sent {new Date(offer.updatedAt).toLocaleDateString()}</Text>
        <CustomerButton title="Review offer" onPress={() => setSelected(offer)} />
      </View>) : <EmptyState title="No pending offers" detail="Your underwriter's premium adjustments will appear here for review." />}
    </ScrollView>
    <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalTop}><View><Text style={styles.modalTitle}>Review policy offer</Text><Text style={styles.product}>{selected?.policyNumber}</Text></View><Pressable onPress={() => setSelected(null)}><Text style={styles.close}>Close</Text></Pressable></View>
        <Text style={styles.modalPrompt}>Choose whether to accept the underwriter's adjusted premium.</Text>
        {selected ? <View style={styles.comparison}><View style={styles.premiumBlock}><Text style={styles.label}>YOUR REQUEST</Text><Text style={styles.original}>{formatMoney(selected.originalPremium)}</Text></View><Text style={styles.arrow}>›</Text><View style={styles.premiumBlock}><Text style={styles.label}>OFFER</Text><Text style={styles.adjusted}>{formatMoney(selected.adjustedPremium)}</Text></View></View> : null}
        {selected?.underwriterNotes ? <View style={styles.message}><Text style={styles.messageLabel}>UNDERWRITER NOTE</Text><Text style={styles.messageBody}>{selected.underwriterNotes}</Text></View> : null}
        <Field label="Note (optional)" value={notes} onChangeText={setNotes} placeholder="Add a note for your underwriter" multiline />
        <CustomerButton title="Accept offer" onPress={() => setDecision('ACCEPT')} disabled={submitting} />
        <CustomerButton title="Decline offer" onPress={() => setDecision('REJECT')} secondary disabled={submitting} />
      </ScrollView>
    </Modal>
    <Modal visible={!!decision} transparent animationType="fade" onRequestClose={() => setDecision(null)}>
      <View style={styles.confirmBackdrop}><View style={styles.confirmBox}><Text style={styles.confirmTitle}>{decision === 'ACCEPT' ? 'Accept this offer?' : 'Decline this offer?'}</Text><Text style={styles.confirmText}>{decision === 'ACCEPT' ? 'The policy will move to final review.' : 'The offer will be declined and the application closed.'}</Text><CustomerButton title={submitting ? 'Submitting…' : `Confirm ${decision === 'ACCEPT' ? 'acceptance' : 'decline'}`} onPress={() => void submitDecision()} disabled={submitting} /><CustomerButton title="Go back" onPress={() => setDecision(null)} secondary disabled={submitting} /></View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 15, marginTop: 12 }, top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }, offerInfo: { flex: 1 }, policyNumber: { color: palette.ink, fontSize: 15, fontWeight: '800' }, product: { color: palette.muted, fontSize: 11, marginTop: 4 }, pending: { color: '#854D0E', backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, fontSize: 8, fontWeight: '800' }, comparison: { flexDirection: 'row', alignItems: 'center', marginTop: 17, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 9, gap: 8 }, premiumBlock: { flex: 1 }, label: { color: palette.muted, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }, original: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', textDecorationLine: 'line-through', marginTop: 6 }, adjusted: { color: palette.green, fontSize: 15, fontWeight: '800', marginTop: 6 }, arrow: { color: palette.green, fontSize: 25, fontWeight: '800' }, change: { fontSize: 11, fontWeight: '700', marginTop: 9 }, saving: { color: palette.green }, increase: { color: palette.coral }, message: { backgroundColor: '#F5F7FA', padding: 12, borderRadius: 8, marginTop: 12 }, messageLabel: { color: palette.ink, fontSize: 9, fontWeight: '800' }, messageBody: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }, date: { color: palette.muted, fontSize: 10, marginTop: 11 }, modal: { flex: 1, backgroundColor: palette.paper }, modalContent: { padding: 22, paddingBottom: 35, maxWidth: 600, width: '100%', alignSelf: 'center' }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { color: palette.ink, fontSize: 21, fontWeight: '800' }, close: { color: palette.green, fontSize: 13, fontWeight: '800' }, modalPrompt: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }, confirmBackdrop: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: 'rgba(17,24,39,0.48)' }, confirmBox: { backgroundColor: 'white', padding: 20, borderRadius: 12 }, confirmTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' }, confirmText: { color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 8 } });