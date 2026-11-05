import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
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
import {
  getAvailability,
  getAvailabilityPreferences,
  getWeeklyAvailabilityMinutes,
  type AvailabilitySlot,
  type DayOfWeek,
} from '@/services/api/availability';

const DAYS = [
  { key: 'L', label: 'Lun' },
  { key: 'M', label: 'Mar' },
  { key: 'X', label: 'Mié' },
  { key: 'J', label: 'Jue' },
  { key: 'V', label: 'Vie' },
  { key: 'S', label: 'Sáb' },
  { key: 'D', label: 'Dom' },
];

const SESSION_TIMES = ['30 min', '1 hora', '2 horas'];
const SESSION_MINUTES: Record<string, 30 | 60 | 120> = {
  '30 min': 30,
  '1 hora': 60,
  '2 horas': 120,
};
const DAY_MAP: Record<string, DayOfWeek> = {
  L: 'monday',
  M: 'tuesday',
  X: 'wednesday',
  J: 'thursday',
  V: 'friday',
  S: 'saturday',
  D: 'sunday',
};
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Lun',
  tuesday: 'Mar',
  wednesday: 'Mié',
  thursday: 'Jue',
  friday: 'Vie',
  saturday: 'Sáb',
  sunday: 'Dom',
};

export default function AvailabilityScreen() {
  const params = useLocalSearchParams<{
    title?: string;
    description?: string;
    priority?: string;
    targetDate?: string;
  }>();
  const { token } = useAuth();
  const [selectedDays, setSelectedDays] = useState<string[]>(['L', 'X', 'S']);
  const [startHour, setStartHour] = useState(18);
  const [endHour, setEndHour] = useState(20);
  const [sessionTime, setSessionTime] = useState('1 hora');
  const [savedSlots, setSavedSlots] = useState<AvailabilitySlot[]>([]);
  const [isAvailabilityDirty, setIsAvailabilityDirty] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const applyAvailability = useCallback((slots: AvailabilitySlot[]) => {
    setSavedSlots(slots);
    setIsAvailabilityDirty(false);
    if (slots.length > 0) {
      const slotDays = [...new Set(slots.map((slot) => slot.day_of_week))];
      setSelectedDays(
        DAYS.filter((day) => slotDays.includes(DAY_MAP[day.key])).map((day) => day.key),
      );
      const firstSlot = slots[0];
      setStartHour(Number(firstSlot.start_time.slice(0, 2)));
      setEndHour(Number(firstSlot.end_time.slice(0, 2)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!token) return undefined;

      Promise.all([getAvailability(token), getAvailabilityPreferences(token)])
        .then(([slots, preferences]) => {
          if (!active) return;
          applyAvailability(slots);
          setSessionTime(
            SESSION_TIMES.find(
              (label) => SESSION_MINUTES[label] === preferences.session_duration_minutes,
            ) ?? '1 hora',
          );
          setAvailabilityError(null);
        })
        .catch((error: unknown) => {
          if (!active) return;
          setAvailabilityError(
            error instanceof Error ? error.message : 'No se pudo consultar la disponibilidad.',
          );
        })
        .finally(() => {
          if (active) setIsLoadingAvailability(false);
        });

      return () => {
        active = false;
      };
    }, [applyAvailability, token]),
  );

  const handleRetryAvailability = () => {
    if (!token) return;
    setAvailabilityError(null);
    setIsLoadingAvailability(true);
    Promise.all([getAvailability(token), getAvailabilityPreferences(token)])
      .then(([slots, preferences]) => {
        applyAvailability(slots);
        setSessionTime(
          SESSION_TIMES.find(
            (label) => SESSION_MINUTES[label] === preferences.session_duration_minutes,
          ) ?? '1 hora',
        );
      })
      .catch((error: unknown) => {
        setAvailabilityError(
          error instanceof Error ? error.message : 'No se pudo consultar la disponibilidad.',
        );
      })
      .finally(() => setIsLoadingAvailability(false));
  };

  const toggleDay = (key: string) => {
    setIsAvailabilityDirty(true);
    setFormError(null);
    setSelectedDays((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  };

  const handleNext = () => {
    if (isLoadingAvailability || availabilityError || !token) return;
    if (selectedDays.length === 0) {
      setFormError('Selecciona al menos un día disponible.');
      return;
    }
    if (endHour <= startHour) {
      setFormError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    const formattedStartTime = `${String(startHour).padStart(2, '0')}:00`;
    const formattedEndTime = `${String(endHour).padStart(2, '0')}:00`;
    const availabilitiesPayload = !isAvailabilityDirty && savedSlots.length > 0
      ? savedSlots
      : selectedDays.map((day) => ({
          day_of_week: DAY_MAP[day],
          start_time: formattedStartTime,
          end_time: formattedEndTime,
        }));
    const weeklyHours = getWeeklyAvailabilityMinutes(availabilitiesPayload) / 60;

    router.push({
      pathname: '/generating-plan',
      params: {
        ...params,
        hours: String(Number(weeklyHours.toFixed(2))),
        availabilities: JSON.stringify(availabilitiesPayload),
        sessionDurationMinutes: String(SESSION_MINUTES[sessionTime]),
      },
    });
  };

  const weeklyHours = getWeeklyAvailabilityMinutes(
    !isAvailabilityDirty && savedSlots.length > 0
      ? savedSlots
      : selectedDays.map((day) => ({
          day_of_week: DAY_MAP[day],
          start_time: `${String(startHour).padStart(2, '0')}:00`,
          end_time: `${String(endHour).padStart(2, '0')}:00`,
        })),
  ) / 60;
  const savedSummary = savedSlots
    .map(
      (slot) =>
        `${DAY_LABELS[slot.day_of_week]} ${slot.start_time.slice(0, 5)}–${slot.end_time.slice(0, 5)}`,
    )
    .join(' · ');
  const isAvailabilityLoading = isLoadingAvailability && Boolean(token);
  const displayAvailabilityError =
    availabilityError ??
    (!token ? 'Inicia sesión para consultar y guardar tu disponibilidad.' : null);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          {/* Header Superior */}
          <View style={styles.topRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={24} color="#0F2C40" />
            </TouchableOpacity>

            <Text style={styles.headerTitleTag}>DISPONIBILIDAD</Text>

            <BrandHeader showTagline={false} />
          </View>

          {/* Título Principal */}
          <View style={styles.titleSection}>
            <Text style={styles.badge}>TU RITMO REAL</Text>
            <Text style={styles.mainTitle}>¿Cuándo puedes avanzar?</Text>
            <Text style={styles.subtitle}>
              Selecciona tus días y franja horaria para organizar tu semana.
            </Text>
          </View>

          {/* Card 1: Días Disponibles */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardLabel}>DÍAS DISPONIBLES</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{selectedDays.length} días</Text>
              </View>
            </View>

            <Text style={styles.cardTitle}>Selecciona tus días</Text>

            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const isSelected = selectedDays.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayCircle,
                      isSelected && styles.dayCircleSelected,
                    ]}
                    onPress={() => toggleDay(day.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day.key}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Card 2: Franja Horaria con Botones + / - */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>HORARIO HABITUAL</Text>
            <Text style={styles.cardTitle}>Franja de trabajo</Text>

            <View style={styles.timeControlRow}>
              {/* Hora Inicio */}
              <View style={styles.timeBox}>
                <Text style={styles.timeBoxLabel}>DESDE</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      setIsAvailabilityDirty(true);
                      setFormError(null);
                      setStartHour(Math.max(0, startHour - 1));
                    }}
                  >
                    <Feather name="minus" size={14} color="#174A62" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{String(startHour).padStart(2, '0')}:00</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      setIsAvailabilityDirty(true);
                      setFormError(null);
                      setStartHour(Math.min(23, startHour + 1));
                    }}
                  >
                    <Feather name="plus" size={14} color="#174A62" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.timeDash}>—</Text>

              {/* Hora Fin */}
              <View style={styles.timeBox}>
                <Text style={styles.timeBoxLabel}>HASTA</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      setIsAvailabilityDirty(true);
                      setFormError(null);
                      setEndHour(Math.max(0, endHour - 1));
                    }}
                  >
                    <Feather name="minus" size={14} color="#174A62" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{String(endHour).padStart(2, '0')}:00</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      setIsAvailabilityDirty(true);
                      setFormError(null);
                      setEndHour(Math.min(23, endHour + 1));
                    }}
                  >
                    <Feather name="plus" size={14} color="#174A62" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Tiempo por sesión */}
            <Text style={styles.sessionLabel}>Tiempo por sesión</Text>
            <View style={styles.sessionTimesRow}>
              {SESSION_TIMES.map((time) => {
                const isSelected = sessionTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.sessionBtn,
                      isSelected && styles.sessionBtnSelected,
                    ]}
                    onPress={() => setSessionTime(time)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.sessionBtnText,
                        isSelected && styles.sessionBtnTextSelected,
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Banner Resumen */}
          <View style={styles.summaryBanner}>
            <View style={styles.avatarCircle}>
              <Feather name="smile" size={20} color="#174A62" />
            </View>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryTitle}>Tu disponibilidad semanal</Text>
              <Text style={styles.summarySubtitle}>
                {!isAvailabilityDirty && savedSlots.length > 0
                  ? savedSummary
                  : `${selectedDays.length > 0 ? selectedDays.join(', ') : 'Sin días'} · ${String(startHour).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`}
                {' · '}{Number(weeklyHours.toFixed(2))} h/semana
              </Text>
            </View>
          </View>

          {isAvailabilityLoading ? (
            <ActivityIndicator size="small" color="#174A62" />
          ) : null}
          {displayAvailabilityError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{displayAvailabilityError}</Text>
              {token ? (
                <TouchableOpacity
                  onPress={handleRetryAvailability}
                  activeOpacity={0.8}
                >
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          {/* Botón Acción Principal */}
          <TouchableOpacity
            style={[styles.submitButton, (isAvailabilityLoading || Boolean(displayAvailabilityError) || !token) && styles.submitButtonDisabled]}
            onPress={handleNext}
            disabled={isAvailabilityLoading || Boolean(displayAvailabilityError) || !token}
            activeOpacity={0.85}
          >
            <Text style={styles.submitButtonText}>Crear mi plan</Text>
            <Feather
              name="arrow-right"
              size={20}
              color="#FFFFFF"
              style={styles.buttonArrow}
            />
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
  headerTitleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1.2,
  },
  titleSection: {
    marginBottom: 2,
  },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 26,
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
    borderRadius: 22,
    padding: 18,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 3,
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  badgeCount: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F2C40',
    marginTop: -2,
    marginBottom: 4,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
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
    fontWeight: '800',
    color: '#627D98',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  timeBox: {
    flex: 1,
    backgroundColor: '#FAF6F0',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  timeBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F2C40',
  },
  timeDash: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2C40',
  },
  sessionTimesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sessionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionBtnSelected: {
    backgroundColor: '#D8ECF8',
    borderColor: '#174A62',
  },
  sessionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#627D98',
  },
  sessionBtnTextSelected: {
    color: '#174A62',
    fontWeight: '800',
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  summarySubtitle: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
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
  errorBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FED7D7',
    padding: 12,
    gap: 8,
  },
  errorText: {
    color: '#C53030',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  retryText: {
    color: '#174A62',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
});