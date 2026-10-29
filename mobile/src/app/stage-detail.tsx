import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/auth-context';
import { ApiHttpError } from '@/services/api/client';
import { getStageActivities } from '@/services/api/stages';
import type { StageActivity } from '@/services/api/stages';

export default function StageDetailScreen() {
  const params = useLocalSearchParams<{ stageId?: string }>();
  const stageIdValue = Array.isArray(params.stageId)
    ? params.stageId[0]
    : params.stageId;
  const stageId =
    stageIdValue && /^\d+$/.test(stageIdValue) && Number(stageIdValue) > 0
      ? Number(stageIdValue)
      : null;
  const { token } = useAuth();
  const [activities, setActivities] = useState<StageActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!stageId) {
      setActivities([]);
      setErrorMessage('No se recibió un identificador válido para la etapa.');
      setIsLoading(false);
      return;
    }

    if (!token) {
      setActivities([]);
      setErrorMessage('Tu sesión no está disponible. Inicia sesión para consultar esta etapa.');
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);

    getStageActivities(stageId, token, controller.signal)
      .then(setActivities)
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setActivities([]);
        setErrorMessage(
          error instanceof ApiHttpError && error.status === 401
            ? 'Tu sesión expiró. Inicia sesión nuevamente para continuar.'
            : error instanceof Error
              ? error.message
              : 'No se pudieron cargar las actividades. Inténtalo nuevamente.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [stageId, token]);

  const completedCount = activities.filter((activity) => activity.status === 'completed').length;
  const totalCount = activities.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const stageBadge = stageId
    ? `ETAPA ${String(stageId).padStart(2, '0')}`
    : 'ETAPA';

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <BrandHeader showTagline={false} />
        </View>

        <View style={styles.headerHero}>
          <Text style={styles.stageBadge}>{stageBadge}</Text>
          <Text style={styles.stageTitle}>Actividades</Text>
          <Text style={styles.stageSubtitle}>
            Actividades asociadas a esta etapa de tu objetivo.
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

        <View style={styles.bodyContainer}>
          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color="#174A62" />
              <Text style={styles.stateText}>Cargando actividades...</Text>
            </View>
          ) : errorMessage ? (
            <View style={styles.stateCard}>
              <Feather name="alert-circle" size={26} color="#D97A7A" />
              <Text style={styles.emptyTitle}>No se pudieron mostrar las actividades</Text>
              <Text style={styles.emptySubtitle}>{errorMessage}</Text>
            </View>
          ) : totalCount > 0 ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Tus actividades</Text>
                <Text style={styles.counterText}>
                  {completedCount} de {totalCount} completadas
                </Text>
              </View>

              <View style={styles.activitiesList}>
                {activities.map((activity) => (
                  <View
                    key={activity.activity_id}
                    style={[
                      styles.activityCard,
                      activity.status === 'completed' && styles.activityCardCompleted,
                    ]}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        activity.status === 'completed' && styles.checkboxCompleted,
                      ]}
                    >
                      {activity.status === 'completed' ? (
                        <Feather name="check" size={14} color="#FFFFFF" />
                      ) : null}
                    </View>

                    <View style={styles.activityInfo}>
                      <Text style={styles.activityBadge}>
                        ACTIVIDAD {activity.activity_id}
                      </Text>
                      <Text
                        style={[
                          styles.activityTitle,
                          activity.status === 'completed' && styles.activityTitleCompleted,
                        ]}
                      >
                        {activity.title}
                      </Text>
                      {typeof activity.estimated_minutes === 'number' || activity.type ? (
                        <Text style={styles.activityMeta}>
                          {typeof activity.estimated_minutes === 'number'
                            ? `${activity.estimated_minutes} min`
                            : ''}
                          {typeof activity.estimated_minutes === 'number' && activity.type
                            ? ' · '
                            : ''}
                          {activity.type}
                        </Text>
                      ) : null}
                    </View>

                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Feather name="inbox" size={26} color="#174A62" />
              </View>
              <Text style={styles.emptyTitle}>Sin actividades</Text>
              <Text style={styles.emptySubtitle}>
                Esta etapa todavía no tiene actividades disponibles.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Volver al plan</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
    elevation: 2,
  },
  headerHero: {
    backgroundColor: '#D8ECF8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  stageBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stageSubtitle: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C40',
  },
  counterText: {
    fontSize: 12,
    color: '#627D98',
    fontWeight: '600',
  },
  activitiesList: {
    gap: 12,
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  stateText: {
    fontSize: 14,
    color: '#627D98',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
    gap: 14,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
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
    fontSize: 10,
    fontWeight: '800',
    color: '#8FA3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#627D98',
  },
  activityMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 19,
  },
  returnButton: {
    marginTop: 8,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#174A62',
    fontSize: 15,
    fontWeight: '700',
  },
});