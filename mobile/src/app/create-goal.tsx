import { Feather } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { BrandHeader } from '@/components/ui/BrandHeader';
import { Screen } from '@/components/ui/Screen';

type Priority = 'alta' | 'media' | 'baja';
type TimeCommitment = 'poco' | 'moderado' | 'intenso';

export default function CreateGoalScreen() {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('media');
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment>('moderado');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const formattedDate = targetDate
    ? targetDate.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const handleDateValueChange = (
    _event: DateTimePickerChangeEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleCreatePlan = () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      alert('Por favor, cuéntanos qué quieres conseguir.');
      return;
    }

    // Pasamos los parámetros hacia la pantalla de transición o plan adaptado (Sprint 2)
    router.push({
      pathname: '/schedule', // O hacia la pantalla de generación del plan
      params: {
        title: cleanTitle,
        priority,
        timeCommitment,
        targetDate: targetDate
          ? [
              targetDate.getFullYear(),
              String(targetDate.getMonth() + 1).padStart(2, '0'),
              String(targetDate.getDate()).padStart(2, '0'),
            ].join('-')
          : '',
      },
    });
  };

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            <View style={styles.topRow}>
              <BrandHeader showTagline={false} />
              <Text style={styles.stepIndicator}>PASO 1 DE 2</Text>
            </View>

            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={26} color="#174A62" />
              </View>
            </View>

            <View style={styles.titleSection}>
              <Text style={styles.badge}>CUÉNTAME TU META</Text>
              <Text style={styles.mainTitle}>¿Qué quieres conseguir?</Text>
              <Text style={styles.subtitle}>
                Puede ser algo que quieras aprender, crear o alcanzar. Yo lo
                convertiré en un camino claro.
              </Text>
            </View>

            {/* Tarjeta de Objetivo */}
            <View style={styles.card}>
              <Text style={styles.cardBadge}>MI OBJETIVO</Text>
              <TextInput
                placeholder="Crear una aplicación web"
                value={title}
                onChangeText={setTitle}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                multiline
                maxLength={120}
                style={[
                  styles.goalInput,
                  isInputFocused && styles.goalInputFocused,
                ]}
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>Escríbelo con tus propias palabras</Text>
            </View>

            {/* Selector de Prioridad (HU-06) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>PRIORIDAD DEL OBJETIVO</Text>
              <View style={styles.optionsRow}>
                {(['alta', 'media', 'baja'] as Priority[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionChip,
                      priority === p && styles.optionChipSelected,
                    ]}
                    onPress={() => setPriority(p)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        priority === p && styles.optionChipTextSelected,
                      ]}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Selector de Tiempo Disponible (HU-07) */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionLabel}>TIEMPO DISPONIBLE</Text>
              <View style={styles.optionsRow}>
                {[
                  { key: 'poco', label: '1-2 h / sem' },
                  { key: 'moderado', label: '3-4 h / sem' },
                  { key: 'intenso', label: '5+ h / sem' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[
                      styles.optionChip,
                      timeCommitment === item.key && styles.optionChipSelected,
                    ]}
                    onPress={() => setTimeCommitment(item.key as TimeCommitment)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        timeCommitment === item.key && styles.optionChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Fecha Límite */}
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>FECHA LÍMITE</Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.datePickerButton}
              >
                <Feather name="calendar" size={18} color="#8FA3B8" style={styles.dateIcon} />
                <Text
                  style={[
                    styles.dateText,
                    !targetDate && styles.datePlaceholder,
                  ]}
                >
                  {targetDate ? formattedDate : 'Seleccionar fecha'}
                </Text>
                <Feather name="chevron-right" size={18} color="#8FA3B8" />
              </Pressable>

              {targetDate ? (
                <TouchableOpacity
                  onPress={() => setTargetDate(null)}
                  style={styles.clearDateBtn}
                >
                  <Text style={styles.clearDateText}>Quitar fecha</Text>
                </TouchableOpacity>
              ) : null}

              {showDatePicker && Platform.OS === 'ios' ? (
                <View style={styles.iosPickerContainer}>
                  <DateTimePicker
                    value={targetDate ?? today}
                    mode="date"
                    display="spinner"
                    minimumDate={today}
                    onChange={handleDateValueChange}
                    locale="es-ES"
                  />
                  <TouchableOpacity
                    style={styles.iosDoneBtn}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.iosDoneText}>Listo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {showDatePicker && Platform.OS === 'android' ? (
                <DateTimePicker
                  value={targetDate ?? today}
                  mode="date"
                  display="default"
                  minimumDate={today}
                  onChange={handleDateValueChange}
                />
              ) : null}
            </View>

            <View style={styles.infoBanner}>
              <Feather name="star" size={18} color="#174A62" style={styles.bannerIcon} />
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>
                  Un objetivo claro es el primer paso.
                </Text>
                <Text style={styles.bannerSubtitle}>
                  Adaptaremos las actividades a tu disponibilidad real.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreatePlan}
              activeOpacity={0.85}
            >
              <Text style={styles.submitButtonText}>Siguiente: Disponibilidad</Text>
              <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  keyboardContainer: {
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
  stepIndicator: {
    fontSize: 11,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  avatarContainer: {
    alignItems: 'center',
    marginVertical: 2,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 2,
  },
  badge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
    textAlign: 'center',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
  },
  cardBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  goalInput: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F2C40',
    minHeight: 48,
    textAlignVertical: 'top',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
        } as any)
      : {}),
  },
  goalInputFocused: {
    color: '#174A62',
  },
  inputHint: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 6,
  },
  sectionBlock: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionChip: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionChipSelected: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  optionChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#627D98',
  },
  optionChipTextSelected: {
    color: '#FFFFFF',
  },
  fieldSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 48,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0F2C40',
  },
  datePlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  clearDateBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  clearDateText: {
    fontSize: 12,
    color: '#174A62',
    fontWeight: '700',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iosDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: '#D8ECF8',
    borderRadius: 10,
  },
  iosDoneText: {
    color: '#174A62',
    fontWeight: '700',
    fontSize: 12,
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
    marginTop: 2,
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