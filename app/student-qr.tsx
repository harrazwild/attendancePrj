
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { BackButton } from '@/components/BackButton';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function StudentQRScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [qrData, setQrData] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    console.log('StudentQRScreen mounted, user:', user);
    if (!authLoading && !user) {
      console.log('No user found, redirecting to auth');
      router.replace('/auth');
      return;
    }

    // Generate QR data using real user info
    const generateQRData = () => {
      if (!user) return;

      const now = new Date();
      const timestampValue = now.toISOString();
      const data = JSON.stringify({
        studentId: user.id, // Use Auth ID for database linking
        name: user.name || user.email || 'Student',
        timestamp: timestampValue,
      });
      setQrData(data);
      setTimestamp(now.toLocaleTimeString());
      console.log('Generated QR data:', data);
    };

    generateQRData();
    const interval = setInterval(generateQRData, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const userName = user?.name || 'Student';
  const studentId = user?.student_id || 'Not Set';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <BackButton />
          </View>
          <Text style={styles.title}>Your QR Code</Text>
          <Text style={styles.subtitle}>Show this to your lecturer for attendance</Text>
        </View>

        <View style={styles.qrContainer}>
          <View style={styles.qrWrapper}>
            {qrData ? (
              <QRCode
                value={qrData}
                size={250}
                backgroundColor={colors.card}
                color={colors.text}
              />
            ) : (
              <ActivityIndicator size="large" color={colors.primary} />
            )}
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{userName}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student ID</Text>
            <Text style={styles.infoValue}>{studentId}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{timestamp}</Text>
          </View>
        </View>

        <View style={styles.notice}>

          <Text style={styles.noticeSubtext}>
            Screenshots will not work for attendance
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTop: {
    width: '100%',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  notice: {
    backgroundColor: colors.highlight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },

  noticeSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
