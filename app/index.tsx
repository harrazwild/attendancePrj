import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[ROOT] Index useEffect triggered. Loading:', loading, 'User:', user ? user.id : 'null');
    if (!loading) {
      if (user) {
        console.log('[ROOT] User authenticated, redirecting based on role:', user.role);

        if (!user.role) {
          console.log('[ROOT] User authenticated but role is missing. Waiting.');
          return;
        }

        // User is authenticated, redirect based on role
        if (user.role === 'student') {
          console.log('[ROOT] Redirecting to /student-qr');
          router.replace('/student-qr' as any);
        } else if (user.role === 'lecturer') {
          console.log('[ROOT] Redirecting to /(tabs)/(home)');
          router.replace('/(tabs)/(home)' as any);
        } else {
          console.log('[ROOT] Unknown role:', user.role);
          router.replace('/(tabs)/(home)' as any);
        }
      } else {
        console.log('[ROOT] User not authenticated, redirecting to /auth');
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
