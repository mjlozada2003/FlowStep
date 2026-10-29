import { Feather } from '@expo/vector-icons';
import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { useAuth } from '@/contexts/auth-context';
import { ApiHttpError } from '@/services/api/client';
import { createGoal } from '@/services/api/goals';

export default function CreateGoalScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isDescriptionFocused, setIsDescriptionFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    form?: string;
  }>({});
  const { token } = useAuth();

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

  const handleCreatePlan = async () => {
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const fieldErrors: typeof errors = {};

    if (!cleanTitle) {
      fieldErrors.title = 'Cuéntanos qué quieres conseguir.';
    }

    if (!cleanDescription) {
      fieldErrors.description = 'Describe un poco más tu objetivo.';
    }

    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    if (!token) {
      setErrors({
        form: 'Tu sesión no está disponible. Inicia sesión para registrar un objetivo.',
      });
      return;
    }

    const dueDate = targetDate
      ? [
          targetDate.getFullYear(),
          String(targetDate.getMonth() + 1).padStart(2, '0'),
          String(targetDate.getDate()).padStart(2, '0'),
        ].join('-')
      : undefined;

    setIsSubmitting(true);
    try {
      const goal = await createGoal(token, {
        title: cleanTitle,
        user_description: cleanDescription,
        ...(dueDate ? { due_date: dueDate } : {}),
      });

      router.push({
        pathname: '/goal-plan',
        params: {
          goalId: String(goal.goal_id),
          title: goal.title,
          targetDate: goal.due_date ?? '',
          stages: JSON.stringify(
            (goal.stages ?? []).map((stage) => ({
              stage_id: stage.stage_id,
              name: stage.name,
              activity_count: stage.activities?.length ?? 0,
            })),
          ),
        },
      });
    } catch (error) {
      const message =
        error instanceof ApiHttpError && error.status === 401
          ? 'Tu sesión expiró. Inicia sesión nuevamente para continuar.'
          : error instanceof Error
            ? error.message
            : 'No se pudo registrar el objetivo. Inténtalo nuevamente.';
      setErrors({ form: message });
    } finally {
      setIsSubmitting(false);
    }
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
              <Text style={styles.stepIndicator}>PASO 1 DE 1</Text>
            </View>

            <View style={styles.avatarContainer}>
              <View style={styles.avatarCircle}>
                <Feather name="smile" size={24} color="#174A62" />
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

            <View style={styles.card}>
              <Text style={styles.cardBadge}>MI OBJETIVO</Text>
              <TextInput
                placeholder="Crear una aplicación web"
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  if (value.trim()) {
                    setErrors((current) => ({
                      ...current,
                      title: undefined,
                      form: undefined,
                    }));
                  }
                }}
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
              {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardBadge}>DESCRIBE TU OBJETIVO</Text>
              <TextInput
                placeholder="¿Por qué es importante para ti y qué te gustaría lograr?"
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setErrors((current) => ({
                    ...current,
                    description: undefined,
                    form: undefined,
                  }));
                }}
                onFocus={() => setIsDescriptionFocused(true)}
                onBlur={() => setIsDescriptionFocused(false)}
                multiline
                style={[
                  styles.descriptionInput,
                  isDescriptionFocused && styles.goalInputFocused,
                ]}
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>
                Añade detalles para ayudar a personalizar tu plan.
              </Text>
              {errors.description ? (
                <Text style={styles.errorText}>{errors.description}</Text>
              ) : null}
            </View>

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
                  No te preocupes, podrás avanzar a tu ritmo.
                </Text>
              </View>
            </View>

            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleCreatePlan}
              activeOpacity={0.85}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Creando objetivo...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Crear mi plan</Text>
                  <Feather name="arrow-right" size={20} color="#FFFFFF" style={styles.buttonArrow} />
                </>
              )}
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
    justifyContent: 'center',
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
    marginVertical: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D8ECF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    alignItems: 'center',
    textAlign: 'center',
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
    fontSize: 14,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px 8px 16px rgba(23, 74, 98, 0.08)',
    elevation: 4,
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  goalInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F2C40',
    minHeight: 60,
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
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  descriptionInput: {
    minHeight: 88,
    fontSize: 15,
    lineHeight: 22,
    color: '#0F2C40',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web'
      ? ({
          outlineStyle: 'none',
          outlineWidth: 0,
          outlineColor: 'transparent',
        } as any)
      : {}),
  },
  errorText: {
    fontSize: 12,
    color: '#D97A7A',
    marginTop: 6,
  },
  formError: {
    fontSize: 13,
    color: '#D97A7A',
    textAlign: 'center',
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
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    height: 52,
  },
  dateIcon: {
    marginRight: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
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
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iosDoneBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#D8ECF8',
    borderRadius: 12,
  },
  iosDoneText: {
    color: '#174A62',
    fontWeight: '700',
    fontSize: 13,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  bannerSubtitle: {
    fontSize: 12,
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  buttonArrow: {
    marginLeft: 8,
  },
});