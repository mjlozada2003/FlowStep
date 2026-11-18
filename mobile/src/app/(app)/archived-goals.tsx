import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useAuth } from '@/contexts/auth-context';
import { deleteGoal, getGoalHistory, resumeGoal, type GoalHistoryItem } from '@/services/api/goals';

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return 'RECIENTE';
  try {
    const d = new Date(dateStr);
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

// Usa los minutos de sesiones registradas; si no hay, cae a los minutos
// estimados de las actividades completadas para no mostrar 0 con avance real.
function formatTimeText(item: GoalHistoryItem): string {
  const logged = Math.round(Number(item.minutes_spent || item.total_minutes_invested || 0));
  if (logged > 0) return `${formatDuration(logged)} registradas`;

  const estimated = Math.round(Number(item.completed_estimated_minutes || 0));
  if (estimated > 0) return `~${formatDuration(estimated)} estimadas`;

  return 'Sin tiempo registrado';
}

export default function ArchivedGoalsScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<'archived' | 'completed'>('archived');
  const [history, setHistory] = useState<GoalHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setIsLoading(false);
        return;
      }

      getGoalHistory(token)
        .then((data) => {
          if (active) {
            setHistory(data);
          }
        })
        .catch(() => {
          // Mantener lista vacía si falla la red
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });

      return () => {
        active = false;
      };
    }, [token]),
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home' as any);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [handleBack]),
  );

  const handleUnarchiveGoal = async (goalId: number, goalTitle: string) => {
    if (!token) return;
    const execute = async () => {
      try {
        await resumeGoal(goalId, token);
        const data = await getGoalHistory(token).catch(() => []);
        setHistory(data);
        if (Platform.OS === 'web') {
          window.alert('Objetivo reactivado correctamente.');
        } else {
          Alert.alert('Éxito', 'Objetivo reactivado correctamente.');
        }
      } catch (err: any) {
        const msg = err?.message || 'No se pudo reactivar el objetivo.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Deseas desarchivar y reactivar "${goalTitle}"? Volverá a estar activo en tu inicio y agenda.`)) {
        execute();
      }
    } else {
      Alert.alert(
        'Reactivar objetivo',
        `¿Deseas desarchivar y reactivar "${goalTitle}"? Volverá a estar activo en tu inicio y agenda.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reactivar', onPress: execute },
        ],
      );
    }
  };

  const handleDeleteGoal = async (goalId: number, goalTitle: string) => {
    if (!token) return;
    const execute = async () => {
      try {
        await deleteGoal(goalId, token);
        const data = await getGoalHistory(token).catch(() => []);
        setHistory(data);
        if (Platform.OS === 'web') {
          window.alert('Objetivo eliminado correctamente.');
        } else {
          Alert.alert('Éxito', 'Objetivo eliminado correctamente.');
        }
      } catch (err: any) {
        const msg = err?.message || 'No se pudo eliminar el objetivo.';
        if (Platform.OS === 'web') {
          window.alert(msg);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`¿Estás seguro de que deseas eliminar permanentemente "${goalTitle}"?`)) {
        execute();
      }
    } else {
      Alert.alert(
        'Eliminar objetivo',
        `¿Estás seguro de que deseas eliminar permanentemente "${goalTitle}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: execute },
        ],
      );
    }
  };

  // Pestañas excluyentes: un objetivo al 100 % siempre cuenta como completado,
  // aunque se haya archivado.
  const isFinished = (g: GoalHistoryItem) =>
    g.status === 'completed' || Number(g.progress_percentage || 0) >= 100;
  const completedGoals = history.filter(isFinished);
  const archivedGoals = history.filter((g) => g.status === 'archived' && !isFinished(g));

  // Si no hay archivados pero sí completados, mostrar la pestaña de completados por defecto
  useEffect(() => {
    if (archivedGoals.length === 0 && completedGoals.length > 0 && activeTab === 'archived') {
      setActiveTab('completed');
    }
  }, [archivedGoals.length, completedGoals.length]);

  const rawGoals = activeTab === 'archived' ? archivedGoals : completedGoals;

  const currentGoals = rawGoals.map((item) => {
    const isCompleted = activeTab === 'completed';
    const statusLabel = `${isCompleted ? 'COMPLETADO' : 'ARCHIVADO'} · ${formatDisplayDate(item.closed_at || item.status_changed_at || item.end_date)}`;
    const progress = Math.round(Number(item.progress_percentage || 0));
    const completedActivities = Number(item.completed_activities || 0);
    const totalActivities = Number(item.total_activities || 0);

    return {
      id: item.goal_id,
      statusLabel,
      title: item.title,
      progress,
      activitiesText: `${completedActivities} de ${totalActivities} actividades`,
      timeText: formatTimeText(item),
      actionText: isCompleted ? 'Consultar planificación' : 'Consultar progreso',
    };
  });

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con BackButton, etiqueta y Logo */}
        <View style={styles.topHeader}>
          <BackButton onPress={handleBack} />
          <Text style={styles.headerTag}>OBJETIVOS</Text>
          <BrandHeader showTagline={false} />
        </View>

        {/* Título y Descripción */}
        <View style={styles.titleSection}>
          <Text style={styles.sectionSubtitle}>TU RECORRIDO</Text>
          <Text style={styles.mainTitle}>Objetivos anteriores</Text>
          <Text style={styles.subtitleText}>
            Consulta objetivos archivados y el progreso que registraste.
          </Text>
        </View>

        {/* Selector de Pestañas (Tabs) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'archived' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('archived')}
          >
            <Text style={[styles.tabText, activeTab === 'archived' && styles.tabTextActive]}>
              Archivados ({archivedGoals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completados ({completedGoals.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Tarjetas */}
        <View style={styles.goalsList}>
          {currentGoals.map((item) => {
            const isCompleted = activeTab === 'completed';
            return (
              <View key={item.id} style={styles.goalCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.statusLabelText}>{item.statusLabel}</Text>
                  <Text style={[styles.percentText, isCompleted && styles.percentCompleted]}>
                    {item.progress}%
                  </Text>
                </View>

                <Text style={styles.goalTitle}>{item.title}</Text>

                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${item.progress}%` },
                      isCompleted && styles.progressBarFillCompleted,
                    ]}
                  />
                </View>

                <View style={styles.cardInfoRow}>
                  <Text style={styles.infoText}>{item.activitiesText}</Text>
                  <Text style={styles.infoText}>{item.timeText}</Text>
                </View>

                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionButton, { flex: 1 }]}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.push({
                        pathname: '/goal-plan',
                        params: { goalId: String(item.id), title: item.title },
                      })
                    }
                  >
                    <Text style={styles.actionButtonText}>{item.actionText}</Text>
                    <Feather name="arrow-right" size={16} color="#174A62" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>

                  {!isCompleted && (
                    <TouchableOpacity
                      style={styles.unarchiveButton}
                      activeOpacity={0.8}
                      onPress={() => handleUnarchiveGoal(item.id, item.title)}
                    >
                      <Feather name="rotate-ccw" size={14} color="#174A62" />
                      <Text style={styles.unarchiveButtonText}>Reactivar</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={styles.deleteCardButton}
                    activeOpacity={0.8}
                    onPress={() => handleDeleteGoal(item.id, item.title)}
                  >
                    <Feather name="trash-2" size={14} color="#C53030" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {isLoading && currentGoals.length === 0 ? (
            <ActivityIndicator size="small" color="#174A62" style={{ marginVertical: 20 }} />
          ) : currentGoals.length === 0 ? (
            <Text style={styles.emptyText}>No hay objetivos en esta sección.</Text>
          ) : null}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1.2,
  },
  titleSection: {
    gap: 2,
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: '#627D98',
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 4,
    marginTop: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#627D98',
  },
  tabTextActive: {
    color: '#0F2C40',
    fontWeight: '800',
  },
  goalsList: {
    gap: 12,
    marginTop: 4,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
  },
  percentText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  percentCompleted: {
    color: '#2F855A',
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  progressBarFillCompleted: {
    backgroundColor: '#319795',
  },
  cardInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#EBF5FB',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  unarchiveButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  unarchiveButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174A62',
  },
  deleteCardButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#174A62',
  },
  emptyText: {
    textAlign: 'center',
    color: '#627D98',
    fontSize: 13,
    paddingVertical: 20,
  },
});