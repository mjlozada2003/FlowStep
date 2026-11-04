import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import {
  completeActivity,
  createStageActivity,
  getStageActivities,
  markActivityPending,
  rescheduleActivity,
  updateActivity,
  type StageActivity,
} from '@/services/api/stages';
import { getGoalProgress, type GoalProgress } from '@/services/api/goals';

interface Activity {
  id: number;
  title: string;
  duration: string;
  type: string;
  date: string;
  completed: boolean;
}

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 1,
    title: 'Introducción a React',
    duration: '20 min',
    type: 'Lectura',
    date: 'Lun 16 · 18:00',
    completed: true,
  },
  {
    id: 2,
    title: 'Componentes de React',
    duration: '30 min',
    type: 'Práctica',
    date: 'Mié 18 · 18:00',
    completed: false,
  },
  {
    id: 3,
    title: 'Hooks',
    duration: '30 min',
    type: 'Práctica',
    date: 'Sáb 21 · 10:00',
    completed: false,
  },
  {
    id: 4,
    title: 'Consumo de APIs',
    duration: '35 min',
    type: 'Práctica',
    date: 'Lun 23 · 18:00',
    completed: false,
  },
];

export default function StageDetailScreen() {
  const params = useLocalSearchParams<{
    stageId?: string;
    goalId?: string;
    title?: string;
  }>();
  const { token } = useAuth();

  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  const [isLoading, setIsLoading] = useState(false);
  const [goalProgress, setGoalProgress] = useState<GoalProgress | null>(null);

  // Modales
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stageId = params.stageId && /^\d+$/.test(params.stageId) ? Number(params.stageId) : null;
  const goalId = params.goalId && /^\d+$/.test(params.goalId) ? Number(params.goalId) : null;
  const stageTitle = params.title || 'Aprendizaje';

  // 1. Cargar actividades desde el backend si stageId y token están disponibles
  useEffect(() => {
    if (!stageId || !token) return;

    setIsLoading(true);
    getStageActivities(stageId, token)
      .then((serverActivities) => {
        if (serverActivities && serverActivities.length > 0) {
          const mapped: Activity[] = serverActivities.map((act, idx) => ({
            id: act.activity_id,
            title: act.title,
            duration: act.estimated_minutes ? `${act.estimated_minutes} min` : '30 min',
            type: act.type || 'Práctica',
            date: act.date || `Sesión ${idx + 1}`,
            completed: act.status === 'completed',
          }));
          setActivities(mapped);
        }
      })
      .catch((err) => {
        console.warn('No se pudieron obtener las actividades del servidor, usando locales:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [stageId, token]);

  // 2. Cargar progreso general de la meta si goalId y token están disponibles (HU-03)
  useEffect(() => {
    if (!goalId || !token) return;

    getGoalProgress(goalId, token)
      .then(setGoalProgress)
      .catch((err) => {
        console.warn('No se pudo obtener el progreso de la meta:', err);
      });
  }, [goalId, token]);

  const toggleActivity = async (id: number) => {
    const currentActivity = activities.find((a) => a.id === id);
    if (!currentActivity) return;

    const nextCompleted = !currentActivity.completed;

    // Actualización optimista local
    setActivities((prev) =>
      prev.map((act) => (act.id === id ? { ...act, completed: nextCompleted } : act)),
    );

    // Si completó, redirigimos tras una pequeña animación
    if (nextCompleted) {
      setTimeout(() => {
        router.push('/goal-success');
      }, 400);
    }

    // Sincronizar con el backend
    if (token && id > 0) {
      try {
        if (nextCompleted) {
          await completeActivity(id, token);
        } else {
          await markActivityPending(id, token);
        }
      } catch (e) {
        console.error('Error sincronizando estado de actividad:', e);
      }
    }
  };

  const handleAddActivity = async () => {
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      let createdId = Date.now();

      if (token && stageId) {
        try {
          const res = await createStageActivity(stageId, token, {
            title: newTitle.trim(),
            description: newDesc.trim() || undefined,
            type: 'practice',
            estimated_minutes: 30,
          });
          createdId = res.activity_id;
        } catch (e) {
          console.warn('Error al guardar actividad en el servidor, agregando localmente:', e);
        }
      }

      const newAct: Activity = {
        id: createdId,
        title: newTitle.trim(),
        duration: '30 min',
        type: 'Práctica',
        date: 'Próxima sesión',
        completed: false,
      };

      setActivities([...activities, newAct]);
      setNewTitle('');
      setNewDesc('');
      setAddModalVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity || !editTitle.trim()) return;

    setIsSubmitting(true);
    try {
      if (token && selectedActivity.id > 0) {
        try {
          await updateActivity(selectedActivity.id, token, {
            title: editTitle.trim(),
          });

          // HU-14: Reprogramar actividad con trazabilidad si se ingresó fecha YYYY-MM-DD
          const dateMatch = editDate.match(/\d{4}-\d{2}-\d{2}/);
          if (dateMatch) {
            await rescheduleActivity(selectedActivity.id, token, {
              scheduled_date: dateMatch[0],
            });
          }
        } catch (e) {
          console.warn('Error al actualizar en el servidor, guardando localmente:', e);
        }
      }

      setActivities((prev) =>
        prev.map((act) =>
          act.id === selectedActivity.id
            ? { ...act, title: editTitle.trim(), date: editDate.trim() || act.date }
            : act,
        ),
      );
      setEditModalVisible(false);
      setSelectedActivity(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = activities.filter((a) => a.completed).length;
  const totalCount = activities.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#0F2C40" />
            </TouchableOpacity>
            <Text style={styles.headerStepTag}>ETAPA 1 DE 3</Text>
            <BrandHeader showTagline={false} />
          </View>

          {/* Hero Header */}
          <View style={styles.headerHero}>
            <Text style={styles.stageBadge}>ETAPA ACTIVA</Text>
            <Text style={styles.stageTitle}>{stageTitle}</Text>
            <Text style={styles.stageSubtitle}>
              Construye las bases que necesitas para empezar a avanzar con confianza.
            </Text>

            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Progreso de la etapa</Text>
              <Text style={styles.progressValue}>{progressPercent}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${progressPercent}%` },
                ]}
              />
            </View>
          </View>

          {/* Banner Adaptado a Disponibilidad */}
          <TouchableOpacity
            style={styles.adaptedBanner}
            onPress={() => router.push('/schedule')}
            activeOpacity={0.8}
          >
            <View style={styles.bannerLeft}>
              <Feather name="calendar" size={18} color="#174A62" />
              <View>
                <Text style={styles.bannerTitle}>Plan adaptado a tu disponibilidad</Text>
                <Text style={styles.bannerSub}>Sesiones organizadas para evitar sobrecargas</Text>
              </View>
            </View>
            <Text style={styles.bannerAction}>Ver agenda</Text>
          </TouchableOpacity>

          {/* List Section */}
          <View style={styles.bodyContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus actividades</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color="#174A62" />
              ) : (
                <Text style={styles.counterHeader}>
                  {completedCount} de {totalCount} completadas
                </Text>
              )}
            </View>

            <View style={styles.activitiesList}>
              {activities.map((activity, index) => (
                <View
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    activity.completed && styles.activityCardCompleted,
                  ]}
                >
                  <Pressable
                    style={styles.cardMainClickable}
                    onPress={() => toggleActivity(activity.id)}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        activity.completed && styles.checkboxCompleted,
                      ]}
                    >
                      {activity.completed ? (
                        <Feather name="check" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.activityBadge}>
                        ACTIVIDAD {index + 1}
                      </Text>
                      <Text
                        style={[
                          styles.activityTitle,
                          activity.completed && styles.activityTitleCompleted,
                        ]}
                      >
                        {activity.title}
                      </Text>
                      <View style={styles.dateRowMeta}>
                        <Feather name="calendar" size={12} color="#94A3B8" />
                        <Text style={styles.activityMeta}>{activity.date}</Text>
                      </View>
                    </View>
                  </Pressable>

                  {/* Único botón de Editar */}
                  <TouchableOpacity
                    style={styles.singleEditBtn}
                    onPress={() => {
                      setSelectedActivity(activity);
                      setEditTitle(activity.title);
                      setEditDate(activity.date);
                      setEditModalVisible(true);
                    }}
                  >
                    <Text style={styles.singleEditText}>Editar</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Tarjeta de Añadir Actividad Propia */}
              <TouchableOpacity
                style={styles.dashedAddCard}
                onPress={() => setAddModalVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.plusCircle}>
                  <Feather name="plus" size={16} color="#174A62" />
                </View>
                <View>
                  <Text style={styles.dashedAddTitle}>Añadir actividad propia</Text>
                  <Text style={styles.dashedAddSub}>Personaliza esta etapa con una tarea</Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.returnButton}
              onPress={() => router.push('/goal-plan')}
              activeOpacity={0.85}
            >
              <Text style={styles.returnButtonText}>Volver al plan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Reutilizable: Agregar Actividad (HU-13) */}
      <AppModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        category="NUEVA ACTIVIDAD"
        title="Añade una actividad"
        primaryButtonText={isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        onPrimaryAction={handleAddActivity}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>NOMBRE</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ej. Repasar conceptos"
            value={typeof newTitle === 'string' ? newTitle : ''}
            onChangeText={(text) => setNewTitle(text)}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>DESCRIPCIÓN</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="¿Qué necesitas hacer?"
            value={typeof newDesc === 'string' ? newDesc : ''}
            onChangeText={(text) => setNewDesc(text)}
            multiline
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.infoMiniBox}>
          <Feather name="calendar" size={14} color="#174A62" />
          <Text style={styles.infoMiniText}>
            Horario sincronizado con tu disponibilidad
          </Text>
        </View>
      </AppModal>

      {/* Modal Reutilizable: Editar Actividad Unificado (HU-11, HU-16) */}
      <AppModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        category="EDITAR ACTIVIDAD"
        title={selectedActivity?.title || ''}
        primaryButtonText={isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        onPrimaryAction={handleSaveEdit}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>NOMBRE</Text>
          <TextInput
            style={styles.textInput}
            value={typeof editTitle === 'string' ? editTitle : ''}
            onChangeText={(text) => setEditTitle(text)}
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>FECHA Y HORA</Text>
          <TextInput
            style={styles.textInput}
            value={typeof editDate === 'string' ? editDate : ''}
            onChangeText={(text) => setEditDate(text)}
            placeholder="Ej. Lun 16 · 18:00"
            placeholderTextColor="#94A3B8"
          />
          <View style={styles.infoMiniBox}>
            <Feather name="calendar" size={14} color="#174A62" />
            <Text style={styles.infoMiniText}>
              Horario sincronizado con tu disponibilidad
            </Text>
          </View>
        </View>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerStepTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1.2,
  },
  headerHero: {
    backgroundColor: '#D8ECF8',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 20,
    gap: 6,
  },
  stageBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  stageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  stageSubtitle: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  adaptedBanner: {
    marginHorizontal: 20,
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2C40',
  },
  bannerSub: {
    fontSize: 10,
    color: '#627D98',
    marginTop: 1,
  },
  bannerAction: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
  },
  bodyContainer: {
    paddingHorizontal: 20,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
  },
  counterHeader: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    justifyContent: 'space-between',
    gap: 10,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardMainClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  activityInfo: {
    flex: 1,
  },
  activityBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8FA3B8',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#627D98',
  },
  dateRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  singleEditBtn: {
    backgroundColor: '#FAF6F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  singleEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
  },
  dashedAddCard: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(23, 74, 98, 0.01)',
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dashedAddTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F2C40',
  },
  dashedAddSub: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 1,
  },
  returnButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  returnButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13,
    color: '#0F2C40',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  infoMiniBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 2,
  },
  infoMiniText: {
    fontSize: 11,
    color: '#174A62',
    fontWeight: '600',
  },
});
