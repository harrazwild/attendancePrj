
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateSessionScreen() {
  const router = useRouter();
  const [courses, setCourses] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [week, setWeek] = useState('1');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);

  useEffect(() => {
    console.log('CreateSessionScreen mounted');
    // TODO: Backend Integration - GET /api/lecturer/courses to get courses list
    // Mock data for now
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        console.log('Fetching courses...');
        setCourses([
          { id: '1', name: 'Computer Science 101', code: 'CS101' },
          { id: '2', name: 'Data Structures', code: 'CS201' },
          { id: '3', name: 'Algorithms', code: 'CS301' },
        ]);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCreateSession = async () => {
    console.log('User tapped Create Session button');
    if (!selectedCourse) {
      console.log('No course selected');
      return;
    }

    setLoading(true);
    try {
      console.log('Creating session:', { selectedCourse, week, date, time });
      // TODO: Backend Integration - POST /api/lecturer/sessions with { courseId, week, date, time }
      // Mock success
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Session created successfully');
      router.back();
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setLoading(false);
    }
  };

  const dateString = date.toLocaleDateString();
  const timeString = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            console.log('User tapped back button');
            router.back();
          }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={24}
            color={colors.text}
          />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Session</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Course</Text>
          {loadingCourses ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => {
                const isSelected = selectedCourse === course.id;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.courseCard, isSelected && styles.courseCardSelected]}
                    onPress={() => {
                      console.log('Selected course:', course.name);
                      setSelectedCourse(course.id);
                    }}
                  >
                    <View style={styles.courseInfo}>
                      <Text style={[styles.courseName, isSelected && styles.courseNameSelected]}>
                        {course.name}
                      </Text>
                      <Text style={[styles.courseCode, isSelected && styles.courseCodeSelected]}>
                        {course.code}
                      </Text>
                    </View>
                    {isSelected && (
                      <IconSymbol
                        ios_icon_name="checkmark.circle.fill"
                        android_material_icon_name="check-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Week</Text>
          <View style={styles.weekSelector}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((w) => {
              const weekStr = w.toString();
              const isSelected = week === weekStr;
              return (
                <TouchableOpacity
                  key={w}
                  style={[styles.weekButton, isSelected && styles.weekButtonSelected]}
                  onPress={() => {
                    console.log('Selected week:', w);
                    setWeek(weekStr);
                  }}
                >
                  <Text style={[styles.weekButtonText, isSelected && styles.weekButtonTextSelected]}>
                    {weekStr}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => {
              console.log('User tapped date picker');
              setShowDatePicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="calendar"
              android_material_icon_name="calendar-today"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.dateTimeText}>{dateString}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  console.log('Date selected:', selectedDate);
                  setDate(selectedDate);
                }
              }}
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => {
              console.log('User tapped time picker');
              setShowTimePicker(true);
            }}
          >
            <IconSymbol
              ios_icon_name="clock"
              android_material_icon_name="access-time"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.dateTimeText}>{timeString}</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  console.log('Time selected:', selectedTime);
                  setTime(selectedTime);
                }
              }}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.createButton, (!selectedCourse || loading) && styles.createButtonDisabled]}
          onPress={handleCreateSession}
          disabled={!selectedCourse || loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textDark} />
          ) : (
            <Text style={styles.createButtonText}>Create Session</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    color: colors.text,
  },
  headerTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  courseList: {
    gap: spacing.sm,
  },
  courseCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
  },
  courseCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  courseNameSelected: {
    color: colors.primary,
  },
  courseCode: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  courseCodeSelected: {
    color: colors.primary,
  },
  weekSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekButton: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  weekButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  weekButtonTextSelected: {
    color: colors.textDark,
  },
  dateTimeButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateTimeText: {
    ...typography.body,
    color: colors.text,
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
});
