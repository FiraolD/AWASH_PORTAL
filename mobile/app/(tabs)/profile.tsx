import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth, type Customer } from '@/components/CustomerAuthProvider';
import { customerRequest } from '@/components/customerApi';
import { CustomerButton, ErrorNotice, Field, LoadingBlock, palette, ScreenHeading } from '@/components/CustomerScreens';

export default function ProfileScreen() {
  const { customer, token, logout } = useCustomerAuth();
  const [profile, setProfile] = useState<Customer | null>(customer);
  const [firstName, setFirstName] = useState(customer?.firstName || '');
  const [lastName, setLastName] = useState(customer?.lastName || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const result = await customerRequest<Customer>('/profile', token);
      setProfile(result); setFirstName(result.firstName || ''); setLastName(result.lastName || ''); setPhone(result.phone || ''); setAddress(result.address || '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load your profile.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void loadProfile(); }, [token]);

  const save = async () => {
    if (!token || !firstName.trim() || !lastName.trim()) { Alert.alert('Name required', 'Enter your first and last name.'); return; }
    setSaving(true);
    try {
      const result = await customerRequest<{ profile: Customer }>('/profile', token, { method: 'PUT', body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), address: address.trim() }) });
      setProfile(result.profile);
      Alert.alert('Profile updated', 'Your details have been saved.');
    } catch (reason) { Alert.alert('Unable to save', reason instanceof Error ? reason.message : 'Please try again.'); }
    finally { setSaving(false); }
  };

  return <ScrollView style={styles.page} contentContainerStyle={styles.content}>
    <ScreenHeading kicker="YOUR ACCOUNT" title="My profile" subtitle="Keep your contact details up to date." />
    {error ? <ErrorNotice message={error} onRetry={() => void loadProfile()} /> : null}
    {loading ? <LoadingBlock /> : <>
      <View style={styles.identity}><View style={styles.avatar}><Text style={styles.initials}>{`${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()}</Text></View><View style={styles.identityInfo}><Text style={styles.name}>{profile?.firstName} {profile?.lastName}</Text><Text style={styles.email}>{profile?.email}</Text><Text style={styles.role}>CUSTOMER ACCOUNT</Text></View></View>
      <View style={styles.form}><Field label="First name" value={firstName} onChangeText={setFirstName} placeholder="First name" /><Field label="Last name" value={lastName} onChangeText={setLastName} placeholder="Last name" /><Field label="Phone" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="numeric" /><Field label="Address" value={address} onChangeText={setAddress} placeholder="Your address" multiline /><CustomerButton title={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} disabled={saving} /></View>
      <View style={styles.security}><Text style={styles.securityTitle}>Account security</Text><Text style={styles.securityText}>Your signed-in session is stored securely on this device.</Text><CustomerButton title="Sign out" onPress={() => void logout()} secondary /></View>
    </>}
  </ScrollView>;
}

const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: palette.paper }, content: { padding: 20, paddingBottom: 35, maxWidth: 640, width: '100%', alignSelf: 'center' }, identity: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 15, marginTop: 10 }, avatar: { width: 54, height: 54, borderRadius: 16, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' }, initials: { color: 'white', fontSize: 18, fontWeight: '800' }, identityInfo: { flex: 1 }, name: { color: palette.ink, fontSize: 15, fontWeight: '800' }, email: { color: palette.muted, fontSize: 11, marginTop: 3 }, role: { color: palette.coral, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 7 }, form: { backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 12, padding: 15, marginTop: 12 }, security: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderTopColor: palette.line }, securityTitle: { color: palette.ink, fontSize: 15, fontWeight: '800' }, securityText: { color: palette.muted, fontSize: 11, marginTop: 5 } });