import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

type Course = {
    id: string;
    name: string;
    code: string;
};

export default function ExportDataScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState(1);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            if (!user) return;

            const { data, error } = await supabase
                .from('courses')
                .select('id, name, code')
                .eq('lecturer_id', user.id)
                .order('name');

            if (error) {
                throw error;
            }

            setCourses(data || []);
        } catch (error) {
            console.error('Error fetching courses:', error);
            Alert.alert('Error', 'Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleCoursePress = (course: Course) => {
        setSelectedCourse(course);
        setModalVisible(true);
    };

    const generateHTML = (
        courseName: string,
        week: number,
        students: any[],
        sessions: any[],
        attendanceMap: Record<string, Record<string, string>>
    ) => {
        // Generate Date Headers from sessions
        let dateHeaders = '';
        if (sessions.length === 0) {
            dateHeaders = '<th class="col-date">-</th>';
        } else {
            sessions.forEach(session => {
                const date = new Date(session.date);
                const day = date.getDate();
                const month = date.getMonth() + 1;
                dateHeaders += `<th class="col-date">${day}/${month}</th>`;
            });
        }

        // Generate Student Rows
        let studentRows = students.map((student) => {
            let attendanceCells = '';

            if (sessions.length === 0) {
                attendanceCells = '<td style="text-align: center;">-</td>';
            } else {
                sessions.forEach(session => {
                    const status = attendanceMap[student.id]?.[session.id];
                    let cellContent = '';
                    let cellStyle = '';

                    if (status === 'present') {
                        cellContent = '/';
                        cellStyle = 'text-align: center;';
                    } else if (status === 'late') {
                        cellContent = 'L';
                        cellStyle = 'text-align: center; color: orange;';
                    } else {
                        // "nontick mean the student absent" implies missing record = absent
                        cellContent = 'O';
                        cellStyle = 'text-align: center; color: red;';
                    }

                    attendanceCells += `<td style="${cellStyle}">${cellContent}</td>`;
                });
            }

            return `
            <tr>
                <td>${student.name}</td>
                <td>${student.student_id || '-'}</td>
                ${attendanceCells}
            </tr>
            `;
        }).join('');

        const colSpan = sessions.length > 0 ? sessions.length : 1;

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Sheet - Week ${week}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            font-size: 10px;
        }
        .title-week {
            text-align: center;
            font-size: 18px;
            margin-bottom: 20px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .title-subject {
            font-size: 14px;
            margin-bottom: 15px;
            font-weight: bold;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            ${sessions.length > 15 ? 'table-layout: fixed;' : ''}
        }
        th, td {
            border: 1px solid black;
            padding: 4px;
            white-space: nowrap;
        }
        th {
            background-color: #a5a5a5;
            font-weight: normal;
            text-align: center;
            font-size: 9px;
        }
        td {
            height: 20px;
        }
        .col-student { width: 150px; text-align: left; }
        .col-matric { width: 80px; text-align: center; }
        .col-date { min-width: 25px; text-align: center; }
        
        /* Specific overrides for first two columns in body */
        tbody td:first-child { text-align: left; padding-left: 5px; }
        tbody td:nth-child(2) { text-align: center; }
    </style>
</head>
<body>
    <div class="title-week">Attendance Report - Week ${week}</div>
    <div class="title-subject">Subject: ${courseName}</div>
    <table>
        <thead>
            <tr>
                <th rowspan="2" class="col-student">Student Name</th>
                <th rowspan="2" class="col-matric">Matric No</th>
                <th colspan="${colSpan}">Date</th>
            </tr>
            <tr>
                ${dateHeaders}
            </tr>
        </thead>
        <tbody>
            ${studentRows}
        </tbody>
    </table>
</body>
</html>
        `;
    };

    const handleExport = async () => {
        if (!selectedCourse) return;
        setExporting(true);
        try {
            console.log(`Starting export for ${selectedCourse.name}, Week: ${selectedWeek}`);

            // 1. Fetch data
            const { data: students, error: studentsError } = await supabase
                .from('user')
                .select('id, name, student_id')
                .eq('role', 'student')
                .order('name');

            if (studentsError) throw studentsError;

            // Fetch sessions for the selected Week
            const { data: sessions, error: sessionsError } = await supabase
                .from('attendance_sessions')
                .select('id, date, week')
                .eq('course_id', selectedCourse.id)
                .eq('week', selectedWeek) // Filter by selected week
                .order('date', { ascending: true }); // Ensure sorted by date

            if (sessionsError) throw sessionsError;

            const sessionIds = sessions.map(s => s.id);

            // Map session lookup by week_date
            const dateWeekToSessionId: Record<string, string> = {};
            sessions.forEach(s => {
                const key = `${s.week}_${s.date}`;
                dateWeekToSessionId[key] = s.id;
            });

            // Map student matric to UUID
            const matricToUuid: Record<string, string> = {};
            students.forEach(s => {
                if (s.student_id) matricToUuid[s.student_id] = s.id;
            });

            // Fetch Data from View - Filter by Week
            const { data: details, error: detailsError } = await supabase
                .from('attendance_details')
                .select('student_matric, status, week, session_date')
                .eq('course_code', selectedCourse.code)
                .eq('week', selectedWeek); // Filter by selected week

            if (detailsError) throw detailsError;

            // 2. Process Data: Map by Student -> Session ID
            const attendanceMap: Record<string, Record<string, string>> = {};

            // Initialize map for all students to ensure we handle missing ones gracefully 
            // (though generateHTML handles missing keys as absent/empty)

            if (details) {
                details.forEach((record: any) => {
                    const studentId = matricToUuid[record.student_matric];
                    const sessionKey = `${record.week}_${record.session_date}`;
                    const sessionId = dateWeekToSessionId[sessionKey];

                    if (studentId && sessionId) {
                        if (!attendanceMap[studentId]) {
                            attendanceMap[studentId] = {};
                        }
                        attendanceMap[studentId][sessionId] = record.status;
                    }
                });
            }

            // 3. Generate HTML
            const html = generateHTML(
                selectedCourse.name,
                selectedWeek,
                students,
                sessions,
                attendanceMap
            );

            // 4. Generate PDF
            const { uri } = await Print.printToFileAsync({
                html,
                base64: false,
                width: 842, // A4 Landscape width (approx)
                height: 595, // A4 Landscape height (approx)
            });

            console.log('PDF generated at:', uri);

            // 5. Share PDF
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });

            setModalVisible(false);

        } catch (error: any) {
            console.error('Export failed:', error);
            Alert.alert('Export Failed', error.message || 'Unknown error occurred');
        } finally {
            setExporting(false);
        }
    };


    const renderItem = ({ item }: { item: Course }) => (
        <TouchableOpacity style={styles.courseCard} onPress={() => handleCoursePress(item)}>
            <View style={styles.iconContainer}>
                <IconSymbol
                    ios_icon_name="book.fill"
                    android_material_icon_name="book"
                    size={24}
                    color={colors.primary}
                />
            </View>
            <View style={styles.courseInfo}>
                <Text style={styles.courseName}>{item.name}</Text>
                <Text style={styles.courseCode}>{item.code}</Text>
            </View>
            <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="file-upload"
                size={20}
                color={colors.textSecondary}
            />
        </TouchableOpacity>
    );

    const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol
                        ios_icon_name="chevron.left"
                        android_material_icon_name="arrow-back"
                        size={24}
                        color={colors.text}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Export Data</Text>
                <View style={{ width: 24 }} />
            </View>

            <Text style={styles.subtitle}>Select a course to export attendance records</Text>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : courses.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No courses found.</Text>
                </View>
            ) : (
                <FlatList
                    data={courses}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                />
            )}

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Week</Text>
                        <Text style={styles.modalSubtitle}>
                            Exporting: {selectedCourse?.name}
                        </Text>

                        <View style={styles.monthGrid}>
                            {weeks.map((week) => (
                                <TouchableOpacity
                                    key={week}
                                    style={[
                                        styles.monthButton,
                                        selectedWeek === week && styles.monthButtonActive
                                    ]}
                                    onPress={() => setSelectedWeek(week)}
                                >
                                    <Text style={[
                                        styles.monthButtonText,
                                        selectedWeek === week && styles.monthButtonTextActive
                                    ]}>Week {week}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.exportButton]}
                                onPress={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <ActivityIndicator color={colors.textDark} size="small" />
                                ) : (
                                    <Text style={styles.exportButtonText}>Generate PDF</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? 20 : 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.text,
    },
    subtitle: {
        ...typography.body,
        color: colors.textSecondary,
        padding: spacing.lg,
        paddingBottom: spacing.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    emptyText: {
        ...typography.body,
        color: colors.textSecondary,
    },
    listContent: {
        padding: spacing.lg,
    },
    courseCard: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        backgroundColor: colors.highlight,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    courseInfo: {
        flex: 1,
    },
    courseName: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 2,
    },
    courseCode: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    modalSubtitle: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        textAlign: 'center',
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: spacing.sm,
        marginBottom: spacing.lg,
    },
    monthButton: {
        width: '30%',
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    monthButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    monthButtonText: {
        ...typography.bodySmall,
        color: colors.text,
    },
    monthButtonTextActive: {
        color: colors.textDark,
        fontWeight: '600',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: spacing.md,
        width: '100%',
    },
    modalButton: {
        flex: 1,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
    },
    exportButton: {
        backgroundColor: colors.primary,
    },
    cancelButtonText: {
        ...typography.body,
        color: colors.text,
    },
    exportButtonText: {
        ...typography.body,
        color: colors.textDark,
        fontWeight: '600',
    },
});
