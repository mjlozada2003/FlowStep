import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { AppModal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { trackingApi } from '@/services/api/tracking';

interface MissReason {
  reason_id: number;
  name: string;
  description?: string;
}

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams<{
    activityId?: string;
    title?: string;
    duration?: string;
  }>();
  const { token } = useAuth();

  const activityId = params.activityId && /^\d+$/.test(params.activityId) ? Number(params.activityId) : null;
  const activityTitle = params.title || 'Detalle de Actividad';
  const defaultDuration = params.duration ? Number(params.duration) : 30;

  // Estados de formulario (HU-17 y HU-18)
  const [minutesSpent, setMinutesSpent] = useState(String(defaultDuration));
  const [difficultyLevel, setDifficultyLevel] = useState<number>(3);
  const [difficultyNotes, setDifficultyNotes] = useState('');

  // Estados de modales y catálogo (HU-19)
  const [missModalVisible, setMissModalVisible] = useState(false);
  const [missReasons, setMissReasons] = useState<MissReason[]>([]);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [missDetails, setMissDetails] = useState('');

  // Estados de carga y feedback
  const [isLoadingReasons, setIsLoadingReasons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cargar motivos de no completado al abrir el modal (HU-19)
  const handleOpenMissModal = async () => {
    setMissModalVisible(true);
    if (missReasons.length > 0 || !token) return;

    try {
      setIsLoadingReasons(true);
      const data = await trackingApi.getMissReasons(token);
      setMissReasons(Array.isArray(data) ? data : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudieron cargar los motivos.');
    } finally {
      setIsLoadingReasons(false);
    }
  };

  // HU-17 & HU-18: Guardar sesión de trabajo y dificultad
  const handleSaveSession = async () => {
    if (!activityId || !token) return;
    const parsedMinutes = Number(minutesSpent);
    if (isNaN(parsedMinutes) || parsedMinutes <= 0) {
      setErrorMessage('Ingresa un tiempo válido en minutos.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await trackingApi.logWorkSession(
        activityId,
        {
          minutes_spent: parsedMinutes,
          difficulty_level: difficultyLevel,
          difficulty_notes: difficultyNotes.trim() || undefined,
        },
        token
      );
      setSuccessMessage('¡Sesión y dificultad registradas con éxito!');
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al registrar la sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // HU-19: Registrar motivo de no completado
  const handleSubmitMiss = async () => {
    if (!activityId || !token || !selectedReasonId) {
      setErrorMessage('Selecciona un motivo por favor.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await trackingApi.recordActivityMiss(
        activityId,
        {
          reason_id: selectedReasonId,
          details: missDetails.trim() || undefined,
        },
        token
      );
      setMissModalVisible(false);
      setSuccessMessage('Se registró el reporte de actividad pendiente.');
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Error al registrar el motivo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen>
      <BrandHeader />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color="#0F2C40" />
          </TouchableOpacity>
          <Text style={styles.screenMainTitle}>Seguimiento de Actividad</Text>
        </View>

        <Text style={styles.activityTitle}>{activityTitle}</Text>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

        {/* HU-17: Tiempo Dedicado */}
        <View style={styles.card}>
          <Text style={styles.label}>Tiempo invertido (minutos)</Text>
          <TextInput
            style={styles.input}
            value={minutesSpent}
            onChangeText={setMinutesSpent}
            keyboardType="numeric"
            placeholder="Ej. 45"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* HU-18: Nivel de Dificultad */}
        <View style={styles.card}>
          <Text style={styles.label}>¿Qué tan difícil fue?</Text>
          <View style={styles.difficultyContainer}>
            {[1, 2, 3, 4, 5].map((lvl) => (
              <TouchableOpacity
                key={lvl}
                style={[
                  styles.difficultyButton,
                  difficultyLevel === lvl && styles.difficultyButtonSelected,
                ]}
                onPress={() => setDifficultyLevel(lvl)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.difficultyButtonText,
                    difficultyLevel === lvl && styles.difficultyButtonTextSelected,
                  ]}
                >
                  {lvl}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Notas sobre la dificultad (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={difficultyNotes}
            onChangeText={setDifficultyNotes}
            placeholder="Ej. Me costó entender la lógica de los estados..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Botones de Acción */}
        <TouchableOpacity
          style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
          onPress={handleSaveSession}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Guardar y Completar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleOpenMissModal}
          disabled={isSubmitting}
          activeOpacity={0.8}
        >
          <Feather name="alert-circle" size={18} color="#D97706" style={{ marginRight: 8 }} />
          <Text style={styles.secondaryButtonText}>No pude completar esta actividad</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal HU-19: Motivo de No Completado */}
      <AppModal
        visible={missModalVisible}
        onClose={() => setMissModalVisible(false)}
        title="Motivo de Incompletado"
      >
        {isLoadingReasons ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginVertical: 20 }} />
        ) : (
          <View style={{ width: '100%' }}>
            <Text style={styles.modalSubtitle}>Selecciona la razón principal:</Text>
            {missReasons.map((reason) => (
              <TouchableOpacity
                key={reason.reason_id}
                style={[
                  styles.reasonOption,
                  selectedReasonId === reason.reason_id && styles.reasonOptionSelected,
                ]}
                onPress={() => setSelectedReasonId(reason.reason_id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.reasonText,
                    selectedReasonId === reason.reason_id && styles.reasonTextSelected,
                  ]}
                >
                  {reason.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.label, { marginTop: 12 }]}>Detalles adicionales (opcional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={missDetails}
              onChangeText={setMissDetails}
              placeholder="Explica brevemente..."
              placeholderTextColor="#9CA3AF"
              multiline
            />

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { marginTop: 16 },
                (!selectedReasonId || isSubmitting) && styles.buttonDisabled,
              ]}
              onPress={handleSubmitMiss}
              disabled={!selectedReasonId || isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Confirmar Motivo</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  screenMainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#627D98',
    marginBottom: 16,
    marginLeft: 34,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F4F8',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334E68',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E2EC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
    color: '#102A43',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  difficultyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  difficultyButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  difficultyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#486581',
  },
  difficultyButtonTextSelected: {
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#B45309',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: '#DC2626',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#16A34A',
    marginBottom: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#486581',
    marginBottom: 12,
  },
  reasonOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E2EC',
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  reasonOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  reasonText: {
    fontSize: 14,
    color: '#334E68',
  },
  reasonTextSelected: {
    color: '#1D4ED8',
    fontWeight: 'bold',
  },
});