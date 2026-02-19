
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { BackButton } from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { colors, spacing, typography, borderRadius } from '@/styles/commonStyles';

type AbsentStudent = {
  student_id: string;
  student_name: string;
  student_matric: string;
  student_email: string;
};

export default function SessionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { sessionId } = params;
  const [loading, setLoading] = useState(true);
  const [absentStudents, setAbsentStudents] = useState<AbsentStudent[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch session info
        const { data: sData, error: sError } = await supabase
          .from('attendance_sessions')
          .select('*, courses(name, code)')
          .eq('id', sessionId)
          .single();

        if (sError) throw sError;
        setSessionInfo(sData);

        // Fetch absent students
        const { data, error } = await supabase
          .from('absent_student_details')
          .select('*')
          .eq('session_id', sessionId)
          .order('student_name');

        if (error) throw error;
        setAbsentStudents(data || []);
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  const renderItem = ({ item }: { item: AbsentStudent }) => (
    <View style={styles.studentCard}>
      <View style={styles.avatarContainer}>
        <Text style={styles.avatarText}>
          {item.student_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.student_name}</Text>
        <Text style={styles.studentMatric}>{item.student_matric || 'No ID'}</Text>
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Absent</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>Session Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={styles.content}>
          {sessionInfo && (
            <View style={styles.infoCard}>
              <Text style={styles.courseName}>
                {sessionInfo.courses?.code} {sessionInfo.courses?.name}
              </Text>
              <Text style={styles.sessionDate}>
                Week {sessionInfo.week} • {new Date(sessionInfo.date).toLocaleDateString()}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Absent Students ({absentStudents.length})</Text>

          <FlatList
            data={absentStudents}
            renderItem={renderItem}
            keyExtractor={(item) => item.student_id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>All students present!</Text>
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  courseName: {
    ...typography.h3,
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  sessionDate: {
    ...typography.body,
    color: colors.textDark,
    opacity: 0.9,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: colors.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  studentMatric: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statusBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
