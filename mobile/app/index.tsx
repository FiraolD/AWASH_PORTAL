import { Redirect, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useCustomerAuth } from '@/components/CustomerAuthProvider';
import { palette } from '@/components/CustomerScreens';

export default function IndexRoute() {
  const { customer, loading } = useCustomerAuth();
  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={palette.green} /></View>;
  }
  return <Redirect href={(customer ? '/(tabs)' : '/login') as Href} />;
}

const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper } });