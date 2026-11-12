import { Feather } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
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
  getActivitySchedules,
  getStageActivities,
  markActivityPending,
  rescheduleActivity,
  updateActivity,
} from '@/services/api/stages';

interface Activity {
  id: number;
  title: string;
  duration: number | null;
  type: string;
  date: string;
  rawDate?: string;
  rawTime?: string;
  completed: boolean;
}

async function loadStageActivities(stageId: number, token: string) {
  const serverActivities = await getStageActivities(stageId, token);
  let scheduleError: string | null = null;
  const activities = await Promise.all(
    serverActivities.map(async (activity) => {
      let schedules = activity.schedules ?? [];
      try {
        schedules = await getActivitySchedules(activity.activity_id, token);
      } catch {
        scheduleError =
          'No se pudo cargar el historial de horarios de algunas actividades.';
      }

      const sortedSchedules = [...schedules].sort(
        (left, right) => left.version_number - right.version_number,
      );
      const schedule = sortedSchedules[sortedSchedules.length - 1];
      const date = schedule
        ? `${schedule.scheduled_date}${schedule.start_time ? ` · ${schedule.start_time.slice(0, 5)}` : ''}`
        : '';

      return {
        id: activity.activity_id,
        title: activity.title,
        duration: activity.estimated_minutes,
        type: activity.type,
        date,
        rawDate: schedule?.scheduled_date,
        rawTime: schedule?.start_time ? schedule.start_time.slice(0, 5) : undefined,
        completed: activity.status === 'completed',
      };
    }),
  );
  return { activities, scheduleError };
}

function parseInitialDate(rawDate?: string, rawTime?: string): Date {
  const now = new Date();
  if (rawDate && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const [year, month, day] = rawDate.split('-').map(Number);
    now.setFullYear(year, month - 1, day);
  }
  if (rawTime && /^\d{2}:\d{2}/.test(rawTime)) {
    const [hours, minutes] = rawTime.split(':').map(Number);
    now.setHours(hours, minutes, 0, 0);
  }
  return now;
}

