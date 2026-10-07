import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const palette = { paper: '#F5F7FA', ink: '#111827', green: '#1A3E6F', paleGreen: '#EFF6FF', coral: '#E31E24', line: '#E2E8F0', muted: '#6B7280', white: '#FFFFFF' };

export interface Policy {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  premium: number;
  status: string;
  effectiveDate?: string;
  expirationDate?: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  policyType?: string;
  status: string;
  incidentDate?: string;
  submittedDate?: string;
  estimatedAmount?: number;
  natureOfLoss?: string;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  responseCount: number;
}

export interface PolicyOffer {
  id: string;
  policyNumber: string;
  type: string;
  coverageAmount: number;
  originalPremium: number;
  adjustedPremium: number;
  underwriterNotes?: string;
  status: string;
  updatedAt: string;
}

export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value) || 0;
  return `ETB ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function ScreenHeading({ kicker, title, subtitle }: { kicker: string; title: string; subtitle: string }) {
  return <View style={shared.heading}><Text style={shared.kicker}>{kicker}</Text><Text style={shared.title}>{title}</Text><Text style={shared.subtitle}>{subtitle}</Text></View>;
}

export function StatusPill({ status }: { status?: string }) {
  const normalized = (status || 'UNKNOWN').replaceAll('_', ' ').toLowerCase();
  const good = ['active', 'approved', 'paid', 'resolved', 'closed'].includes(normalized);
  const attention = ['pending', 'submitted', 'under review', 'in progress', 'awaiting customer approval'].includes(normalized);
  const color = good ? palette.green : attention ? '#9A6614' : palette.muted;
  const bg = good ? palette.paleGreen : attention ? '#F8EED8' : '#ECEFEC';
  return <Text style={[shared.pill, { color, backgroundColor: bg }]}>{normalized}</Text>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <View style={shared.empty}><Text style={shared.emptyTitle}>{title}</Text><Text style={shared.emptyDetail}>{detail}</Text></View>;
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <View style={shared.errorBox}><Text style={shared.errorText}>{message}</Text><Pressable onPress={onRetry}><Text style={shared.retry}>Try again</Text></Pressable></View>;
}

export function LoadingBlock() {
  return <ActivityIndicator color={palette.green} style={{ marginTop: 44 }} />;
}

export function CustomerButton({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [shared.button, secondary && shared.secondaryButton, disabled && shared.disabled, pressed && shared.pressed]}><Text style={[shared.buttonText, secondary && shared.secondaryText]}>{title}</Text></Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType, secureTextEntry = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: 'default' | 'numeric' | 'email-address'; secureTextEntry?: boolean }) {
  const [focused, setFocused] = useState(false);
  return <View style={shared.field}><Text style={shared.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={palette.muted} multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={[shared.input, multiline && shared.multiline, focused && shared.focused]} /></View>;
}

export function OptionPicker({ label, value, options, onChange }: { label: string; value: string; options: { label: string; value: string }[]; onChange: (value: string) => void }) {
  return <View style={shared.field}><Text style={shared.fieldLabel}>{label}</Text><View style={shared.options}>{options.map((option) => <Pressable key={option.value} onPress={() => onChange(option.value)} style={[shared.option, value === option.value && shared.selectedOption]}><Text style={[shared.optionText, value === option.value && shared.selectedOptionText]}>{option.label}</Text></Pressable>)}</View></View>;
}

export function ProfileTopAction({ title, onPress }: { title: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={shared.topAction}><Text style={shared.topActionText}>{title}</Text></Pressable>;
}

export function goToHome() { router.replace('/(tabs)'); }

const shared = StyleSheet.create({
  heading: { marginBottom: 8 }, kicker: { color: palette.coral, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 }, title: { color: palette.ink, fontSize: 26, fontWeight: '800', marginTop: 6 }, subtitle: { color: palette.muted, fontSize: 13, lineHeight: 19, marginTop: 5 },
  pill: { overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6, fontSize: 9, fontWeight: '800', textTransform: 'capitalize', maxWidth: 125 },
  empty: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 18, backgroundColor: 'white', borderWidth: 1, borderColor: palette.line, borderRadius: 11, marginTop: 10 }, emptyTitle: { color: palette.ink, fontWeight: '800', fontSize: 14 }, emptyDetail: { color: palette.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5 },
  errorBox: { padding: 13, backgroundColor: '#FBEAE6', borderRadius: 9, marginVertical: 8 }, errorText: { color: '#9B3428', fontSize: 12 }, retry: { color: palette.green, fontSize: 12, fontWeight: '800', marginTop: 7 },
  button: { minHeight: 49, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.green, borderRadius: 9, marginTop: 12 }, secondaryButton: { backgroundColor: 'white', borderWidth: 1, borderColor: palette.line }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.78 }, buttonText: { color: 'white', fontSize: 14, fontWeight: '800' }, secondaryText: { color: palette.ink },
  field: { marginTop: 15 }, fieldLabel: { color: palette.ink, fontSize: 12, fontWeight: '700', marginBottom: 7 }, input: { borderWidth: 1, borderColor: palette.line, borderRadius: 9, backgroundColor: 'white', minHeight: 48, paddingHorizontal: 12, color: palette.ink, fontSize: 14 }, multiline: { minHeight: 105, paddingTop: 12, textAlignVertical: 'top' }, focused: { borderColor: palette.green },
  options: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }, option: { borderWidth: 1, borderColor: palette.line, backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8 }, selectedOption: { borderColor: palette.green, backgroundColor: palette.paleGreen }, optionText: { color: palette.muted, fontWeight: '700', fontSize: 12 }, selectedOptionText: { color: palette.green },
  topAction: { backgroundColor: '#FBEAE6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }, topActionText: { color: palette.coral, fontSize: 12, fontWeight: '800' },
});