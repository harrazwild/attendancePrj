
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [courses, setCourses] = useState<Array<{ name: string; code: string }>>([]);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');

  // New state variables
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'student' | 'lecturer'>('student');
  const [error, setError] = useState('');

  const { signInWithEmail, signUpWithEmail, user, loading: isAuthLoading } = useAuth();
  const router = useRouter();

  // Handle navigation when user state changes
  useEffect(() => {
    if (user && !isAuthLoading) {
      console.log('User detected in auth screen:', {
        id: user.id,
        email: user.email,
        role: user.role,
        student_id: user.student_id
      });

      if (user.role === 'student') {
        console.log('Redirecting student to /student-qr');
        router.replace('/student-qr' as any);
      } else if (user.role === 'lecturer') {
        console.log('Redirecting lecturer to /(tabs)/(home)');
        router.replace('/(tabs)/(home)' as any);
      } else {
        console.log('Unknown role, defaulting to lecturer interface');
        router.replace('/(tabs)/(home)' as any);
      }
    }
  }, [user, isAuthLoading, router]);

  const handleAddCourse = () => {
    if (courseName.trim() && courseCode.trim()) {
      setCourses([...courses, { name: courseName.trim(), code: courseCode.trim() }]);
      setCourseName('');
      setCourseCode('');
    }
  };

  const handleRemoveCourse = (index: number) => {
    const newCourses = [...courses];
    newCourses.splice(index, 1);
    setCourses(newCourses);
  };

  const handleSubmit = async () => {
    console.log('Auth form submitted:', { isLogin, email, role });
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        console.log('Attempting login...');
        await signInWithEmail(email, password);
        console.log('Login successful');
        // Navigation will be handled by useEffect when user state updates
      } else {
        console.log('Attempting signup...');
        if (!name.trim()) {
          setError('Name is required');
          setIsLoading(false);
          return;
        }
        if (role === 'student' && !studentId.trim()) {
          setError('Student ID is required for students');
          setIsLoading(false);
          return;
        }

        await signUpWithEmail(email, password, name, studentId, role, courses);
        console.log('Signup successful');
        // Navigation will be handled by useEffect when user state updates
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>Attendance System</Text>
              <Text style={styles.subtitle}>
                {isLogin ? 'Sign in to continue' : 'Create your account'}
              </Text>
            </View>

            {!isLogin && (
              <>
                <View style={styles.roleSelector}>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'student' && styles.roleButtonActive]}
                    onPress={() => setRole('student')}
                    disabled={isLoading}
                  >
                    <Text style={[styles.roleButtonText, role === 'student' && styles.roleButtonTextActive]}>
                      Student
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.roleButton, role === 'lecturer' && styles.roleButtonActive]}
                    onPress={() => setRole('lecturer')}
                    disabled={isLoading}
                  >
                    <Text style={[styles.roleButtonText, role === 'lecturer' && styles.roleButtonTextActive]}>
                      Lecturer
                    </Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={colors.textLight}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  editable={!isLoading}
                />

                {role === 'student' && (
                  <TextInput
                    style={styles.input}
                    placeholder="Student ID / Matric Number"
                    placeholderTextColor={colors.textLight}
                    value={studentId}
                    onChangeText={setStudentId}
                    autoCapitalize="characters"
                    editable={!isLoading}
                  />
                )}

                {role === 'lecturer' && (
                  <View style={styles.courseSection}>
                    <Text style={styles.courseSectionTitle}>Courses</Text>
                    {courses.map((course, index) => (
                      <View key={index} style={styles.courseItem}>
                        <View style={styles.courseInfo}>
                          <Text style={styles.courseName}>{course.name}</Text>
                          <Text style={styles.courseCode}>{course.code}</Text>
                        </View>
                        <TouchableOpacity onPress={() => handleRemoveCourse(index)}>
                          <Text style={styles.removeButton}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    ))}

                    <View style={styles.addCourseContainer}>
                      <TextInput
                        style={[styles.input, styles.courseInput]}
                        placeholder="Course Name"
                        placeholderTextColor={colors.textLight}
                        value={courseName}
                        onChangeText={setCourseName}
                        editable={!isLoading}
                      />
                      <TextInput
                        style={[styles.input, styles.courseInput]}
                        placeholder="Code"
                        placeholderTextColor={colors.textLight}
                        value={courseCode}
                        onChangeText={setCourseCode}
                        autoCapitalize="characters"
                        editable={!isLoading}
                      />
                      <TouchableOpacity
                        style={styles.addButton}
                        onPress={handleAddCourse}
                        disabled={isLoading || !courseName.trim() || !courseCode.trim()}
                      >
                        <Text style={styles.addButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isLoading}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.textLight}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              disabled={isLoading}
            >
              <Text style={styles.switchText}>
                {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  roleButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  roleButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  roleButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: colors.textDark,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
    backgroundColor: colors.card,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textDark,
    ...typography.body,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchText: {
    color: colors.primary,
    ...typography.bodySmall,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.md,
    textAlign: 'center',
    ...typography.bodySmall,
  },
  courseSection: {
    marginBottom: spacing.md,
  },
  courseSectionTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  courseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  courseInfo: {
    flex: 1,
  },
  courseName: {
    ...typography.body,
    color: colors.text,
  },
  courseCode: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  removeButton: {
    color: colors.error,
    ...typography.bodySmall,
  },
  addCourseContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  courseInput: {
    flex: 1,
    marginBottom: 0, // Override default margin
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 24,
    color: colors.textDark,
    fontWeight: '600',
  },
});