export default function StageDetailScreen() {
  const params = useLocalSearchParams<{
    stageId?: string;
    goalId?: string;
    title?: string;
  }>();
  const { token } = useAuth();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingError, setIsLoadingError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modales
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // Form states (Nueva actividad)
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Form states (Edición con DateTimePicker)
  const [editTitle, setEditTitle] = useState('');
  const [editDateValue, setEditDateValue] = useState<Date>(new Date());
  const [showEditPicker, setShowEditPicker] = useState(false);
  const [editPickerMode, setEditPickerMode] = useState<'date' | 'time'>('date');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyActivityId, setBusyActivityId] = useState<number | null>(null);

  const stageId =
    params.stageId && /^\d+$/.test(params.stageId) ? Number(params.stageId) : null;
  const goalId =
    params.goalId && /^\d+$/.test(params.goalId) ? Number(params.goalId) : null;
  const stageTitle = params.title || 'Etapa';
  const isStageLoading = isLoading && Boolean(stageId && token);
  const displayLoadingError =
    isLoadingError ??
    (!stageId || !token
      ? 'Inicia sesión y abre una etapa válida para consultar sus actividades.'
      : null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!stageId || !token) return undefined;

      loadStageActivities(stageId, token)
        .then(({ activities: serverActivities, scheduleError }) => {
          if (!active) return;
          setActivities(serverActivities);
          setIsLoadingError(scheduleError);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setActivities([]);
          setIsLoadingError(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las actividades.',
          );
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [stageId, token]),
  );

  const toggleActivity = async (id: number) => {
    const currentActivity = activities.find((a) => a.id === id);
    if (!currentActivity || !token || !stageId || busyActivityId !== null) return;

    const nextCompleted = !currentActivity.completed;
    setErrorMessage(null);
    setSuccessMessage(null);
    setBusyActivityId(id);
    try {
      if (nextCompleted) {
        await completeActivity(id, token);
      } else {
        await markActivityPending(id, token);
      }
      const refreshed = await loadStageActivities(stageId, token);
      setActivities(refreshed.activities);
      setIsLoadingError(refreshed.scheduleError);
      if (nextCompleted) {
        router.push({
          pathname: '/goal-success',
          params: {
            activityId: String(id),
            stageId: String(stageId),
            goalId: goalId ? String(goalId) : '',
            stageTitle,
          },
        });
      } else {
        setSuccessMessage('Actividad marcada como pendiente.');
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la actividad.',
      );
      try {
        const refreshed = await loadStageActivities(stageId, token);
        setActivities(refreshed.activities);
        setIsLoadingError(refreshed.scheduleError);
      } catch {
        // Mantener estado previo si falla la conciliación
      }
    } finally {
      setBusyActivityId(null);
    }
  };

  const handleAddActivity = async () => {
    if (!newTitle.trim() || !token || !stageId || isSubmitting) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await createStageActivity(stageId, token, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        type: 'practice',
        estimated_minutes: 30,
      });
      const refreshed = await loadStageActivities(stageId, token);
      setActivities(refreshed.activities);
      setIsLoadingError(refreshed.scheduleError);
      setNewTitle('');
      setNewDesc('');
      setAddModalVisible(false);
      setSuccessMessage('Actividad agregada y sincronizada.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'No se pudo guardar la actividad.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setEditTitle(activity.title);
    setEditDateValue(parseInitialDate(activity.rawDate, activity.rawTime));
    setShowEditPicker(false);
    setEditModalVisible(true);
  };

  const handlePickerChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowEditPicker(false);
    }
    if (selectedDate) {
      setEditDateValue(selectedDate);
    }
  };

  const handleSaveEdit = async () => {
    if (
      !selectedActivity ||
      !editTitle.trim() ||
      !token ||
      !stageId ||
      isSubmitting
    )
      return;

    const year = editDateValue.getFullYear();
    const month = String(editDateValue.getMonth() + 1).padStart(2, '0');
    const day = String(editDateValue.getDate()).padStart(2, '0');
    const scheduled_date = `${year}-${month}-${day}`;

    const hours = String(editDateValue.getHours()).padStart(2, '0');
    const minutes = String(editDateValue.getMinutes()).padStart(2, '0');
    const start_time = `${hours}:${minutes}`;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      if (editTitle.trim() !== selectedActivity.title) {
        await updateActivity(selectedActivity.id, token, {
          title: editTitle.trim(),
        });
      }

      await rescheduleActivity(selectedActivity.id, token, {
        scheduled_date,
        start_time,
      });

      const refreshed = await loadStageActivities(stageId, token);
      setActivities(refreshed.activities);
      setIsLoadingError(refreshed.scheduleError);
      setEditModalVisible(false);
      setSelectedActivity(null);
      setSuccessMessage('Cambios guardados y sincronizados.');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'No se pudieron guardar los cambios.',
      );
      try {
        const refreshed = await loadStageActivities(stageId, token);
        setActivities(refreshed.activities);
        setIsLoadingError(refreshed.scheduleError);
      } catch {
        // Mantener estado previo
      }
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
            <Text style={styles.headerStepTag}>ETAPA ACTIVA</Text>
            <BrandHeader showTagline={false} />
          </View>

          {/* Hero Header */}
          <View style={styles.headerHero}>
            <Text style={styles.stageBadge}>DETALLE DE ETAPA</Text>
            <Text style={styles.stageTitle}>{stageTitle}</Text>
            <Text style={styles.stageSubtitle}>
              Construye las bases que necesitas para empezar a avanzar con
              confianza.
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
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
          </View>

          {/* Banner Adaptado a Disponibilidad */}
          <TouchableOpacity
            style={styles.adaptedBanner}
            onPress={() =>
              router.push({
                pathname: '/schedule',
                params: { goalId: goalId ? String(goalId) : '' },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.bannerLeft}>
              <Feather name="calendar" size={18} color="#174A62" />
              <View style={styles.bannerTextFlex}>
                <Text style={styles.bannerTitle}>
                  Plan adaptado a tu disponibilidad
                </Text>
                <Text style={styles.bannerSub}>
                  Sesiones organizadas para evitar sobrecargas
                </Text>
              </View>
            </View>
            <Text style={styles.bannerAction}>Ver agenda</Text>
          </TouchableOpacity>

          {/* Banner Historial de Actividades */}
          <TouchableOpacity
            style={[
              styles.adaptedBanner,
              {
                marginTop: -6,
                backgroundColor: '#FFFFFF',
                borderColor: '#E2EEF1',
              },
            ]}
            onPress={() =>
              router.push({
                pathname: '/activity-history',
                params: { goalId: goalId ? String(goalId) : '' },
              })
            }
            activeOpacity={0.8}
          >
            <View style={styles.bannerLeft}>
              <Feather name="clock" size={18} color="#174A62" />
              <View style={styles.bannerTextFlex}>
                <Text style={styles.bannerTitle}>Historial de actividades</Text>
                <Text style={styles.bannerSub}>
                  Revisa sesiones completadas e incidencias
                </Text>
              </View>
            </View>
            <Text style={styles.bannerAction}>Ver historial</Text>
          </TouchableOpacity>

          {/* List Section */}
          <View style={styles.bodyContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tus actividades</Text>
              {isStageLoading ? (
                <ActivityIndicator size="small" color="#174A62" />
              ) : (
                <Text style={styles.counterHeader}>
                  {completedCount} de {totalCount} completadas
                </Text>
              )}
            </View>

            <View style={styles.activitiesList}>
              {displayLoadingError ? (
                <Text style={styles.errorText}>{displayLoadingError}</Text>
              ) : null}
              {successMessage ? (
                <Text style={styles.successText}>{successMessage}</Text>
              ) : null}
              {!isStageLoading &&
              activities.length === 0 &&
              !displayLoadingError ? (
                <Text style={styles.emptyText}>
                  Esta etapa aún no tiene actividades.
                </Text>
              ) : null}

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
                    disabled={busyActivityId !== null}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        activity.completed && styles.checkboxCompleted,
                      ]}
                    >
                      {busyActivityId === activity.id ? (
                        <ActivityIndicator size="small" color="#174A62" />
                      ) : activity.completed ? (
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
                      {activity.date ? (
                        <Text style={styles.activityDateText}>
                          <Feather name="calendar" size={11} color="#627D98" />{' '}
                          {activity.date}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>

                  <TouchableOpacity
                    style={styles.editIconButton}
                    onPress={() => openEditModal(activity)}
                    activeOpacity={0.7}
                  >
                    <Feather name="edit-2" size={16} color="#174A62" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Botón Agregar Actividad */}
            <TouchableOpacity
              style={styles.addActivityButton}
              onPress={() => setAddModalVisible(true)}
              activeOpacity={0.85}
            >
              <Feather name="plus" size={18} color="#FFFFFF" />
              <Text style={styles.addActivityText}>Nueva actividad</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal Agregar Actividad */}
      <AppModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        title="Nueva Actividad"
      >
        <View style={styles.modalBody}>
          <Text style={styles.inputLabel}>Título</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Ej. Configurar entorno de desarrollo"
            value={newTitle}
            onChangeText={setNewTitle}
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.inputLabel}>Descripción (opcional)</Text>
          <TextInput
            style={[styles.modalInput, styles.modalTextArea]}
            placeholder="Detalles sobre qué lograr en esta sesión"
            value={newDesc}
            onChangeText={setNewDesc}
            multiline
            placeholderTextColor="#94A3B8"
          />

          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={handleAddActivity}
            disabled={isSubmitting || !newTitle.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.modalPrimaryBtnText}>Guardar actividad</Text>
            )}
          </TouchableOpacity>
        </View>
      </AppModal>

      {/* Modal Editar Actividad con Selectores Nativos de Fecha y Hora */}
      <AppModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        title="Editar Actividad"
      >
        <View style={styles.modalBody}>
          <Text style={styles.inputLabel}>Título de la actividad</Text>
          <TextInput
            style={styles.modalInput}
            value={editTitle}
            onChangeText={setEditTitle}
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.inputLabel}>Reprogramar Fecha y Hora</Text>
          <View style={styles.pickerRow}>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setEditPickerMode('date');
                setShowEditPicker(true);
              }}
            >
              <Feather name="calendar" size={16} color="#174A62" />
              <Text style={styles.pickerButtonText}>
                {editDateValue.toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => {
                setEditPickerMode('time');
                setShowEditPicker(true);
              }}
            >
              <Feather name="clock" size={16} color="#174A62" />
              <Text style={styles.pickerButtonText}>
                {editDateValue.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {showEditPicker ? (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={editDateValue}
                mode={editPickerMode}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handlePickerChange}
                locale="es-ES"
              />
              {Platform.OS === 'ios' ? (
                <TouchableOpacity
                  style={styles.iosConfirmBtn}
                  onPress={() => setShowEditPicker(false)}
                >
                  <Text style={styles.iosConfirmText}>Confirmar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.modalPrimaryBtn}
            onPress={handleSaveEdit}
            disabled={isSubmitting || !editTitle.trim()}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.modalPrimaryBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </View>
      </AppModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerStepTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  headerHero: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 6px 14px rgba(23, 74, 98, 0.06)',
    elevation: 3,
  },
  stageBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 6,
  },
  stageSubtitle: {
    fontSize: 13,
    color: '#627D98',
    lineHeight: 18,
    marginBottom: 14,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#486581',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  adaptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8ECF8',
    gap: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerTextFlex: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  bannerSub: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  bannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  bodyContainer: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  counterHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#627D98',
  },
  activitiesList: {
    gap: 10,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  cardMainClickable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  activityInfo: {
    flex: 1,
    gap: 2,
  },
  activityBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C40',
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  activityDateText: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  editIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  addActivityButton: {
    backgroundColor: '#174A62',
    height: 48,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  addActivityText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#C53030',
    fontWeight: '600',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#2F855A',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalBody: {
    gap: 12,
    paddingTop: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174A62',
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F2C40',
  },
  modalTextArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EBF5FB',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 10,
  },
  pickerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  pickerContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iosConfirmBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#174A62',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  iosConfirmText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    backgroundColor: '#174A62',
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});