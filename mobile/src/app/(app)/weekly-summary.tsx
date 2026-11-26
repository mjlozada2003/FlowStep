import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';
import { useAuth } from '@/contexts/auth-context';
import { getWeeklySummary, type WeeklySummaryData } from '@/services/api/goals';

export default function WeeklySummaryScreen() {
  const { token } = useAuth();
  const [weeklyStats, setWeeklyStats] = useState<WeeklySummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) {
        setIsLoading(false);
        setErrorMessage('No se encontró una sesión activa.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      getWeeklySummary(token)
        .then((data) => {
          if (active) {
            setWeeklyStats(data ?? null);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setErrorMessage(
              error instanceof Error ? error.message : 'No se pudo cargar el resumen semanal.',
            );
          }
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

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton onPress={handleBack} />
          <Text style={styles.headerTag}>RESÚMENES</Text>
          <View style={{ width: 36 }} />
        </View>

        {isLoading ? (
          <View style={styles.centeredContainer}>
            <ActivityIndicator size="large" color="#174A62" />
            <Text style={styles.loadingText}>Cargando resumen semanal...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.centeredContainer}>
            <Feather name="alert-circle" size={36} color="#C53030" />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => {
                setIsLoading(true);
                setErrorMessage(null);
                getWeeklySummary(token!)
                  .then((data) => setWeeklyStats(data ?? null))
                  .catch((e) => setErrorMessage(e.message))
                  .finally(() => setIsLoading(false));
              }}
            >
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : weeklyStats ? (
          <>
            {/* Título y Período */}
            <View style={styles.titleSection}>
              <Text style={styles.sectionSubtitle}>TU SEMANA</Text>
              <Text style={styles.mainTitle}>Resumen de progreso</Text>
              <Text style={styles.periodText}>{weeklyStats.period}</Text>
            </View>

            {/* Tarjeta Destacada de Cumplimiento (Azul Oscuro) */}
            <View style={styles.highlightCard}>
              <View style={styles.highlightTextContent}>
                <Text style={styles.highlightTag}>{weeklyStats.tagline}</Text>
                <Text style={styles.highlightTitle}>{weeklyStats.title}</Text>
                <Text style={styles.highlightDesc}>{weeklyStats.description}</Text>
              </View>
              <View style={styles.circularProgressContainer}>
                <Text style={styles.circularPercent}>{weeklyStats.completionRate}%</Text>
                <Text style={styles.circularSub}>del plan</Text>
              </View>
            </View>

            {/* 3 Mini Tarjetas de Métricas de la Semana */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{weeklyStats.completedCount}</Text>
                <Text style={styles.metricLabel}>completadas</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{weeklyStats.pendingCount}</Text>
                <Text style={styles.metricLabel}>pendientes</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{weeklyStats.hoursSpent}</Text>
                <Text style={styles.metricLabel}>dedicadas</Text>
              </View>
            </View>

            {/* Gráfico de Evolución Semanal */}
            <View style={styles.cardContainer}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Evolución semanal</Text>
              </View>
              <Text style={styles.cardSubtitle}>Actividades completadas por día</Text>

              <View style={styles.chartContainer}>
                {weeklyStats.daysActivity.map((item, index) => (
                  <View key={index} style={styles.chartBarColumn}>
                    <View style={styles.chartBarTrack}>
                      <View 
                        style={[
                          styles.chartBarFill, 
                          { height: `${item.height}%`, opacity: item.active ? 1 : 0.3 }
                        ]} 
                      />
                    </View>
                    <Text style={styles.chartDayLabel}>{item.day}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Desglose Por Objetivo */}
            <View style={styles.cardContainer}>
              <Text style={styles.cardTitle}>Por objetivo</Text>
              <View style={styles.goalsList}>
                {weeklyStats.goalsBreakdown.map((goal, idx) => (
                  <View key={goal.id ?? idx} style={styles.goalBreakdownItem}>
                    <View style={styles.goalIndexBox}>
                      <Text style={styles.goalIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.goalItemTitle}>{goal.title}</Text>
                      <Text style={styles.goalItemDetail}>{goal.detail}</Text>
                    </View>
                    <Text style={styles.goalItemProgress}>{goal.progress}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Mensaje de la Mascota Flow */}
            <View style={styles.mascotBanner}>
              <FlowMascotAvatar />
              <View style={{ flex: 1 }}>
                <Text style={styles.mascotBannerText}>
                  Flow dice: <Text style={styles.mascotQuote}>&quot;{weeklyStats.mascotTip}&quot;</Text>
                </Text>
              </View>
            </View>

            {/* Botón de Estadísticas Completas */}
            <TouchableOpacity
              style={styles.fullStatsButton}
              activeOpacity={0.85}
              onPress={() => router.push('/progress-analytics' as any)}
            >
              <Text style={styles.fullStatsButtonText}>Ver estadísticas completas</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </>
        ) : (
          // HU-49: si el usuario desactivó el resumen semanal, el backend no envía datos.
          <View style={styles.centeredContainer}>
            <Feather name="bell-off" size={36} color="#627D98" />
            <Text style={styles.emptyTitle}>Resumen semanal desactivado</Text>
            <Text style={styles.emptyText}>
              Actívalo en Preferencias para ver tu progreso de la semana.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => router.navigate('/(tabs)/preferences' as any)}
            >
              <Text style={styles.retryButtonText}>Ir a Preferencias</Text>
            </TouchableOpacity>
          </View>
        )}
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
  centeredContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#627D98',
    fontWeight: '600',
  },
  errorText: {
    fontSize: 13,
    color: '#C53030',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#174A62',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  emptyText: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 19,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
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
  periodText: {
    fontSize: 12,
    color: '#627D98',
    marginTop: 2,
  },
  highlightCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  highlightTextContent: {
    flex: 1,
    gap: 4,
  },
  highlightTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  highlightDesc: {
    fontSize: 12,
    color: '#D8ECF8',
  },
  circularProgressContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#335E75',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  circularPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  circularSub: {
    fontSize: 9,
    color: '#9FB3C8',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    color: '#627D98',
    fontWeight: '600',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#627D98',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 16,
    paddingHorizontal: 8,
  },
  chartBarColumn: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  chartBarTrack: {
    width: 14,
    height: 80,
    backgroundColor: '#EDF2F7',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartBarFill: {
    width: '100%',
    backgroundColor: '#174A62',
    borderRadius: 7,
  },
  chartDayLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#627D98',
  },
  goalsList: {
    gap: 10,
    marginTop: 4,
  },
  goalBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  goalIndexBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalIndexText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  goalItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  goalItemDetail: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 1,
  },
  goalItemProgress: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2F855A',
  },
  mascotBanner: {
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  mascotBannerText: {
    fontSize: 12,
    color: '#174A62',
  },
  mascotQuote: {
    fontStyle: 'italic',
    fontWeight: '600',
  },
  fullStatsButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 2,
    marginTop: 4,
  },
  fullStatsButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});