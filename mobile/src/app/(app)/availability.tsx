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
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/contexts/auth-context';
import {
  getAvailability,
  getAvailabilityPreferences,
  getWeeklyAvailabilityMinutes,
  type AvailabilitySlot,
  type DayOfWeek,
} from '@/services/api/availability';
import { AvailabilityDaysCard } from '@/components/features/AvailabilityDaysCard';
import { AvailabilityTimeCard } from '@/components/features/AvailabilityTimeCard';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';

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
          {/* Header Superior con BackButton unificado */}
          <View style={styles.topRow}>
            <BackButton />

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

          {/* Componente 1: Días Disponibles */}
          <AvailabilityDaysCard
            selectedDays={selectedDays}
            onToggleDay={toggleDay}
          />

          {/* Componente 2: Franja Horaria y Sesión */}
          <AvailabilityTimeCard
            startHour={startHour}
            endHour={endHour}
            onIncrementStart={() => {
              setIsAvailabilityDirty(true);
              setFormError(null);
              setStartHour(Math.min(23, startHour + 1));
            }}
            onDecrementStart={() => {
              setIsAvailabilityDirty(true);
              setFormError(null);
              setStartHour(Math.max(0, startHour - 1));
            }}
            onIncrementEnd={() => {
              setIsAvailabilityDirty(true);
              setFormError(null);
              setEndHour(Math.min(23, endHour + 1));
            }}
            onDecrementEnd={() => {
              setIsAvailabilityDirty(true);
              setFormError(null);
              setEndHour(Math.max(0, endHour - 1));
            }}
            sessionTime={sessionTime}
            onSelectSessionTime={setSessionTime}
          />

          {/* Banner Resumen con la Carita Flow */}
          <View style={styles.summaryBanner}>
            <View style={styles.avatarContainer}>
              <FlowMascotAvatar />
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
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
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
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 14,
    gap: 12,
  },
  avatarContainer: {
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
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
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