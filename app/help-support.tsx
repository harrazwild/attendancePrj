import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function HelpSupportScreen() {
    const router = useRouter();

    const handleEmailPress = () => {
        Linking.openURL('mailto:attendanceprj@gmail.com');
    };

    const handlePhonePress = () => {
        Linking.openURL('tel:0172396733');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <IconSymbol
                        ios_icon_name="chevron.left"
                        android_material_icon_name="chevron-left"
                        size={28}
                        color={colors.text}
                    />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Help & Support</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('@/assets/images/final_quest_240x240.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>Attendance App</Text>
                    <Text style={styles.appVersion}>Version 1.0.0</Text>
                </View>

                <View style={styles.contactSection}>
                    <Text style={styles.sectionTitle}>Contact Us</Text>
                    <Text style={styles.sectionDescription}>
                        If you have any questions or need assistance, please feel free to contact us.
                    </Text>

                    <TouchableOpacity style={styles.contactItem} onPress={handleEmailPress}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.highlight }]}>
                            <IconSymbol
                                ios_icon_name="envelope.fill"
                                android_material_icon_name="mail"
                                size={24}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Email</Text>
                            <Text style={styles.contactValue}>attendanceprj@gmail.com</Text>
                        </View>
                        <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron-right"
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.contactItem} onPress={handlePhonePress}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.highlight }]}>
                            <IconSymbol
                                ios_icon_name="phone.fill"
                                android_material_icon_name="phone"
                                size={24}
                                color={colors.success}
                            />
                        </View>
                        <View style={styles.contactInfo}>
                            <Text style={styles.contactLabel}>Phone</Text>
                            <Text style={styles.contactValue}>017-2396733</Text>
                        </View>
                        <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron-right"
                            size={20}
                            color={colors.textSecondary}
                        />
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitle: {
        ...typography.h3,
        color: colors.text,
    },
    content: {
        flex: 1,
        padding: spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: spacing.md,
    },
    appName: {
        ...typography.h2,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    appVersion: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    contactSection: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
        marginBottom: spacing.xs,
    },
    sectionDescription: {
        ...typography.body,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    contactInfo: {
        flex: 1,
    },
    contactLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    contactValue: {
        ...typography.body,
        fontWeight: '600',
        color: colors.text,
    },
});
