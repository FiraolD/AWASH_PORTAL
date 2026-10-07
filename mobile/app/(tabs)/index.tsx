import { Link, router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { EmptyState, ErrorNotice, formatMoney, palette, ScreenHeading, StatusPill, type Claim, type Policy, type PolicyOffer, type Ticket } from '@/components/CustomerScreens';

export default function CustomerHomeScreen() {
  const { customer, token } = useCustomerAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [offers, setOffers] = useState<PolicyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const [policyData, claimData, ticketData, offerData] = await Promise.all([
        customerRequest<Policy[]>('/policies/my-policies', token),
        customerRequest<Claim[]>('/claims', token),
        customerRequest<Ticket[]>('/support/tickets', token),
        customerRequest<PolicyOffer[]>('/policies/pending-decision', token),
      ]);
      setPolicies(policyData);
      setClaims(claimData);
      setTickets(ticketData);
      setOffers(offerData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your overview.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const activeCount = policies.filter((policy) => policy.status?.toUpperCase() === 'ACTIVE').length;
  const pendingClaims = claims.filter((claim) => ['SUBMITTED', 'UNDER_REVIEW', 'PENDING'].includes(claim.status?.toUpperCase())).length;
  const openTickets = tickets.filter((ticket) => ['OPEN', 'IN_PROGRESS'].includes(ticket.status?.toUpperCase())).length;
  const pendingOffers = offers.length;
  const newestPolicies = policies.slice(0, 3);
  const newestClaims = claims.slice(0, 3);
  const newestTickets = tickets.slice(0, 2);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
      <View style={styles.topline}><Text style={styles.brand}>AWASH <Text style={styles.brandAccent}>INSURANCE</Text></Text><Text style={styles.date}>{new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text></View>
      <ScreenHeading kicker="CUSTOMER DASHBOARD" title={`Welcome back, ${customer?.firstName || 'Customer'}!`} subtitle="Here's an overview of your insurance portfolio." />
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
      {loading ? <ActivityIndicator color={palette.green} style={styles.loader} /> : <>
        {pendingOffers > 0 ? <Pressable onPress={() => router.push('/(tabs)/offers' as Href)} style={styles.offerBanner}><Text style={styles.offerTitle}>{pendingOffers} policy offer{pendingOffers === 1 ? '' : 's'} awaiting your response</Text><Text style={styles.offerAction}>Review offers  ›</Text></Pressable> : null}
        <View style={styles.summary}>
          <Pressable onPress={() => router.push('/(tabs)/policies' as Href)} style={[styles.metric, styles.metricBlue]}><Text style={styles.metricLabel}>ACTIVE POLICIES</Text><Text style={styles.metricValue}>{activeCount}</Text><Text style={styles.metricFoot}>ETB {policies.reduce((sum, policy) => sum + (Number(policy.premium) || 0), 0).toLocaleString()} total premium</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/claims' as Href)} style={[styles.metric, styles.metricAmber]}><Text style={styles.metricLabel}>PENDING CLAIMS</Text><Text style={styles.metricValue}>{pendingClaims}</Text><Text style={styles.metricFoot}>of {claims.length} claims</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/support' as Href)} style={[styles.metric, styles.metricSlate]}><Text style={styles.metricLabel}>OPEN TICKETS</Text><Text style={styles.metricValue}>{openTickets}</Text><Text style={styles.metricFoot}>of {tickets.length} requests</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/offers' as Href)} style={[styles.metric, styles.metricRed]}><Text style={styles.metricLabel}>POLICY OFFERS</Text><Text style={styles.metricValue}>{pendingOffers}</Text><Text style={styles.metricFoot}>{pendingOffers ? 'Action required' : 'No action required'}</Text></Pressable>
        </View>
        <View style={styles.sectionTop}><Text style={styles.sectionTitle}>Recent policies</Text><Link href={'/(tabs)/policies' as Href} style={styles.seeAll}>See all</Link></View>
        {newestPolicies.length ? newestPolicies.map((policy) => <Pressable key={policy.id} onPress={() => router.push('/(tabs)/policies' as Href)} style={styles.policyRow}><View style={styles.policyIcon}><Text style={styles.policyIconText}>A</Text></View><View style={styles.policyInfo}><Text style={styles.policyType}>{policy.type || 'Insurance'} cover</Text><Text style={styles.policyNumber}>{policy.policyNumber || 'Policy application'}</Text></View><StatusPill status={policy.status} /></Pressable>) : <EmptyState title="No policies yet" detail="Your policies will appear here once your application is submitted." />}
        <Text style={[styles.sectionTitle, styles.actionsTitle]}>Quick actions</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push('/(tabs)/claims' as Href)} style={styles.action}><Text style={styles.actionGlyph}>＋</Text><Text style={styles.actionText}>File a claim</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/support' as Href)} style={styles.action}><Text style={styles.actionGlyph}>↗</Text><Text style={styles.actionText}>Get support</Text></Pressable>
          <Pressable onPress={() => router.push('/(tabs)/policies' as Href)} style={styles.action}><Text style={styles.actionGlyph}>▤</Text><Text style={styles.actionText}>View cover</Text></Pressable>
        </View>
        <View style={styles.sectionTop}><Text style={styles.sectionTitle}>Recent claims</Text><Link href={'/(tabs)/claims' as Href} style={styles.seeAll}>View all</Link></View>
        {newestClaims.length ? newestClaims.map((claim) => <View key={claim.id} style={styles.activityRow}><View style={styles.activityInfo}><Text style={styles.activityTitle}>{claim.claimNumber}</Text><Text style={styles.activityDetail}>{claim.incidentDate ? new Date(claim.incidentDate).toLocaleDateString() : 'Date unavailable'} · {claim.policyNumber || claim.natureOfLoss || 'Claim'}</Text></View><StatusPill status={claim.status} /></View>) : <EmptyState title="No claims filed" detail="Claims you submit will be shown here." />}
        <View style={styles.sectionTop}><Text style={styles.sectionTitle}>Support requests</Text><Link href={'/(tabs)/support' as Href} style={styles.seeAll}>View all</Link></View>
        {newestTickets.length ? newestTickets.map((ticket) => <View key={ticket.id} style={styles.activityRow}><View style={styles.activityInfo}><Text style={styles.activityTitle}>{ticket.subject}</Text><Text style={styles.activityDetail}>#{ticket.ticketNumber} · {ticket.responseCount || 0} replies</Text></View><StatusPill status={ticket.status} /></View>) : <EmptyState title="No open requests" detail="Contact support whenever you need help." />}
        <View style={styles.coverageBand}><Text style={styles.coverageEyebrow}>YOUR TOTAL COVER</Text><Text style={styles.coverageText}>{formatMoney(policies.reduce((sum, policy) => sum + (Number(policy.coverageAmount) || 0), 0))}</Text><Text style={styles.coverageCaption}>insured value across all your policies</Text></View>
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper }, content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' },
  topline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 27 }, brand: { color: palette.ink, fontSize: 13, fontWeight: '900', letterSpacing: 1.1 }, brandAccent: { color: palette.green, fontWeight: '700' }, date: { color: palette.muted, fontSize: 12, fontWeight: '600' },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 18 }, metric: { width: '48%', flexGrow: 1, minHeight: 112, padding: 14, borderRadius: 10, justifyContent: 'space-between' }, metricBlue: { backgroundColor: palette.green }, metricAmber: { backgroundColor: '#B7791F' }, metricSlate: { backgroundColor: '#475569' }, metricRed: { backgroundColor: palette.coral }, metricLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }, metricValue: { color: 'white', fontSize: 29, fontWeight: '800' }, metricFoot: { color: 'rgba(255,255,255,0.82)', fontSize: 10 },
  loader: { marginTop: 50 }, sectionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5, marginBottom: 11 }, sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: '800' }, seeAll: { color: palette.green, fontSize: 12, fontWeight: '800' },
  policyRow: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 13, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 11 }, policyIcon: { width: 40, height: 40, backgroundColor: palette.paleGreen, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, policyIconText: { fontSize: 17, fontWeight: '900', color: palette.green }, policyInfo: { flex: 1 }, policyType: { color: palette.ink, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }, policyNumber: { color: palette.muted, fontSize: 11, marginTop: 4 },
  actionsTitle: { marginTop: 21, marginBottom: 11 }, actions: { flexDirection: 'row', gap: 9 }, action: { flex: 1, minHeight: 84, backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 12, justifyContent: 'space-between' }, actionGlyph: { color: palette.coral, fontSize: 22, fontWeight: '700' }, actionText: { color: palette.ink, fontSize: 11, fontWeight: '700' },
  offerBanner: { borderRadius: 10, padding: 14, marginTop: 14, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A' }, offerTitle: { color: '#854D0E', fontSize: 13, fontWeight: '800' }, offerAction: { color: palette.green, fontSize: 11, fontWeight: '800', marginTop: 6 },
  activityRow: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 9, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, activityInfo: { flex: 1 }, activityTitle: { color: palette.ink, fontSize: 12, fontWeight: '700' }, activityDetail: { color: palette.muted, fontSize: 10, marginTop: 4 },
  coverageBand: { marginTop: 17, backgroundColor: palette.ink, borderRadius: 13, padding: 18 }, coverageEyebrow: { color: '#A8C8B4', fontSize: 9, fontWeight: '800', letterSpacing: 1 }, coverageText: { color: 'white', fontSize: 25, fontWeight: '800', marginTop: 8 }, coverageCaption: { color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4 },
});
