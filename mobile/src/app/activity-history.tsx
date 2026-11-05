import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { trackingApi } from '@/services/api/tracking';

type FilterType = 'all' | 'completed' | 'pending' | 'missed';

interface HistoryItem {
  id: number;
  stage_title: string;
  activity_title: string;
  date_str: string;
  duration_str?: string;
  status: 'completed' | 'pending' | 'missed';
  status_label: string;
}

const mockItems: HistoryItem[] = [
  {
    id: 1,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Introducción a React',
    date_str: '16 jun · 18:45',
    duration_str: '45 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 2,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Componentes de React',
    date_str: '14 jun · 19:10',
    duration_str: '1 h 10 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 3,
    stage_title: 'Etapa 2 · Desarrollo',
    activity_title: 'Maquetar la vista principal',
    date_str: '12 jun · 16:30',
    duration_str: '65 min',
    status: 'completed',
    status_label: 'Completada',
  },
  {
    id: 4,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Consumo de APIs',
    date_str: '10 jun · 18:00',
    status: 'missed',
    status_label: 'No completada',
  },
  {
    id: 5,
    stage_title: 'Etapa 1 · Aprendizaje',
    activity_title: 'Hooks',
    date_str: 'Programada · 21 jun',
    status: 'pending',
    status_label: 'Pendiente',
  },
];

function formatDuration(minutes?: number | null): string | undefined {
  if (!minutes || minutes <= 0) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0 && remainingMins > 0) return `${hours} h ${remainingMins} min`;
  if (hours > 0) return `${hours} h`;
  return `${remainingMins} min`;
}

function formatDateStr(dateStr?: string | null, recordedAt?: string | null): string {
  const dateToUse = recordedAt
    ? new Date(recordedAt)
    : dateStr
    ? new Date(`${dateStr}T12:00:00`)
    : new Date();

  if (isNaN(dateToUse.getTime())) return dateStr || 'Fecha reciente';
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const day = dateToUse.getDate();
  const month = months[dateToUse.getMonth()];
  const hours = String(dateToUse.getHours()).padStart(2, '0');
  const mins = String(dateToUse.getMinutes()).padStart(2, '0');
  return `${day} ${month} · ${hours}:${mins}`;
}

function mapBackendEventToHistoryItem(event: any, index: number): HistoryItem {
  const details = event.details || {};
  let status: 'completed' | 'pending' | 'missed' = 'pending';
  let status_label = 'Registrada';
  let duration_str: string | undefined = undefined;

  if (event.event_type === 'work_session') {
    status = 'completed';
    status_label = 'Sesión realizada';
    duration_str = formatDuration(details.minutes_spent);
  } else if (event.event_type === 'status_change') {
    if (details.new_status === 'completed') {
      status = 'completed';
      status_label = 'Completada';
    } else if (details.new_status === 'in_progress') {
      status = 'pending';
      status_label = 'En progreso';
    } else {
      status = 'pending';
      status_label = 'Pendiente';
    }
  } else if (event.event_type === 'schedule_miss') {
    status = 'missed';
    status_label = details.reason_name ? `No completada: ${details.reason_name}` : 'No completada';
  } else if (event.event_type === 'schedule_version') {
    status = 'pending';
    status_label = 'Reprogramada';
  }

  return {
    id: event.event_id ?? index + 1,
    stage_title: event.stage_id ? `Etapa ${event.stage_id}` : 'General',
    activity_title: event.activity_title || 'Actividad',
    date_str: formatDateStr(event.event_date, event.recorded_at),
    duration_str,
    status,
    status_label,
  };
}

