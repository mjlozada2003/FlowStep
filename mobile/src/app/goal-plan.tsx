import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

const mockStages = [
  {
    id: 1,
    number: '01',
    badge: 'LISTA PARA EMPEZAR',
    title: 'Etapa 1 — Aprendizaje',
    activitiesCount: '4 actividades',
    duration: '1 semana',
    status: 'active',
  },
  {
    id: 2,
    number: '02',
    badge: 'SIGUIENTE',
    title: 'Etapa 2 — Desarrollo',
    activitiesCount: '5 actividades',
    duration: '2 semanas',
    status: 'pending',
  },
  {
    id: 3,
    number: '03',
    badge: 'DESPUÉS',
    title: 'Etapa 3 — Pruebas',
    activitiesCount: '3 actividades',
    duration: '1 semana',
    status: 'pending',
  },
];

export default function GoalPlanScreen() {
  const params = useLocalSearchParams<{ title?: string; targetDate?: string }>();

  const goalTitle = params.title || 'Crear una aplicación web';
  const goalDate = params.targetDate ? `Fecha límite: ${params.targetDate}` : 'Fecha límite: 30 Jun 2025';

  const handleStagePress = (stageId: number) => {
    router.push({
      pathname: '/stage-detail',
      params: { stageId, title: goalTitle },
    });
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BrandHeader showTagline={false} />
            <View style={styles.avatarWrapper}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={22} color="#174A62" />
              </View>
              <Text style={styles.avatarLabel}>¡Vamos!</Text>
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>TU PLAN PERSONALIZADO</Text>
            <Text style={styles.mainTitle}>Tu camino está listo</Text>
          </View>

          <View style={styles.goalCard}>
            <View style={styles.goalIconCircle}>
              <Feather name="target" size={24} color="#174A62" />
            </View>
            <View style={styles.goalTextContainer}>
              <Text style={styles.goalCardBadge}>TU OBJETIVO</Text>
              <Text style={styles.goalCardTitle}>{goalTitle}</Text>
              <Text style={styles.goalCardDate}>{goalDate}</Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>3</Text> etapas
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>12</Text> actividades
            </Text>
            <Text style={styles.summaryDot}>•</Text>
            <Text style={styles.summaryText}>
              <Text style={styles.summaryBold}>4</Text> semanas
            </Text>
          </View>

          <View style={styles.timelineContainer}>
            <View style={styles.timelineLine} />

            {mockStages.map((stage) => {
              const isActive = stage.status === 'active';

              return (
                <Pressable
                  key={stage.id}
                  onPress={() => handleStagePress(stage.id)}
                  style={({ pressed }) => [
                    styles.stageCard,
                    isActive ? styles.stageCardActive : styles.stageCardPending,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.stageHeader}>
                    <View
                      style={[
                        styles.numberCircle,
                        isActive ? styles.numberCircleActive : styles.numberCirclePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.numberText,
                          isActive ? styles.numberTextActive : styles.numberTextPending,
                        ]}
                      >
                        {stage.number}
                      </Text>
                    </View>

                    <View style={styles.stageInfo}>
                      <Text
                        style={[
                          styles.stageBadge,
                          isActive ? styles.stageBadgeActive : styles.stageBadgePending,
                        ]}
                      >
                        {stage.badge}
                      </Text>
                      <Text style={styles.stageTitle}>{stage.title}</Text>
                      <Text style={styles.stageSubtitle}>
                        {stage.activitiesCount} • {stage.duration}
                      </Text>
                    </View>

                    <Feather
                      name={isActive ? 'arrow-right' : 'chevron-right'}
                      size={20}
                      color={isActive ? '#174A62' : '#8FA3B8'}
                    />
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.finishNode}>
              <View style={styles.finishCheckCircle}>
                <Feather name="check" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.finishText}>OBJETIVO ALCANZADO</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.floatingMapBtn}
        activeOpacity={0.85}
        onPress={() => {}}
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
  },
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    marginTop: 2,
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
  },
  goalCard: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.15)',
    elevation: 4,
  },
  goalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTextContainer: {
    flex: 1,
  },
  goalCardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#90C2DE',
    letterSpacing: 1,
    marginBottom: 2,
  },
  goalCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  goalCardDate: {
    fontSize: 12,
    color: '#D8ECF8',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  summaryText: {
    fontSize: 13,
    color: '#627D98',
  },
  summaryBold: {
    fontWeight: '800',
    color: '#0F2C40',
  },
  summaryDot: {
    color: '#94A3B8',
  },
  timelineContainer: {
    position: 'relative',
    gap: 16,
    paddingLeft: 12,
  },
  timelineLine: {
    position: 'absolute',
    left: 35,
    top: 24,
    bottom: 24,
    width: 2,
    backgroundColor: '#CBD5E1',
  },
  stageCard: {
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.05)',
    elevation: 2,
  },
  stageCardActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#174A62',
  },
  stageCardPending: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  numberCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberCircleActive: {
    backgroundColor: '#174A62',
  },
  numberCirclePending: {
    backgroundColor: '#E2E8F0',
  },
  numberText: {
    fontSize: 14,
    fontWeight: '800',
  },
  numberTextActive: {
    color: '#FFFFFF',
  },
  numberTextPending: {
    color: '#627D98',
  },
  stageInfo: {
    flex: 1,
  },
  stageBadge: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  stageBadgeActive: {
    color: '#174A62',
  },
  stageBadgePending: {
    color: '#94A3B8',
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  stageSubtitle: {
    fontSize: 12,
    color: '#627D98',
  },
  finishNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 12,
    marginTop: 4,
  },
  finishCheckCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8FA3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
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
  pressed: {
    opacity: 0.8,
  },
});