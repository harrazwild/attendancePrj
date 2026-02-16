import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Modal, Pressable, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase';

// Types
interface Course {
    id: string;
    name: string;
    code: string;
}

interface SessionData {
    id: string;
    date: string;
    time: string;
    attendance: StudentAttendance[];
}

interface StudentAttendance {
    student_id: string;
    name: string;
    student_number: string; // Matric number
    status: string; // 'present', 'absent', etc.
    scan_time: string | null;
}

export default function StatisticsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [courses, setCourses] = useState<Course[]>([]);

    // Selection State
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedWeek, setSelectedWeek] = useState<number>(1);
    const [showCourseModal, setShowCourseModal] = useState(false);

    // Data State
    const [sessionsList, setSessionsList] = useState<SessionData[]>([]);
    const [sessionFound, setSessionFound] = useState<boolean | null>(null); // null = loading/init, true, false

    // 1. Fetch Courses on Mount
    useEffect(() => {
        fetchCourses();
    }, []);

    // 2. Fetch Attendance when Course or Week changes
    useEffect(() => {
        if (selectedCourse) {
            fetchSessionAndAttendance();
        }
    }, [selectedCourse, selectedWeek]);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('courses')
                .select('id, name, code')
                .order('name');

            if (error) throw error;

            if (data && data.length > 0) {
                setCourses(data);
                setSelectedCourse(data[0]); // Default to first course
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessionAndAttendance = async () => {
        if (!selectedCourse) return;

        setLoading(true);
        setSessionsList([]);
        setSessionFound(null);

        try {
            // Step A: Find ALL sessions for the selected Course + Week
            const { data: sessions, error: sessionError } = await supabase
                .from('attendance_sessions')
                .select('id, date, time')
                .eq('course_id', selectedCourse.id)
                .eq('week', selectedWeek)
                .order('date', { ascending: true })
                .order('time', { ascending: true });

            if (sessionError) throw sessionError;

            if (!sessions || sessions.length === 0) {
                setSessionFound(false);
                setLoading(false);
                return;
            }

            setSessionFound(true);

            // Step B: For each session, get records
            const sessionsWithData: SessionData[] = [];

            for (const session of sessions) {
                const { data: records, error: recordsError } = await supabase
                    .from('attendance_records')
                    .select(`
                        status,
                        scan_time,
                        student:student_id (id, name, student_id)
                    `)
                    .eq('session_id', session.id)
                    .order('scan_time', { ascending: true });

                if (recordsError) throw recordsError;

                const formattedList: StudentAttendance[] = records.map((r: any) => ({
                    student_id: r.student.id,
                    name: r.student.name || 'Unknown',
                    student_number: r.student.student_id || 'N/A',
                    status: r.status,
                    scan_time: r.scan_time,
                }));

                sessionsWithData.push({
                    id: session.id,
                    date: session.date,
                    time: session.time,
                    attendance: formattedList,
                });
            }

            setSessionsList(sessionsWithData);

        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        Alert.alert(
            'Delete Session',
            'Are you sure you want to delete this session? This will remove all attendance records for this session.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            const { error } = await supabase
                                .from('attendance_sessions')
                                .delete()
                                .eq('id', sessionId);

                            if (error) throw error;

                            // Refresh data
                            fetchSessionAndAttendance();
                        } catch (error) {
                            console.error('Error deleting session:', error);
                            Alert.alert('Error', 'Failed to delete session');
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // --- Render Components ---

    const renderCourseSelector = () => (
        <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => setShowCourseModal(true)}
        >
            <View>
                <Text style={styles.selectorLabel}>Course</Text>
                <Text style={styles.selectorValue}>
                    {selectedCourse ? `${selectedCourse.code} - ${selectedCourse.name}` : 'Select a Course'}
                </Text>
            </View>
            <IconSymbol
                ios_icon_name="chevron.down"
                android_material_icon_name="expand-more"
                size={20}
                color={colors.textSecondary}
            />
        </TouchableOpacity>
    );

    const renderWeekSelector = () => (
        <View style={styles.weekSelectorContainer}>
            <Text style={styles.sectionTitle}>Week</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.weekScrollContent}
            >
                {Array.from({ length: 14 }, (_, i) => i + 1).map((week) => (
                    <TouchableOpacity
                        key={week}
                        style={[
                            styles.weekChip,
                            selectedWeek === week && styles.weekChipSelected
                        ]}
                        onPress={() => setSelectedWeek(week)}
                    >
                        <Text style={[
                            styles.weekText,
                            selectedWeek === week && styles.weekTextSelected
                        ]}>
                            {week}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    const renderStudentItem = ({ item }: { item: StudentAttendance }) => (
        <View style={styles.studentRow}>
            <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentId}>{item.student_number}</Text>
            </View>
            <View style={styles.statusContainer}>
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
                {item.scan_time && (
                    <Text style={styles.timeText}>
                        {new Date(item.scan_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                )}
            </View>
        </View>
    );

    const renderContent = () => {
        if (loading && !sessionFound) {
            return <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />;
        }

        if (sessionFound === false) {
            return (
                <View style={styles.emptyContainer}>
                    <IconSymbol
                        ios_icon_name="calendar.badge.exclamationmark"
                        android_material_icon_name="event-busy"
                        size={48}
                        color={colors.textSecondary}
                    />
                    <Text style={styles.emptyText}>No session found for Week {selectedWeek}</Text>
                    <Text style={styles.emptySubText}>
                        There might be no class scheduled or no attendance session created yet.
                    </Text>
                </View>
            );
        }

        return (
            <View>
                {sessionsList.map((session) => (
                    <View key={session.id} style={styles.sessionContainer}>
                        <View style={styles.sessionHeader}>
                            <View>
                                <Text style={styles.sessionDate}>
                                    {new Date(session.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                </Text>
                                <Text style={styles.sessionTime}>
                                    {session.time.substring(0, 5)} {/* HH:MM */}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => handleDeleteSession(session.id)}
                                style={styles.deleteButton}
                            >
                                <IconSymbol
                                    ios_icon_name="trash"
                                    android_material_icon_name="delete"
                                    size={20}
                                    color={colors.error}
                                />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.listContainer}>
                            <View style={styles.listHeader}>
                                <Text style={styles.listTitle}>Students Present ({session.attendance.length})</Text>
                            </View>

                            {session.attendance.length === 0 ? (
                                <Text style={styles.emptyListText}>No students have scanned in yet.</Text>
                            ) : (
                                <FlatList
                                    data={session.attendance}
                                    renderItem={renderStudentItem}
                                    keyExtractor={(item) => item.student_id}
                                    scrollEnabled={false}
                                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                                />
                            )}
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <>
            <Stack.Screen options={{ title: 'Attendance Report' }} />
            <View style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {renderCourseSelector()}
                    {renderWeekSelector()}
                    {renderContent()}
                </ScrollView>

                {/* Course Selection Modal */}
                <Modal
                    visible={showCourseModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCourseModal(false)}
                >
                    <Pressable style={styles.modalOverlay} onPress={() => setShowCourseModal(false)}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Select Course</Text>
                                <TouchableOpacity onPress={() => setShowCourseModal(false)}>
                                    <IconSymbol ios_icon_name="xmark.circle.fill" android_material_icon_name="close" size={24} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>
                            <FlatList
                                data={courses}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[
                                            styles.modalItem,
                                            selectedCourse?.id === item.id && styles.modalItemSelected
                                        ]}
                                        onPress={() => {
                                            setSelectedCourse(item);
                                            setShowCourseModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalItemText,
                                            selectedCourse?.id === item.id && styles.modalItemTextSelected
                                        ]}>
                                            {item.code} - {item.name}
                                        </Text>
                                        {selectedCourse?.id === item.id && (
                                            <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={20} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </Pressable>
                </Modal>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    loader: {
        marginTop: spacing.xl,
    },

    // Selectors
    selectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    selectorLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    selectorValue: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },

    // Week Selector
    weekSelectorContainer: {
        marginBottom: spacing.xl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    weekScrollContent: {
        // paddingVertical: spacing.xs,
        gap: spacing.sm,
    },
    weekChip: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    weekChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    weekText: {
        ...typography.body,
        color: colors.text,
        fontWeight: '500',
    },
    weekTextSelected: {
        color: colors.textDark, // Assuming primary is dark enough, or use white
        fontWeight: '700',
    },

    // List
    sessionContainer: {
        marginBottom: spacing.xl,
    },
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
        paddingHorizontal: spacing.xs,
    },
    sessionDate: {
        ...typography.h3,
        color: colors.text,
    },
    sessionTime: {
        ...typography.body,
        color: colors.textSecondary,
    },
    deleteButton: {
        padding: spacing.xs,
    },
    listContainer: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    listHeader: {
        padding: spacing.md,
        backgroundColor: colors.background, // Slightly different ?
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    listTitle: {
        ...typography.h3,
        fontSize: 16,
    },
    emptyListText: {
        padding: spacing.lg,
        textAlign: 'center',
        color: colors.textSecondary,
    },
    studentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
    },
    studentInfo: {},
    studentName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
    studentId: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    statusContainer: {
        alignItems: 'flex-end',
    },
    statusBadge: {
        backgroundColor: colors.success + '20', // transparent green
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginBottom: 2,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.success,
    },
    timeText: {
        ...typography.caption,
        fontSize: 10,
        color: colors.textSecondary,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },

    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: spacing.md,
    },
    emptyText: {
        ...typography.h3,
        color: colors.text,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    emptySubText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: spacing.xs,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        ...typography.h3,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalItemSelected: {
        backgroundColor: colors.highlight,
    },
    modalItemText: {
        ...typography.body,
        color: colors.text,
    },
    modalItemTextSelected: {
        fontWeight: '700',
        color: colors.primary,
    },
});
