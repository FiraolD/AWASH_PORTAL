import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { CustomerButton, EmptyState, ErrorNotice, Field, LoadingBlock, OptionPicker, palette, ScreenHeading, StatusPill, type Ticket } from '@/components/CustomerScreens';

interface TicketResponse { id: string; message: string; isFromAdmin: boolean; createdAt: string; userName: string }
interface TicketDetails extends Ticket { responses: TicketResponse[] }

export default function SupportScreen() {
  const { token, customer } = useCustomerAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<TicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('medium');
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async (refresh = false) => {
    if (!token) return;
    refresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try { setTickets(await customerRequest<Ticket[]>('/support/tickets', token)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load support tickets.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { void load(); }, [token]);

  const openTicket = async (ticket: Ticket) => {
    if (!token) return;
    try { setSelected(await customerRequest<TicketDetails>(`/support/tickets/${ticket.id}`, token)); }
    catch (reason) { Alert.alert('Unable to open ticket', reason instanceof Error ? reason.message : 'Please try again.'); }
  };

  const createTicket = async () => {
    if (!token || !subject.trim() || !message.trim()) { Alert.alert('Complete the form', 'Add a subject and describe how we can help.'); return; }
    setSubmitting(true);
    try {
      await customerRequest('/support/tickets', token, { method: 'POST', body: JSON.stringify({ subject: subject.trim(), description: message.trim(), priority }) });
      setSubject(''); setMessage(''); setPriority('medium'); setNewOpen(false);
      await load(true);
      Alert.alert('Ticket created', 'Your message has been sent to our support team.');
    } catch (reason) { Alert.alert('Unable to create ticket', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  const sendReply = async () => {
    if (!token || !selected || !reply.trim()) return;
    setSubmitting(true);
    try {
      await customerRequest(`/support/tickets/${selected.id}/responses`, token, { method: 'POST', body: JSON.stringify({ message: reply.trim() }) });
      setReply('');
      await openTicket(selected);
      await load(true);
    } catch (reason) { Alert.alert('Unable to send reply', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setSubmitting(false); }
  };

  return <>
    <ScrollView style={styles.page} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={palette.green} />}>
      <View style={styles.headingRow}><ScreenHeading kicker="WE’RE HERE TO HELP" title="Support" subtitle="Send a message and keep track of your requests." /><Pressable onPress={() => setNewOpen(true)} style={styles.newButton}><Text style={styles.newText}>＋  New ticket</Text></Pressable></View>
      {error ? <ErrorNotice message={error} onRetry={() => void load()} /> : null}
      {loading ? <LoadingBlock /> : tickets.length ? tickets.map((ticket) => <Pressable key={ticket.id} onPress={() => void openTicket(ticket)} style={styles.card}>
        <View style={styles.ticketTop}><View style={styles.ticketInfo}><Text style={styles.subject}>{ticket.subject}</Text><Text style={styles.number}>#{ticket.ticketNumber}</Text></View><StatusPill status={ticket.status} /></View>
        <Text style={styles.preview} numberOfLines={2}>{ticket.message}</Text>
        <View style={styles.ticketBottom}><Text style={styles.meta}>{new Date(ticket.createdAt).toLocaleDateString()}</Text><Text style={styles.meta}>{ticket.responseCount || 0} replies</Text><Text style={styles.detailLink}>Open →</Text></View>
      </Pressable>) : <EmptyState title="No support requests" detail="Create a ticket and our team will get back to you." />}
    </ScrollView>
    <Modal visible={newOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNewOpen(false)}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalTop}><Text style={styles.modalTitle}>New support request</Text><Pressable onPress={() => setNewOpen(false)}><Text style={styles.detailLink}>Close</Text></Pressable></View>
        <Field label="Subject" value={subject} onChangeText={setSubject} placeholder="What do you need help with?" />
        <OptionPicker label="Priority" value={priority} options={[{ label: 'Low', value: 'low' }, { label: 'Normal', value: 'medium' }, { label: 'High', value: 'high' }]} onChange={setPriority} />
        <Field label="Message" value={message} onChangeText={setMessage} placeholder="Describe your request" multiline />
        <CustomerButton title={submitting ? 'Sending…' : 'Send request'} onPress={() => void createTicket()} disabled={submitting} />
        <CustomerButton title="Cancel" onPress={() => setNewOpen(false)} secondary />
      </ScrollView>
    </Modal>
    <Modal visible={!!selected} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelected(null)}>
      <ScrollView style={styles.modal} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
        <View style={styles.modalTop}><View><Text style={styles.modalTitle}>{selected?.subject}</Text><Text style={styles.number}>#{selected?.ticketNumber}</Text></View><Pressable onPress={() => setSelected(null)}><Text style={styles.detailLink}>Close</Text></Pressable></View>
        <View style={styles.statusRow}><StatusPill status={selected?.status} /></View>
        {selected?.responses?.map((item) => {
          const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
          const fromStaff = item.userName !== customerName;
          return <View key={item.id} style={[styles.replyCard, fromStaff ? styles.adminReply : styles.customerReply]}><View style={styles.replyTop}><Text style={styles.replyName}>{item.userName}</Text><Text style={styles.meta}>{new Date(item.createdAt).toLocaleDateString()}</Text></View><Text style={styles.replyMessage}>{item.message}</Text></View>;
        })}
        <Field label="Reply" value={reply} onChangeText={setReply} placeholder="Write a reply" multiline />
        <CustomerButton title={submitting ? 'Sending…' : 'Send reply'} onPress={() => void sendReply()} disabled={submitting || !reply.trim()} />
      </ScrollView>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 30, maxWidth: 640, width: '100%', alignSelf: 'center' }, headingRow: { gap: 8 }, newButton: { alignSelf: 'flex-start', backgroundColor: palette.green, minHeight: 39, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 8 }, newText: { color: 'white', fontSize: 12, fontWeight: '800' }, card: { backgroundColor: 'white', borderColor: palette.line, borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 10 }, ticketTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, ticketInfo: { flex: 1 }, subject: { color: palette.ink, fontSize: 14, fontWeight: '800' }, number: { color: palette.muted, fontSize: 10, marginTop: 4 }, preview: { color: palette.muted, fontSize: 11, lineHeight: 16, marginTop: 10 }, ticketBottom: { flexDirection: 'row', gap: 14, marginTop: 12, alignItems: 'center' }, meta: { color: palette.muted, fontSize: 10 }, detailLink: { color: palette.green, fontSize: 11, fontWeight: '800' }, modal: { flex: 1, backgroundColor: palette.paper }, modalContent: { padding: 22, paddingBottom: 35, maxWidth: 600, width: '100%', alignSelf: 'center' }, modalTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }, modalTitle: { color: palette.ink, fontSize: 20, fontWeight: '800', flexShrink: 1 }, statusRow: { marginVertical: 16 }, replyCard: { padding: 12, borderRadius: 9, marginBottom: 9 }, adminReply: { backgroundColor: palette.paleGreen, marginRight: 16 }, customerReply: { backgroundColor: 'white', marginLeft: 16, borderColor: palette.line, borderWidth: 1 }, replyTop: { flexDirection: 'row', justifyContent: 'space-between' }, replyName: { color: palette.green, fontSize: 11, fontWeight: '800' }, replyMessage: { color: palette.ink, fontSize: 12, lineHeight: 18, marginTop: 7 } });