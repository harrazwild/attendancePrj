import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // User is authenticated, redirect based on role
        if (user.role === 'student') {
          router.replace('/student-qr' as any);
        } else {
          router.replace('/(tabs)/(home)' as any);
        }
      } else {
        // User is not authenticated, redirect to auth
        router.replace('/auth');
      }
    }
  }, [user, loading, router]);

  // Show loading screen while checking auth state
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
