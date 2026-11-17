import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BackButton } from '@/components/ui/BackButton';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';

export default function RecommendationScreen() {
  const params = useLocalSearchParams<{ goalId?: string; activityTitle?: string; goalTitle?: string }>();
  const goalTitle = params.goalTitle ?? 'Crear una aplicación web';
  const activityTitle = params.activityTitle ?? 'Consumo de APIs';

  const handleKeepCurrentPlan = () => {
    // Si decide mantener su plan actual sin cambios
    router.replace('/home' as any);
  };

  const handleCompareProposals = () => {
    // Navegar a la pantalla de alternativas de planificación (Pantalla 18)
    router.push({
      pathname: '/alternatives',
      params: { goalId: params.goalId ?? '' },
    } as any);
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton />
          <Text style={styles.headerTag}>RECOMENDACIÓN</Text>
          <View style={styles.brandContainer}>
            <Feather name="bar-chart-2" size={16} color="#174A62" />
            <Text style={styles.brandText}>FlowStep</Text>
          </View>
        </View>

        {/* Tarjeta Destacada de Mascota / Título */}
        <View style={styles.highlightCard}>
          <View style={styles.mascotContainer}>
            <FlowMascotAvatar />
          </View>
          <Text style={styles.highlightSubTag}>RECOMENDACIÓN DE FLOW</Text>
          <Text style={styles.highlightTitle}>Recupera el ritmo sin sobrecargarte</Text>
          <Text style={styles.highlightDesc}>
            Detectamos una oportunidad para ajustar tu plan de "{goalTitle}".
          </Text>
        </View>

        {/* Alerta de Retraso */}
        <View style={styles.alertCard}>
          <View style={styles.alertIconBox}>
            <Feather name="alert-circle" size={20} color="#C53030" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertCategory}>¿POR QUÉ TE LA SUGERIMOS?</Text>
            <Text style={styles.alertTitle}>Una actividad lleva 2 días de retraso</Text>
            <Text style={styles.alertDesc}>
              "{activityTitle}" no pudo completarse por falta de tiempo y registraste dificultad para comprender los componentes.
            </Text>
          </View>
        </View>

        {/* Mini Métricas del Estado */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>25%</Text>
            <Text style={styles.metricLabel}>progreso actual</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>3</Text>
            <Text style={styles.metricLabel}>completadas</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>4 h</Text>
            <Text style={styles.metricLabel}>disponibles</Text>
          </View>
        </View>

        {/* Caja de lo que busca solucionar */}
        <View style={styles.solutionCard}>
          <Text style={styles.solutionCategory}>QUÉ BUSCA SOLUCIONAR</Text>
          <Text style={styles.solutionTitle}>Dar más espacio al aprendizaje</Text>
          
          <View style={styles.checkList}>
            <View style={styles.checkRow}>
              <Feather name="check" size={14} color="#2F855A" />
              <Text style={styles.checkText}>Conservar las 3 actividades ya completadas.</Text>
            </View>
            <View style={styles.checkRow}>
              <Feather name="check" size={14} color="#2F855A" />
              <Text style={styles.checkText}>Añadir un recurso breve sobre componentes.</Text>
            </View>
            <View style={styles.checkRow}>
              <Feather name="check" size={14} color="#2F855A" />
              <Text style={styles.checkText}>Mover "{activityTitle}" al sábado.</Text>
            </View>
          </View>

          <View style={styles.benefitBox}>
            <Feather name="zap" size={14} color="#174A62" />
            <Text style={styles.benefitText}>
              Beneficio esperado: Recuperar el ritmo manteniendo sesiones de máximo 60 minutos.
            </Text>
          </View>
        </View>

        {/* Botón principal: Comparar propuestas */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.85}
          onPress={handleCompareProposals}
        >
          <Text style={styles.primaryButtonText}>Comparar propuestas</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Botón secundario: Mantener plan actual */}
        <TouchableOpacity
          style={styles.secondaryButton}
          activeOpacity={0.7}
          onPress={handleKeepCurrentPlan}
        >
          <Text style={styles.secondaryButtonText}>Mantener mi plan actual</Text>
        </TouchableOpacity>
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
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  highlightCard: {
    backgroundColor: '#EBF5FB',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
    gap: 6,
  },
  mascotContainer: {
    marginBottom: 4,
  },
  highlightSubTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  highlightTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C40',
    textAlign: 'center',
  },
  highlightDesc: {
    fontSize: 12,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 18,
  },
  alertCard: {
    backgroundColor: '#FDF2F2',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    borderWidth: 1,
    borderColor: '#F8D7CD',
  },
  alertIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  alertCategory: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C53030',
    letterSpacing: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#742A2A',
    marginVertical: 2,
  },
  alertDesc: {
    fontSize: 12,
    color: '#9B2C2C',
    lineHeight: 17,
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
  solutionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  solutionCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  solutionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  checkList: {
    gap: 8,
    marginVertical: 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkText: {
    fontSize: 12,
    color: '#334E68',
    fontWeight: '600',
  },
  benefitBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  benefitText: {
    fontSize: 11,
    color: '#174A62',
    flex: 1,
    fontWeight: '600',
    lineHeight: 16,
  },
  primaryButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#627D98',
    fontSize: 13,
    fontWeight: '700',
  },
});