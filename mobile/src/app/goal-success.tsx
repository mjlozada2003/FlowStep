import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

export default function GoalSuccessScreen() {
  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.topRow}>
            <BrandHeader showTagline={false} />
          </View>

          <View style={styles.successIconContainer}>
            <View style={styles.successCircle}>
              <Feather name="check" size={32} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>PRIMER PASO COMPLETADO</Text>
            <Text style={styles.mainTitle}>¡Muy bien, lo has conseguido!</Text>
            <Text style={styles.subtitle}>
              Completaste <Text style={styles.boldText}>Introducción a React</Text>. Cada actividad te acerca un poco más a tu objetivo.
            </Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressHeaderRow}>
              <Text style={styles.progressCardTitle}>ETAPA 1 · APRENDIZAJE</Text>
              <Text style={styles.progressPercentText}>25%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View style={styles.progressBarFill} />
            </View>
            <Text style={styles.progressFooterText}>1 de 4 actividades completadas</Text>
          </View>

          <View style={styles.mascotCard}>
            <View style={styles.mascotAvatar}>
              <Feather name="smile" size={20} color="#174A62" />
            </View>
            <View style={styles.mascotTextContainer}>
              <Text style={styles.mascotTitle}>Flow dice:</Text>
              <Text style={styles.mascotSubtitle}>
                &ldquo;El progreso se construye paso a paso. Ya diste el primero.&rdquo;
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => router.push('/schedule')}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Ver mi progreso</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
    justifyContent: 'center',
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
    justifyContent: 'center',
    marginBottom: 4,
  },
  successIconContainer: {
    alignItems: 'center',
    marginVertical: 4,
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#38A169',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 8px 16px rgba(56, 161, 105, 0.25)',
    elevation: 4,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 6,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F2C40',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
    gap: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCardTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
  },
  progressPercentText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '25%',
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 4,
  },
  progressFooterText: {
    fontSize: 11,
    color: '#627D98',
  },
  mascotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  mascotAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mascotTextContainer: {
    flex: 1,
  },
  mascotTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
    marginBottom: 2,
  },
  mascotSubtitle: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 17,
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
    fontSize: 16,
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