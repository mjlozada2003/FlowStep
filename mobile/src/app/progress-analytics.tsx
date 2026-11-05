import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
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

export default function ProgressAnalyticsScreen() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Screen style={styles.screenBg}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Cabecera superior */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>SEGUIMIENTO</Text>
          <BrandHeader />
        </View>

        {/* Título de la vista */}
        <Text style={styles.categorySubLabel}>TU PROGRESO</Text>
        <Text style={styles.mainTitle}>Vas construyendo tu objetivo</Text>
        <Text style={styles.descriptionText}>
          Una mirada clara a todo lo que ya has avanzado.
        </Text>

        {/* Tarjeta 1: Resumen del Objetivo (HU-21) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.iconCircle}>
              <Feather name="target" size={16} color="#174A62" />
            </View>
            <View>
              <Text style={styles.sectionCategory}>MI OBJETIVO</Text>
              <Text style={styles.sectionTitle}>Crear una aplicación web</Text>
            </View>
          </View>

          <View style={styles.percentageRow}>
            <Text style={styles.bigPercentage}>25%</Text>
            <Text style={styles.percentageSub}>del objetivo completado</Text>
          </View>

          {/* Barra de progreso */}
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '25%' }]} />
          </View>

          <View style={styles.statsSummaryRow}>
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniNum}>3</Text>
              <Text style={styles.statMiniLabel}>completadas</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniNum}>8</Text>
              <Text style={styles.statMiniLabel}>pendientes</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.statMiniCol}>
              <Text style={styles.statMiniNum}>1</Text>
              <Text style={styles.statMiniLabel}>no completada</Text>
            </View>
          </View>
        </View>

        {/* Mensaje motivacional */}
        <View style={styles.motivationalCard}>
          <View style={styles.avatarMiniCircle}>
            <Feather name="smile" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.motivationalTitle}>¡Vas avanzando!</Text>
            <Text style={styles.motivationalDesc}>Cada actividad te acerca a tu objetivo.</Text>
          </View>
        </View>

        {/* Tarjeta 2: Ritmo de Avance (HU-22) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRowSpace}>
            <View>
              <Text style={styles.sectionCategory}>RITMO DE AVANCE</Text>
              <Text style={styles.sectionTitle}>Vas según lo planificado</Text>
            </View>
            <View style={styles.badgeInRhythm}>
              <Text style={styles.badgeInRhythmText}>EN RITMO</Text>
            </View>
          </View>

          <View style={styles.paceBarContainer}>
            <View style={styles.paceLabelRow}>
              <Text style={styles.paceLabelText}>Progreso actual</Text>
              <Text style={styles.paceValueText}>25%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '25%' }]} />
            </View>
          </View>

          <View style={styles.paceBarContainer}>
            <View style={styles.paceLabelRow}>
              <Text style={styles.paceLabelText}>Progreso esperado</Text>
              <Text style={styles.paceValueText}>23%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFillExpected, { width: '23%' }]} />
            </View>
          </View>

          <View style={styles.infoAlertBox}>
            <Text style={styles.infoAlertText}>
              Estás 2 puntos por encima del ritmo previsto para hoy. Mantén tu constancia.
            </Text>
          </View>
        </View>

        {/* Tarjeta 3: Progreso por Etapa (HU-24) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRowSpace}>
            <Text style={styles.sectionTitle}>Progreso por etapa</Text>
            <TouchableOpacity onPress={() => router.push('/activity-history' as any)}>
              <Text style={styles.linkText}>Ver historial</Text>
            </TouchableOpacity>
          </View>

          {/* Etapa 1 */}
          <View style={styles.stageProgressItem}>
            <View style={styles.stageProgressHeader}>
              <View style={styles.stageMiniBadge}><Text style={styles.stageMiniText}>01</Text></View>
              <Text style={styles.stageNameText}>Aprendizaje</Text>
              <Text style={styles.stageCountText}>2 de 4 actividades</Text>
              <Text style={styles.stagePercentText}>50%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '50%' }]} />
            </View>
          </View>

          {/* Etapa 2 */}
          <View style={styles.stageProgressItem}>
            <View style={styles.stageProgressHeader}>
              <View style={styles.stageMiniBadge}><Text style={styles.stageMiniText}>02</Text></View>
              <Text style={styles.stageNameText}>Desarrollo</Text>
              <Text style={styles.stageCountText}>1 de 5 actividades</Text>
              <Text style={styles.stagePercentText}>20%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '20%' }]} />
            </View>
          </View>

          {/* Etapa 3 */}
          <View style={styles.stageProgressItem}>
            <View style={styles.stageProgressHeader}>
              <View style={styles.stageMiniBadge}><Text style={styles.stageMiniText}>03</Text></View>
              <Text style={styles.stageNameText}>Pruebas</Text>
              <Text style={styles.stageCountText}>0 de 3 actividades</Text>
              <Text style={styles.stagePercentText}>0%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: '0%' }]} />
            </View>
          </View>
        </View>

        {/* Botón Inferior Principal */}
        <TouchableOpacity
          style={styles.bottomNavButton}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <Text style={styles.bottomNavButtonText}>Continuar avanzando</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    backgroundColor: '#FDFBF7',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  topBarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#627D98',
    letterSpacing: 0.5,
  },
  categorySubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0F2C40',
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 13,
    color: '#627D98',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E4E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderRowSpace: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2EEF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#174A62',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  bigPercentage: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0F2C40',
    marginRight: 8,
  },
  percentageSub: {
    fontSize: 13,
    color: '#627D98',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EDF2F7',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  progressBarFillExpected: {
    height: '100%',
    backgroundColor: '#9FB3C8',
    borderRadius: 4,
  },
  statsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F4F8',
    paddingTop: 14,
  },
  statMiniCol: {
    alignItems: 'center',
    flex: 1,
  },
  statMiniNum: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  statMiniLabel: {
    fontSize: 10,
    color: '#627D98',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E4E7EB',
  },
  motivationalCard: {
    backgroundColor: '#E2EEF1',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarMiniCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#174A62',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  motivationalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  motivationalDesc: {
    fontSize: 12,
    color: '#334E68',
  },
  badgeInRhythm: {
    backgroundColor: '#E6FFFA',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#38A169',
  },
  badgeInRhythmText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#234E52',
  },
  paceBarContainer: {
    marginBottom: 10,
  },
  paceLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  paceLabelText: {
    fontSize: 12,
    color: '#627D98',
  },
  paceValueText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0F2C40',
  },
  infoAlertBox: {
    backgroundColor: '#F0F4F8',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
  },
  infoAlertText: {
    fontSize: 12,
    color: '#334E68',
    lineHeight: 16,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#174A62',
  },
  stageProgressItem: {
    marginBottom: 12,
  },
  stageProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stageMiniBadge: {
    backgroundColor: '#E2EEF1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  stageMiniText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#174A62',
  },
  stageNameText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F2C40',
    flex: 1,
  },
  stageCountText: {
    fontSize: 11,
    color: '#627D98',
    marginRight: 8,
  },
  stagePercentText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#174A62',
  },
  bottomNavButton: {
    backgroundColor: '#174A62',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#174A62',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 8,
  },
  bottomNavButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
});