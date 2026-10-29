import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

const SCHEDULE_ITEMS = [
  {
    id: 1,
    day: 'LUN',
    date: '16',
    time: '18:00 · 45 min',
    title: 'Introducción a React',
    stage: 'Etapa 1 · Aprendizaje',
    status: 'PRÓXIMA',
  },
  {
    id: 2,
    day: 'MIÉ',
    date: '18',
    time: '18:00 · 60 min',
    title: 'Componentes de React',
    stage: 'Etapa 1 · Aprendizaje',
    status: null,
  },
  {
    id: 3,
    day: 'SÁB',
    date: '21',
    time: '10:00 · 60 min',
    title: 'Hooks',
    stage: 'Etapa 1 · Aprendizaje',
    status: null,
  },
];

export default function ScheduleScreen() {
  const params = useLocalSearchParams();

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#0F2C40" />
            </TouchableOpacity>
            <Text style={styles.weekIndicator}>SEMANA 1</Text>
            <BrandHeader showTagline={false} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>AGENDA ADAPTADA</Text>
            <Text style={styles.mainTitle}>Tu semana, a tu ritmo</Text>
            <Text style={styles.subtitle}>
              Una vista adaptada de cómo se distribuyen las actividades en tus horarios disponibles.
            </Text>
          </View>

          {/* Tarjeta de métricas semanales */}
          <View style={styles.metricsCard}>
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>sesiones</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>2 h 45</Text>
              <Text style={styles.metricLabel}>planificadas</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricValue}>4 h</Text>
              <Text style={styles.metricLabel}>disponibles</Text>
            </View>
          </View>

          {/* Lista de actividades programadas */}
          <View style={styles.activitiesList}>
            {SCHEDULE_ITEMS.map((item) => {
              const isNext = item.status === 'PRÓXIMA';
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.activityCard,
                    isNext && styles.activityCardNext,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => router.push('/stage-detail')}
                >
                  <View style={styles.dateBox}>
                    <Text style={styles.dateBoxDay}>{item.day}</Text>
                    <Text style={styles.dateBoxNum}>{item.date}</Text>
                  </View>

                  <View style={styles.activityInfo}>
                    <View style={styles.activityHeaderRow}>
                      <Text style={styles.activityTime}>{item.time}</Text>
                      {item.status ? (
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusBadgeText}>{item.status}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.activityTitle}>{item.title}</Text>
                    <Text style={styles.activityStage}>{item.stage}</Text>
                  </View>

                  <Feather name="chevron-right" size={18} color="#94A3B8" />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.freeTimeCard}>
            <Text style={styles.freeTimeTitle}>1 h 15 min libres</Text>
            <Text style={styles.freeTimeSubtitle}>
              Tu semana conserva margen para avanzar sin sobrecarga.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => router.push('/stage-detail')}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Ver actividades de la etapa</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Botón flotante para ver el mapa/roadmap general */}
      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => router.push('/goal-plan')}
      >
        <Feather name="grid" size={18} color="#FFFFFF" />
        <Text style={styles.floatingMapText}>Mapa</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 90,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  weekIndicator: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  titleSection: {
    marginTop: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    lineHeight: 19,
  },
  metricsCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#90C2DE',
    fontWeight: '600',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
  },
  activityCardNext: {
    borderColor: '#174A62',
    borderWidth: 1.5,
  },
  dateBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateBoxDay: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  dateBoxNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  activityInfo: {
    flex: 1,
  },
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#137333',
    letterSpacing: 0.5,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityStage: {
    fontSize: 12,
    color: '#94A3B8',
  },
  freeTimeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
  },
  freeTimeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  freeTimeSubtitle: {
    fontSize: 12,
    color: '#627D98',
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 52,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    boxShadow: '0px 4px 8px rgba(23, 74, 98, 0.25)',
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonArrow: {
    marginLeft: 8,
  },
  floatingMapBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#174A62',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.3)',
    elevation: 5,
  },
  floatingMapText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});