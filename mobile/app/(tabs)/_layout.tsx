import { Link, Redirect, Tabs, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { palette } from '@/components/CustomerScreens';

export default function CustomerTabsLayout() {
  const { customer, loading } = useCustomerAuth();
  if (loading) return <View style={styles.loading}><ActivityIndicator color={palette.green} /></View>;
  if (!customer) return <Redirect href={'/login' as Href} />;

  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: palette.paper },
      headerShadowVisible: false,
      headerTitleStyle: { color: palette.ink, fontWeight: '800' },
      headerRight: () => <Link href={'/(tabs)/profile' as Href} asChild><Pressable accessibilityLabel="Open profile" style={styles.profileButton}><Text style={styles.profileGlyph}>●</Text></Pressable></Link>,
      tabBarActiveTintColor: palette.green,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { height: 62, paddingTop: 7, paddingBottom: 8, borderTopColor: palette.line, backgroundColor: 'white' },
      tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Overview', tabBarLabel: 'Home', tabBarIcon: ({ color }) => <TabGlyph glyph="⌂" color={String(color)} /> }} />
      <Tabs.Screen name="policies" options={{ title: 'My policies', tabBarIcon: ({ color }) => <TabGlyph glyph="▤" color={String(color)} /> }} />
      <Tabs.Screen name="claims" options={{ title: 'My claims', tabBarIcon: ({ color }) => <TabGlyph glyph="◇" color={String(color)} /> }} />
      <Tabs.Screen name="payments" options={{ title: 'My payments', tabBarIcon: ({ color }) => <TabGlyph glyph="$" color={String(color)} /> }} />
      <Tabs.Screen name="support" options={{ title: 'Support', tabBarIcon: ({ color }) => <TabGlyph glyph="?" color={String(color)} /> }} />
      <Tabs.Screen name="profile" options={{ href: null, title: 'My profile' }} />
      <Tabs.Screen name="offers" options={{ href: null, title: 'Policy offers' }} />
    </Tabs>
  );
}

function TabGlyph({ glyph, color }: { glyph: string; color: string }) {
  return <View style={[styles.glyph, { borderColor: color }]}><Text style={{ color, fontSize: 17, fontWeight: '800', lineHeight: 19 }}>{glyph}</Text></View>;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper }, glyph: { width: 27, height: 27, borderWidth: 1.5, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, profileButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#E8EEF7', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, profileGlyph: { color: palette.green, fontSize: 16 } });