export default function ActivityHistoryScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string }>();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(mockItems);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!token) {
        setHistoryItems(mockItems);
        return;
      }
      const rawData = await trackingApi.getActivityHistory(
        params.goalId && /^\d+$/.test(params.goalId) ? { goal_id: Number(params.goalId) } : undefined,
        token
      );
      if (Array.isArray(rawData) && rawData.length > 0) {
        const mapped = rawData.map(mapBackendEventToHistoryItem);
        setHistoryItems(mapped);
      } else {
        setHistoryItems(mockItems);
      }
    } catch {
      setHistoryItems(mockItems);
    } finally {
      setIsLoading(false);
    }
  }, [token, params.goalId]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const stats = useMemo(() => {
    let completedCount = 0;
    let totalMinutes = 0;
    let uncompletedCount = 0;

    historyItems.forEach((item) => {
      if (item.status === 'completed') completedCount++;
      if (item.status === 'missed') uncompletedCount++;
      if (item.duration_str) {
        const matchH = /(\d+)\s*h/.exec(item.duration_str);
        const matchM = /(\d+)\s*min/.exec(item.duration_str);
        if (matchH) totalMinutes += parseInt(matchH[1], 10) * 60;
        if (matchM) totalMinutes += parseInt(matchM[1], 10);
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const hoursSpent =
      totalMinutes > 0
        ? (hours > 0 ? `${hours} h ${mins > 0 ? `${mins} m` : ''}`.trim() : `${mins} min`)
        : '3 h';

    return {
      completedCount: completedCount || 3,
      hoursSpent,
      uncompletedCount: uncompletedCount || 1,
    };
  }, [historyItems]);

  const filteredItems = historyItems.filter((item) => {
    if (filter === 'completed') return item.status === 'completed';
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'missed') return item.status === 'missed';
    return true;
  });

  return (
    <Screen style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>SEGUIMIENTO</Text>
          <BrandHeader />
        </View>

        <Text style={styles.categorySubLabel}>TU RECORRIDO</Text>
        <Text style={styles.mainTitle}>Historial de actividades</Text>
        <Text style={styles.descriptionText}>
          Consulta lo que has realizado y cómo has avanzado.
        </Text>

        <View style={styles.statsBanner}>
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.completedCount}</Text>
            <Text style={styles.statLabel}>completadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.hoursSpent}</Text>
            <Text style={styles.statLabel}>dedicadas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text style={styles.statNumber}>{stats.uncompletedCount}</Text>
            <Text style={styles.statLabel}>sin completar</Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Todas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'completed' && styles.filterPillActive]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>Completada</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'pending' && styles.filterPillActive]}
            onPress={() => setFilter('pending')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Pendiente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filter === 'missed' && styles.filterPillActive]}
            onPress={() => setFilter('missed')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === 'missed' && styles.filterTextActive]}>No completada</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#174A62" style={{ marginVertical: 30 }} />
        ) : (
          <View style={styles.timelineList}>
            {filteredItems.map((item, index) => {
              const isLast = index === filteredItems.length - 1;
              return (
                <View key={`${item.id}-${index}`} style={styles.timelineCardWrapper}>
                  {!isLast && <View style={styles.timelineConnectorLine} />}
                  <View style={styles.cardItem}>
                    <View style={styles.statusIconContainer}>
                      {item.status === 'completed' && (
                        <View style={[styles.iconCircle, styles.bgSuccess]}>
                          <Feather name="check" size={14} color="#FFFFFF" />
                        </View>
                      )}
                      {item.status === 'missed' && (
                        <View style={[styles.iconCircle, styles.bgMissed]}>
                          <Text style={styles.exclamationText}>!</Text>
                        </View>
                      )}
                      {item.status === 'pending' && (
                        <View style={[styles.iconCircle, styles.bgPending]}>
                          <View style={styles.innerPendingDot} />
                        </View>
                      )}
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.stageTitleText}>{item.stage_title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            item.status === 'completed' && styles.badgeSuccess,
                            item.status === 'missed' && styles.badgeMissed,
                            item.status === 'pending' && styles.badgePending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              item.status === 'completed' && styles.badgeSuccessText,
                              item.status === 'missed' && styles.badgeMissedText,
                              item.status === 'pending' && styles.badgePendingText,
                            ]}
                          >
                            {item.status_label}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.activityTitle}>{item.activity_title}</Text>

                      <View style={styles.metaRow}>
                        <Text style={styles.dateText}>{item.date_str}</Text>
                        {item.duration_str && (
                          <View style={styles.durationTag}>
                            <Feather name="clock" size={12} color="#627D98" style={{ marginRight: 4 }} />
                            <Text style={styles.durationText}>{item.duration_str}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.bottomNavButton}
          onPress={() =>
            router.push({
              pathname: '/progress-analytics',
              params: { goalId: params.goalId ? String(params.goalId) : '' },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.bottomNavButtonText}>Ver progreso y estadísticas</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: { backgroundColor: '#FDFBF7' },
  container: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: '#E4E7EB', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  topBarTitle: { fontSize: 11, fontWeight: '700', color: '#627D98', letterSpacing: 0.5 },
  categorySubLabel: { fontSize: 11, fontWeight: '700', color: '#174A62', letterSpacing: 0.5, marginBottom: 4 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#0F2C40', marginBottom: 6 },
  descriptionText: { fontSize: 13, color: '#627D98', marginBottom: 20 },
  statsBanner: { backgroundColor: '#174A62', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 20 },
  statCol: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  statLabel: { fontSize: 10, color: '#9FB3C8' },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255, 255, 255, 0.15)' },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: '#E4E7EB', backgroundColor: '#FFFFFF' },
  filterPillActive: { backgroundColor: '#174A62', borderColor: '#174A62' },
  filterText: { fontSize: 12, color: '#627D98' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '600' },
  timelineList: { marginBottom: 24 },
  timelineCardWrapper: { position: 'relative', marginBottom: 12 },
  timelineConnectorLine: { position: 'absolute', left: 27, top: 36, bottom: -20, width: 2, backgroundColor: '#E4E7EB', zIndex: 0 },
  cardItem: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#E4E7EB', alignItems: 'center', zIndex: 1 },
  statusIconContainer: { marginRight: 12 },
  iconCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bgSuccess: { backgroundColor: '#38A169' },
  bgMissed: { backgroundColor: '#DD6B20' },
  bgPending: { backgroundColor: '#A0AEC0' },
  exclamationText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  innerPendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  cardContent: { flex: 1 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  stageTitleText: { fontSize: 10, fontWeight: '600', color: '#627D98' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeSuccess: { backgroundColor: '#E6FFFA' },
  badgeMissed: { backgroundColor: '#FEEBC8' },
  badgePending: { backgroundColor: '#EDF2F7' },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  badgeSuccessText: { color: '#234E52' },
  badgeMissedText: { color: '#7B341E' },
  badgePendingText: { color: '#4A5568' },
  activityTitle: { fontSize: 14, fontWeight: 'bold', color: '#0F2C40', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: 11, color: '#829AB1', marginRight: 12 },
  durationTag: { flexDirection: 'row', alignItems: 'center' },
  durationText: { fontSize: 11, color: '#627D98', fontWeight: '500' },
  bottomNavButton: { backgroundColor: '#174A62', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#174A62', shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  bottomNavButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
});
