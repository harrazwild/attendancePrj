import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthWrapper() {
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
  return null;
}
