
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { BackButton } from '@/components/BackButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [lastScanned, setLastScanned] = useState<{ name: string; status: 'success' | 'error'; message: string } | null>(null);
  const isProcessing = React.useRef(false); // Ref for immediate lock
  const router = useRouter();
  const params = useLocalSearchParams();
  const { sessionId, courseName, courseCode, week } = params;
  const { user } = useAuth();

  useEffect(() => {
    console.log('ScanScreen mounted');
    return () => {
      isProcessing.current = false;
    };
  }, []);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <IconSymbol
            ios_icon_name="camera.fill"
            android_material_icon_name="camera"
            size={64}
            color={colors.textSecondary}
          />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need your permission to use the camera for scanning QR codes
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    // Immediate lock check using ref
    if (scanned || processing || isProcessing.current) {
      return;
    }

    console.log('QR code scanned:', { type, data });
    isProcessing.current = true;
    setScanned(true);
    setProcessing(true);

    try {
      // Parse QR data
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        throw new Error('Invalid QR Code format');
      }

      console.log('Parsed QR data:', qrData);

      // Validate timestamp is within 30 seconds
      const qrTimestamp = new Date(qrData.timestamp).getTime();
      const now = new Date().getTime();
      const diffSeconds = (now - qrTimestamp) / 1000;

      if (diffSeconds > 30) {
        setLastScanned({
          name: qrData.name || 'Student',
          status: 'error',
          message: 'QR Code Expired. Please ask student to refresh.',
        });
        return;
      }

      let activeSessionId = sessionId as string;

      // If no session ID passed, find active session
      if (!activeSessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('attendance_sessions')
          .select('id')
          .eq('lecturer_id', user?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sessionError || !sessionData) {
          console.error('Session error or no session:', sessionError);
          setLastScanned({
            name: 'System',
            status: 'error',
            message: 'No active session found. Create one first.',
          });
          return;
        }
        activeSessionId = sessionData.id;
      }

      // Insert record
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: activeSessionId,
          student_id: qrData.studentId, // Ensure QR data maps to user id
          status: 'present',
          scan_time: new Date().toISOString()
        });

      if (insertError) {
        // Check for duplicate (already scanned)
        if (insertError.code === '23505') { // Unique violation
          setLastScanned({
            name: qrData.name,
            status: 'error',
            message: 'Already marked present.'
          });
        } else {
          throw insertError;
        }
      } else {
        setLastScanned({
          name: qrData.name,
          status: 'success',
          message: 'Attendance marked successfully.'
        });
      }

    } catch (error: any) {
      console.error('Error processing QR code:', error);
      setLastScanned({
        name: 'Unknown',
        status: 'error',
        message: error.message || 'Failed to process scan.'
      });
    } finally {
      setProcessing(false);
      // isProcessing.current remains true until user resets
    }
  };

  const handleScanNext = () => {
    setLastScanned(null);
    setScanned(false);
    setProcessing(false);
    isProcessing.current = false;
  };

  const handleDeleteSession = async () => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session? This will remove all attendance records for this session.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const { error } = await supabase
                .from('attendance_sessions')
                .delete()
                .eq('id', sessionId);

              if (error) throw error;

              router.replace('/(tabs)/(home)');
            } catch (error) {
              console.error('Error deleting session:', error);
              Alert.alert('Error', 'Failed to delete session');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton
          onPress={() => {
            console.log('User tapped back button');
            router.back();
          }}
        />
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <TouchableOpacity onPress={handleDeleteSession} style={styles.deleteButtonHeader}>
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={24}
            color={colors.error}
          />
        </TouchableOpacity>
      </View>

      {courseName && (
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionInfoText}>
            {courseCode} {courseName}
          </Text>
          {week && <Text style={styles.sessionInfoSubText}>Week {week}</Text>}
        </View>
      )}

      <View style={styles.cameraContainer}>
        {!lastScanned ? (
          <>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
            />
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>
            </View>
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Position QR code within frame</Text>
              <Text style={styles.instructionsText}>
                The QR code will be scanned automatically
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.resultContainer}>
            <IconSymbol
              ios_icon_name={lastScanned.status === 'success' ? 'checkmark.circle.fill' : 'xmark.circle.fill'}
              android_material_icon_name={lastScanned.status === 'success' ? 'check-circle' : 'error'}
              size={80}
              color={lastScanned.status === 'success' ? colors.primary : colors.error}
            />
            <Text style={styles.resultTitle}>
              {lastScanned.status === 'success' ? 'Success!' : 'Error'}
            </Text>
            <Text style={styles.resultName}>{lastScanned.name}</Text>
            <Text style={styles.resultMessage}>{lastScanned.message}</Text>

            <TouchableOpacity style={styles.scanNextButton} onPress={handleScanNext}>
              <Text style={styles.scanNextButtonText}>Scan Next Student</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.processingText}>Processing...</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  deleteButtonHeader: {
    padding: spacing.sm,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: colors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  instructionsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  instructionsText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  permissionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  permissionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  permissionButtonText: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    ...typography.body,
    color: colors.textDark,
    marginTop: spacing.md,
  },
  sessionInfo: {
    padding: spacing.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  sessionInfoText: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
  sessionInfoSubText: {
    ...typography.bodySmall,
    color: colors.textDark,
    marginTop: 2,
  },
  resultContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    zIndex: 10,
  },
  resultTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  resultName: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  resultMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  scanNextButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  scanNextButtonText: {
    ...typography.body,
    color: colors.textDark,
    fontWeight: '600',
  },
});
