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

const DIFFICULTY_TAGS = [
  'Falta de conocimientos',
  'Falta de tiempo',
  'Difícil de comprender',
  'Problemas externos',
  'Otra',
];

const mockMissReasons: MissReason[] = [
  { reason_id: 1, name: 'Falta de tiempo' },
  { reason_id: 2, name: 'Dificultad con la actividad' },
  { reason_id: 3, name: 'Falta de conocimientos' },
  { reason_id: 4, name: 'Imprevistos' },
  { reason_id: 5, name: 'Otro' },
];

export default function ActivityDetailScreen() {
  const params = useLocalSearchParams<{
    activityId?: string;
    title?: string;
    duration?: string;
    stageTitle?: string;
    description?: string;
  }>();
  const { token } = useAuth();

  const activityId = params.activityId && /^\d+$/.test(params.activityId) ? Number(params.activityId) : 1;
  const activityTitle = params.title || 'Introducción a React';
  const stageInfo = params.stageTitle || 'ETAPA 1 · APRENDIZAJE';
  const activityDesc = params.description || 'Comprende los fundamentos y prepara tu entorno de trabajo.';
  const defaultDuration = params.duration ? Number(params.duration) : 45;

  const [hoursSpent, setHoursSpent] = useState('0');
  const [minutesSpent, setMinutesSpent] = useState(String(defaultDuration));
  const [selectedDifficultyTag, setSelectedDifficultyTag] = useState<string>('Falta de conocimientos');
  const [difficultyNotes, setDifficultyNotes] = useState('Me costó entender cómo se conectan los componentes.');

  const [missModalVisible, setMissModalVisible] = useState(false);
  const [missReasons, setMissReasons] = useState<MissReason[]>(mockMissReasons);
  const [selectedReasonId, setSelectedReasonId] = useState<number | null>(null);
  const [missDetails, setMissDetails] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveAction = async (msg: string) => {
    try {
      setIsSubmitting(true);
      if (token && activityId) {
        await trackingApi.logWorkSession(
          activityId,
          {
            minutes_spent: (Number(hoursSpent) || 0) * 60 + (Number(minutesSpent) || 0),
            difficulty_notes: `[${selectedDifficultyTag}] ${difficultyNotes}`,
          },
          token
        ).catch(() => {});
      }
      setSuccessMessage(msg);
      setTimeout(() => router.back(), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenMissModal = async () => {
    setMissModalVisible(true);
    if (!token) return;
    try {
      const data = await trackingApi.getMissReasons(token);
      if (Array.isArray(data) && data.length > 0) setMissReasons(data);
    } catch {
      setMissReasons(mockMissReasons);
    }
  };

  const handleSubmitMiss = async () => {
    if (!selectedReasonId) return;
    try {
      setIsSubmitting(true);
      if (token && activityId) {
        await trackingApi.recordActivityMiss(
          activityId,
          { reason_id: selectedReasonId, details: missDetails },
          token
        ).catch(() => {});
      }
      setMissModalVisible(false);
      setSuccessMessage('Se registró el reporte correctamente.');
      setTimeout(() => router.back(), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>DETALLE DE ACTIVIDAD</Text>
          <BrandHeader />
        </View>

        {successMessage && <Text style={styles.successText}>{successMessage}</Text>}

        <View style={styles.mainActivityCard}>
          <View style={styles.activityBadgeRow}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>D1</Text>
            </View>
            <Text style={styles.stageInfoText}>{stageInfo}</Text>
          </View>
          <Text style={styles.activityMainTitle}>{activityTitle}</Text>
          <Text style={styles.activityDescText}>{activityDesc}</Text>
        </View>

        <View style={styles.metaInfoRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color="#627D98" />
            <Text style={styles.metaText}>Lun 16 · 18:00</Text>
          </View>
          <Text style={styles.metaText}>20 min estimadas</Text>
        </View>

        {/* Registro de Tiempo */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Feather name="clock" size={16} color="#174A62" />
            </View>
            <View>
              <Text style={styles.sectionCategory}>REGISTRO DE TIEMPO</Text>
              <Text style={styles.sectionTitle}>¿Cuánto tiempo dedicaste?</Text>
            </View>
          </View>

          <View style={styles.timeInputsRow}>
            <View style={styles.timeBoxContainer}>
              <TextInput
                style={styles.timeInput}
                value={hoursSpent}
                onChangeText={setHoursSpent}
                keyboardType="numeric"
                maxLength={2}
              />
              <Text style={styles.timeUnitLabel}>horas</Text>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeBoxContainer}>
              <TextInput
                style={styles.timeInput}
                value={minutesSpent}
                onChangeText={setMinutesSpent}
                keyboardType="numeric"
                maxLength={3}
              />
              <Text style={styles.timeUnitLabel}>minutos</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.actionButtonLight}
            onPress={() => handleSaveAction('¡Tiempo guardado con éxito!')}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#174A62" />
            ) : (
              <Text style={styles.actionButtonLightText}>Guardar tiempo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Registro de Dificultad */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Feather name="alert-circle" size={16} color="#174A62" />
            </View>
            <View>
              <Text style={styles.sectionCategory}>EXPERIENCIA</Text>
              <Text style={styles.sectionTitle}>¿Tuviste alguna dificultad?</Text>
            </View>
          </View>

          <View style={styles.pillsContainer}>
            {DIFFICULTY_TAGS.map((tag) => {
              const isSelected = selectedDifficultyTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.pillButton, isSelected && styles.pillButtonSelected]}
                  onPress={() => setSelectedDifficultyTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.subLabel}>CUÉNTANOS UN POCO MÁS</Text>
          <TextInput
            style={styles.textArea}
            value={difficultyNotes}
            onChangeText={setDifficultyNotes}
            placeholder="Me costó entender..."
            multiline
          />

          <TouchableOpacity
            style={styles.actionButtonLight}
            onPress={() => handleSaveAction('¡Dificultad guardada con éxito!')}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonLightText}>Guardar dificultad</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => handleSaveAction('¡Actividad marcada como completada!')}
          activeOpacity={0.85}
        >
          <Feather name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryActionText}>Marcar como completada</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.outlineActionButton}
          onPress={handleOpenMissModal}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineActionText}>No pude completar esta actividad</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Motivo */}
      <AppModal visible={missModalVisible} onClose={() => setMissModalVisible(false)} title="Registrar Resultado">
        <View style={{ width: '100%' }}>
          <Text style={styles.modalTitleQuestion}>¿Por qué no pudiste completarla?</Text>
          <View style={styles.pillsContainer}>
            {missReasons.map((reason) => {
              const isSelected = selectedReasonId === reason.reason_id;
              return (
                <TouchableOpacity
                  key={reason.reason_id}
                  style={[styles.pillButton, isSelected && styles.pillButtonSelected]}
                  onPress={() => setSelectedReasonId(reason.reason_id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                    {reason.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { marginTop: 16 }]}>DETALLES OPCIONALES</Text>
          <TextInput
            style={styles.textArea}
            value={missDetails}
            onChangeText={setMissDetails}
            placeholder="Explica brevemente..."
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryActionButton, { marginTop: 20 }, !selectedReasonId && styles.buttonDisabled]}
            onPress={handleSubmitMiss}
            disabled={!selectedReasonId || isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryActionText}>Guardar motivo</Text>
            )}
          </TouchableOpacity>
        </View>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: { backgroundColor: '#FDFBF7' },
  container: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#E4E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  topBarTitle: { fontSize: 11, fontWeight: '700', color: '#627D98', letterSpacing: 0.5 },
  mainActivityCard: { backgroundColor: '#174A62', borderRadius: 16, padding: 20, marginBottom: 8 },
  activityBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeContainer: { backgroundColor: '#E2EEF1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#174A62' },
  stageInfoText: { fontSize: 11, fontWeight: '700', color: '#829AB1', letterSpacing: 0.5 },
  activityMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  activityDescText: { fontSize: 13, color: '#C4D1DB', lineHeight: 18 },
  metaInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#627D98' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E4E7EB' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E2EEF1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  sectionCategory: { fontSize: 10, fontWeight: '700', color: '#174A62', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F2C40' },
  timeInputsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  timeBoxContainer: { alignItems: 'center', flex: 1, maxWidth: 100 },
  timeInput: { width: '100%', height: 56, borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 12, textAlign: 'center', fontSize: 22, fontWeight: 'bold', color: '#0F2C40', backgroundColor: '#F8FAFC', marginBottom: 4 },
  timeUnitLabel: { fontSize: 11, color: '#627D98' },
  timeSeparator: { fontSize: 24, fontWeight: 'bold', color: '#627D98', marginHorizontal: 12 },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pillButton: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#D9E2EC', backgroundColor: '#F8FAFC' },
  pillButtonSelected: { borderColor: '#174A62', backgroundColor: '#E2EEF1' },
  pillText: { fontSize: 12, color: '#334E68' },
  pillTextSelected: { color: '#174A62', fontWeight: '600' },
  subLabel: { fontSize: 10, fontWeight: '700', color: '#627D98', marginBottom: 6, letterSpacing: 0.5 },
  textArea: { borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 10, padding: 10, height: 75, fontSize: 13, color: '#0F2C40', backgroundColor: '#F8FAFC', textAlignVertical: 'top', marginBottom: 12 },
  actionButtonLight: { backgroundColor: '#E2EEF1', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionButtonLightText: { color: '#174A62', fontSize: 14, fontWeight: '600' },
  primaryActionButton: { backgroundColor: '#174A62', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  outlineActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9E2EC', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginBottom: 20 },
  outlineActionText: { color: '#627D98', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  successText: { color: '#16A34A', marginBottom: 12, fontSize: 13, fontWeight: '500', textAlign: 'center' },
  modalTitleQuestion: { fontSize: 16, fontWeight: 'bold', color: '#0F2C40', marginBottom: 14 },
});