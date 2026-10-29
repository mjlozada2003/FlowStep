import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

const DAYS = [
  { key: 'L', label: 'Lunes' },
  { key: 'M', label: 'Martes' },
  { key: 'X', label: 'Miércoles' },
  { key: 'J', label: 'Jueves' },
  { key: 'V', label: 'Viernes' },
  { key: 'S', label: 'Sábado' },
  { key: 'D', label: 'Domingo' },
];

type Intensity = 'flexible' | 'equilibrado' | 'intenso';

export default function AvailabilityScreen() {
  const params = useLocalSearchParams();
  const [selectedDays, setSelectedDays] = useState<string[]>(['L', 'M', 'X', 'J', 'V']);
  const [intensity, setIntensity] = useState<Intensity>('equilibrado');

  const toggleDay = (key: string) => {
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    // Pasamos los datos hacia la pantalla de generación del plan (o schedule)
    router.push({
      pathname: '/schedule',
      params: {
        ...params,
        days: selectedDays.join(','),
        intensity,
      },
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
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#0F2C40" />
            </TouchableOpacity>
            <Text style={styles.stepIndicator}>PASO 2 DE 2</Text>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.badge}>TU RITMO IDEAL</Text>
            <Text style={styles.mainTitle}>¿Cuándo puedes avanzar?</Text>
            <Text style={styles.subtitle}>
              Selecciona los días y la intensidad para adaptar las actividades a tu rutina.
            </Text>
          </View>

          {/* Días disponibles (HU-35) */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>SELECCIONA TUS DÍAS</Text>
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
                    onPress={() => toggleDay(day.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[styles.dayText, isSelected && styles.dayTextSelected]}
                    >
                      {day.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Franja de trabajo / Ritmo */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>RITMO DE DEDICACIÓN</Text>
            <View style={styles.intensityRow}>
              {[
                { key: 'flexible', label: 'Flexible', desc: 'Poco a poco' },
                { key: 'equilibrado', label: 'Equilibrado', desc: 'Ritmo constante' },
                { key: 'intenso', label: 'Intenso', desc: 'Acelerado' },
              ].map((item) => {
                const isSelected = intensity === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.intensityOption,
                      isSelected && styles.intensityOptionSelected,
                    ]}
                    onPress={() => setIntensity(item.key as Intensity)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.intensityTitle,
                        isSelected && styles.intensityTitleSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.intensityDesc,
                        isSelected && styles.intensityDescSelected,
                      ]}
                    >
                      {item.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.infoBanner}>
            <Feather name="check-circle" size={18} color="#174A62" style={styles.bannerIcon} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Tu disponibilidad se guardará</Text>
              <Text style={styles.bannerSubtitle}>
                El plan distribuirá las tareas de forma inteligente sin sobrecargarte.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Generar mi plan adaptado</Text>
            <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
          </TouchableOpacity>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
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
  stepIndicator: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  titleSection: {
    marginBottom: 4,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#627D98',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  intensityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intensityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  intensityOptionSelected: {
    backgroundColor: '#D8ECF8',
    borderColor: '#174A62',
  },
  intensityTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 2,
  },
  intensityTitleSelected: {
    color: '#174A62',
  },
  intensityDesc: {
    fontSize: 10,
    color: '#627D98',
    textAlign: 'center',
  },
  intensityDescSelected: {
    color: '#174A62',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2C40',
  },
  bannerSubtitle: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  submitButton: {
    backgroundColor: '#174A62',
    height: 50,
    borderRadius: 18,
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
});