import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { trackingApi } from '@/services/api/tracking';
import { ActivityMissModal } from '@/components/features/ActivityMissModal';
import { ActivityTimeCard } from '@/components/features/ActivityTimeCard';
import { ActivityDifficultyCard } from '@/components/features/ActivityDifficultyCard';

interface MissReason {
  reason_id: number;
  name: string;
  description?: string;
}

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
    stageId?: string;
    goalId?: string;
    title?: string;
    duration?: string;
    stageTitle?: string;
    description?: string;
  }>();
  const { token } = useAuth();

  const activityId = params.activityId && /^\d+$/.test(params.activityId) ? Number(params.activityId) : 1;
  const stageId = params.stageId && /^\d+$/.test(params.stageId) ? Number(params.stageId) : null;
  const goalId = params.goalId && /^\d+$/.test(params.goalId) ? Number(params.goalId) : null;
  
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

  const handleSaveAction = async (msg: string, isCompletion: boolean = false) => {
    try {
      setIsSubmitting(true);
      if (token && activityId) {
        if (isCompletion) {
          router.push({
            pathname: '/goal-success',
            params: {
              activityId: String(activityId),
              stageId: stageId ? String(stageId) : '',
              goalId: goalId ? String(goalId) : '',
              stageTitle: stageInfo,
            },
          });
          return;
        } else {
          await trackingApi.logWorkSession(
            activityId,
            {
              minutes_spent: (Number(hoursSpent) || 0) * 60 + (Number(minutesSpent) || 0),
              difficulty_notes: `[${selectedDifficultyTag}] ${difficultyNotes}`,
            },
            token
          ).catch(() => {});
        }
      }
      setSuccessMessage(msg);
      setTimeout(() => router.back(), 800);
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
      setTimeout(() => router.back(), 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle} numberOfLines={1}>DETALLE DE ACTIVIDAD</Text>
          <BrandHeader />
        </View>

        {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}

        <View style={styles.mainActivityCard}>
          <View style={styles.activityBadgeRow}>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>D1</Text>
            </View>
            <Text style={styles.stageInfoText} numberOfLines={1}>{stageInfo}</Text>
          </View>
          <Text style={styles.activityMainTitle}>{activityTitle}</Text>
          <Text style={styles.activityDescText}>{activityDesc}</Text>
        </View>

        <View style={styles.metaInfoRow}>
          <View style={styles.metaItem}>
            <Feather name="calendar" size={14} color="#627D98" />
            <Text style={styles.metaText}>Sesión programada</Text>
          </View>
          <Text style={styles.metaText}>{defaultDuration} min estimados</Text>
        </View>

        {/* Tarjeta de Registro de Tiempo */}
        <ActivityTimeCard
          hoursSpent={hoursSpent}
          onChangeHours={setHoursSpent}
          minutesSpent={minutesSpent}
          onChangeMinutes={setMinutesSpent}
          onSave={() => handleSaveAction('¡Tiempo guardado con éxito!')}
          isSubmitting={isSubmitting}
        />

        {/* Tarjeta de Registro de Dificultad */}
        <ActivityDifficultyCard
          selectedTag={selectedDifficultyTag}
          onSelectTag={setSelectedDifficultyTag}
          notes={difficultyNotes}
          onChangeNotes={setDifficultyNotes}
          onSave={() => handleSaveAction('¡Dificultad guardada con éxito!')}
          isSubmitting={isSubmitting}
        />

        {/* Botón principal de éxito con animación */}
        <TouchableOpacity
          style={styles.primaryActionButton}
          onPress={() => handleSaveAction('', true)}
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

      {/* Modal Extraído */}
      <ActivityMissModal
        visible={missModalVisible}
        onClose={() => setMissModalVisible(false)}
        reasons={missReasons}
        selectedReasonId={selectedReasonId}
        onSelectReason={setSelectedReasonId}
        details={missDetails}
        onChangeDetails={setMissDetails}
        onSubmit={handleSubmitMiss}
        isSubmitting={isSubmitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: { backgroundColor: '#FAF6F0' },
  container: { paddingVertical: 20, paddingBottom: 40, gap: 14 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  topBarTitle: { fontSize: 11, fontWeight: '800', color: '#627D98', letterSpacing: 0.8, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  mainActivityCard: { backgroundColor: '#174A62', borderRadius: 20, padding: 18, shadowColor: '#174A62', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, elevation: 4 },
  activityBadgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  badgeContainer: { backgroundColor: '#D8ECF8', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#174A62' },
  stageInfoText: { fontSize: 11, fontWeight: '700', color: '#94B8CD', letterSpacing: 0.5, flex: 1 },
  activityMainTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  activityDescText: { fontSize: 13, color: '#D8ECF8', lineHeight: 18 },
  metaInfoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4, marginVertical: -2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#627D98', fontWeight: '600' },
  primaryActionButton: { backgroundColor: '#174A62', borderRadius: 16, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#174A62', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, elevation: 3 },
  primaryActionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  outlineActionButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 16, height: 50, alignItems: 'center', justifyContent: 'center' },
  outlineActionText: { color: '#627D98', fontSize: 14, fontWeight: '700' },
  successText: { color: '#2F855A', marginBottom: 8, fontSize: 13, fontWeight: '700', textAlign: 'center' },
});