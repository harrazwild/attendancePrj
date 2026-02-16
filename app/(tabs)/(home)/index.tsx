
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function DashboardScreen() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState({
    ongoingSessions: 0,
    todayScans: 0,
    lecturerName: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('DashboardScreen mounted/updated. User:', user ? user.id : 'null', 'AuthLoading:', authLoading);
    if (!authLoading && !user) {
      console.log('No user found, redirecting to auth');
      router.replace('/auth');
      return;
    }

    // TODO: Backend Integration - GET /api/lecturer/dashboard to get { ongoingSessions, todayScans, lecturerName }
    // For now, use mock data
    const fetchDashboard = async () => {
      console.log('fetchDashboard called');
      setLoading(true);
      try {
        console.log('Fetching dashboard data...');

        // Fetch total students count
        const { count, error } = await supabase
          .from('user')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'student');

        if (error) {
          console.error('Error fetching student count:', error);
        }

        // Mock data for other fields, but use real student count
        setDashboardData({
          ongoingSessions: 2,
          todayScans: count || 0,
          lecturerName: user?.name || 'Lecturer',
        });
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user, authLoading, router]);

  const handleSignOut = async () => {
    console.log('User tapped Sign Out button');
    try {
      await signOut();
      router.replace('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const greetingText = `Hello, ${dashboardData.lecturerName}`;
  const ongoingSessionsText = `${dashboardData.ongoingSessions}`;
  const todayScansText = `${dashboardData.todayScans}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greetingText}</Text>
            <Text style={styles.subtitle}>Attendance Dashboard</Text>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={24}
              color={colors.error}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <IconSymbol
                ios_icon_name="clock.fill"
                android_material_icon_name="schedule"
                size={32}
                color={colors.primary}
              />
            </View>
            <Text style={styles.statValue}>{ongoingSessionsText}</Text>
            <Text style={styles.statLabel}>Ongoing Sessions</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <IconSymbol
                ios_icon_name="person.2.fill"
                android_material_icon_name="group"
                size={32}
                color={colors.secondary}
              />
            </View>
            <Text style={styles.statValue}>{todayScansText}</Text>
            <Text style={styles.statLabel}>Students Today</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => {
            console.log('User tapped New Attendance Session button');
            router.push('/create-session');
          }}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.textDark}
          />
          <Text style={styles.primaryActionText}>New Attendance Session</Text>
        </TouchableOpacity>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>



          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log('User tapped View Statistics button');
              router.push('/(tabs)/(home)/statistics');
            }}
          >
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="chart.bar.fill"
                android_material_icon_name="bar-chart"
                size={28}
                color={colors.accent}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Statistics</Text>
              <Text style={styles.actionDescription}>Attendance reports and analytics</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => {
              console.log('User tapped Export Data button');
              // TODO: Navigate to export screen
            }}
          >
            <View style={styles.actionIconContainer}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up.fill"
                android_material_icon_name="file-download"
                size={28}
                color={colors.secondary}
              />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Export Data</Text>
              <Text style={styles.actionDescription}>Download attendance as CSV or Excel</Text>
            </View>
            <IconSymbol
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 48 : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  signOutButton: {
    padding: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    marginBottom: spacing.sm,
  },
  statValue: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryAction: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionText: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  actionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  actionDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
