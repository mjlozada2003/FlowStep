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
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import { trackingApi } from '@/services/api/tracking';
import {
  HistoryItem,
  mockItems,
  mapBackendEventToHistoryItem,
} from '@/services/tracking-helpers';
import { HistoryStatsBanner } from '@/components/features/HistoryStatsBanner';
import { HistoryTimelineCard } from '@/components/features/HistoryTimelineCard';

type FilterType = 'all' | 'completed' | 'pending' | 'missed';

export default function ActivityHistoryScreen() {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ goalId?: string }>();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!token) {
        setHistoryItems([]);
        return;
      }
      const rawData = await trackingApi.getActivityHistory(
        params.goalId && /^\d+$/.test(params.goalId)
          ? { goal_id: Number(params.goalId) }
          : undefined,
        token,
      );
      if (Array.isArray(rawData)) {
        const mapped = rawData.map(mapBackendEventToHistoryItem);
        setHistoryItems(mapped);
      } else {
        setHistoryItems([]);
      }
    } catch {
      // En caso de fallo de red puntual, conservar estado anterior o mock de respaldo
      setHistoryItems((prev) => (prev.length > 0 ? prev : mockItems));
    } finally {
      setIsLoading(false);
    }
  }, [token, params.goalId]);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory]),
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
        : '0 min';

    return {
      completedCount,
      hoursSpent,
      uncompletedCount,
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <BackButton />
          <Text style={styles.topBarTitle} numberOfLines={1}>
            SEGUIMIENTO
          </Text>
          <BrandHeader />
        </View>

        <Text style={styles.categorySubLabel}>TU RECORRIDO</Text>
        <Text style={styles.mainTitle}>Historial de actividades</Text>
        <Text style={styles.descriptionText}>
          Consulta lo que has realizado y cómo has avanzado.
        </Text>

        <HistoryStatsBanner
          completedCount={stats.completedCount}
          hoursSpent={stats.hoursSpent}
          uncompletedCount={stats.uncompletedCount}
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.filterText, filter === 'all' && styles.filterTextActive]}
            >
              Todas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filter === 'completed' && styles.filterPillActive,
            ]}
            onPress={() => setFilter('completed')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'completed' && styles.filterTextActive,
              ]}
            >
              Completada
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filter === 'pending' && styles.filterPillActive,
            ]}
            onPress={() => setFilter('pending')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'pending' && styles.filterTextActive,
              ]}
            >
              Pendiente
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              filter === 'missed' && styles.filterPillActive,
            ]}
            onPress={() => setFilter('missed')}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterText,
                filter === 'missed' && styles.filterTextActive,
              ]}
            >
              No completada
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#174A62"
            style={{ marginVertical: 30 }}
          />
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No hay actividades registradas en el historial para este filtro.
            </Text>
          </View>
        ) : (
          <View style={styles.timelineList}>
            {filteredItems.map((item, index) => {
              const isLast = index === filteredItems.length - 1;
              return (
                <HistoryTimelineCard
                  key={`${item.id}-${index}`}
                  item={item}
                  isLast={isLast}
                />
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={styles.bottomNavButton}
          onPress={() =>
            router.navigate({
              pathname: '/progress-analytics',
              params: { goalId: params.goalId ? String(params.goalId) : '' },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.bottomNavButtonText}>Ver progreso y estadísticas</Text>
          <Feather
            name="arrow-right"
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: { backgroundColor: '#FAF6F0' },
  container: { paddingVertical: 20, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  topBarTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.8,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  categorySubLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  descriptionText: {
    fontSize: 13,
    color: '#627D98',
    marginBottom: 20,
    lineHeight: 18,
  },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 20, flexWrap: 'wrap' },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  filterPillActive: { backgroundColor: '#174A62', borderColor: '#174A62' },
  filterText: { fontSize: 12, color: '#627D98', fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF', fontWeight: '800' },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
  },
  timelineList: { marginBottom: 24 },
  bottomNavButton: {
    backgroundColor: '#174A62',
    borderRadius: 16,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#174A62',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  bottomNavButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
