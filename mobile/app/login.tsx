import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { palette } from '@/components/CustomerScreens';

export default function LoginScreen() {
  const { customer, loading, login } = useCustomerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (loading) return <View style={styles.center}><ActivityIndicator color={palette.green} /></View>;
  if (customer) return <Redirect href="/(tabs)" />;

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}><Text style={styles.brandMark}>A</Text><Text style={styles.brandName}>AWASH</Text><Text style={styles.brandSub}>INSURANCE</Text></View>
      <View style={styles.form}>
        <Text style={styles.eyebrow}>CUSTOMER PORTAL</Text>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to manage your cover.</Text>
        <Text style={styles.label}>Email address</Text>
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={palette.muted} style={styles.input} />
        <Text style={styles.label}>Password</Text>
        <TextInput secureTextEntry autoComplete="password" value={password} onChangeText={setPassword} onSubmitEditing={submit} placeholder="Your password" placeholderTextColor={palette.muted} style={styles.input} />
        {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        <Pressable accessibilityRole="button" onPress={submit} disabled={submitting || !email || !password} style={({ pressed }) => [styles.button, (submitting || !email || !password) && styles.disabled, pressed && styles.pressed]}>
          {submitting ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
      <Text style={styles.footer}>AWASH INSURANCE COMPANY</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: palette.paper, justifyContent: 'center', padding: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper },
  brand: { alignItems: 'center', marginBottom: 42 }, brandMark: { width: 54, height: 54, lineHeight: 54, textAlign: 'center', color: 'white', backgroundColor: palette.green, fontSize: 28, fontWeight: '800', borderRadius: 16, overflow: 'hidden' },
  brandName: { color: palette.ink, fontSize: 20, fontWeight: '900', marginTop: 12, letterSpacing: 2 }, brandSub: { color: palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginTop: 2 },
  form: { width: '100%', maxWidth: 440, alignSelf: 'center' }, eyebrow: { color: palette.coral, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: palette.ink, fontSize: 30, fontWeight: '800', marginTop: 8 }, subtitle: { color: palette.muted, fontSize: 15, marginTop: 6, marginBottom: 28 },
  label: { color: palette.ink, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 16 }, input: { minHeight: 52, borderWidth: 1, borderColor: palette.line, borderRadius: 10, paddingHorizontal: 14, color: palette.ink, backgroundColor: 'white', fontSize: 16 },
  error: { color: palette.coral, fontSize: 13, marginTop: 14 }, button: { minHeight: 54, borderRadius: 10, backgroundColor: palette.green, justifyContent: 'center', alignItems: 'center', marginTop: 26 }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82 }, buttonText: { color: 'white', fontSize: 16, fontWeight: '800' }, footer: { position: 'absolute', bottom: 28, alignSelf: 'center', color: palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});