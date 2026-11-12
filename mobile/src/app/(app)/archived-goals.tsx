import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
import { getGoalHistory, type GoalHistoryItem } from '@/services/api/goals';

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

  const archivedGoals = history.filter((g) => g.status === 'archived');
  const completedGoals = history.filter((g) => g.status === 'completed');

  const rawGoals = activeTab === 'archived' ? archivedGoals : completedGoals;

  const currentGoals = rawGoals.map((item) => {
    const isCompleted = activeTab === 'completed';
    const statusLabel = `${isCompleted ? 'COMPLETADO' : 'ARCHIVADO'} · ${formatDisplayDate(item.status_changed_at || item.end_date)}`;
    const progress = Math.round(item.progress_percentage || 0);
    const completedActivities = item.completed_activities || 0;
    const totalActivities = item.total_activities || 0;
    const hours = Math.round((item.total_minutes_invested || 0) / 60);

    return {
      id: item.goal_id,
      statusLabel,
      title: item.title,
      progress,
      activitiesText: `${completedActivities} de ${totalActivities} actividades`,
      timeText: `${hours} h registradas`,
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
          <BackButton />
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
              Archivados
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabText, activeTab === 'completed' && styles.tabTextActive]}>
              Completados
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

                <TouchableOpacity
                  style={styles.actionButton}
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