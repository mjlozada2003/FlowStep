
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Colors, Spacing } from '@/constants/theme';

type Priority = 'high' | 'medium' | 'low';

export default function CreateGoalScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const handleCreatePlan = () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      Alert.alert(
        'Falta tu objetivo',
        'Cuéntanos qué quieres conseguir para preparar tu plan.',
      );
      return;
    }

    router.push({
      pathname: '/goal-plan',
      params: {
        title: cleanTitle,
        description: description.trim(),
        priority,
      },
    });
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.title}>Crear un objetivo</Text>

            <Text style={styles.subtitle}>
              Cuéntanos qué quieres conseguir y FlowStep te ayudará a
              convertirlo en un plan.
            </Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Input
            label="¿Qué quieres lograr?"
            placeholder="Ej. Quiero aprender francés"
            value={title}
            onChangeText={setTitle}
            returnKeyType="next"
            maxLength={120}
          />

          <View style={styles.descriptionContainer}>
            <Text style={styles.label}>Cuéntanos un poco más</Text>

            <Input
              label=""
              placeholder="Describe qué quieres conseguir, por qué es importante para ti o qué te gustaría poder hacer al finalizar."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={styles.descriptionInput}
              maxLength={500}
            />
          </View>

          {/* Fecha */}
          <View style={styles.field}>
            <Text style={styles.label}>
              ¿Cuándo quieres lograrlo?
            </Text>

            <View style={styles.dateInfo}>
              <Text style={styles.selectIcon}>📅</Text>
              <Text style={styles.dateInfoText}>
                Puedes definir tu fecha más adelante.
              </Text>
            </View>
          </View>

          {/* Prioridad */}
          <View style={styles.field}>
            <Text style={styles.label}>Prioridad</Text>

            <View style={styles.priorityRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: priority === 'high' }}
                onPress={() => setPriority('high')}
                style={({ pressed }) => [
                  styles.priorityButton,
                  priority === 'high' && styles.prioritySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'high' && styles.prioritySelectedText,
                  ]}
                >
                  Alta
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: priority === 'medium' }}
                onPress={() => setPriority('medium')}
                style={({ pressed }) => [
                  styles.priorityButton,
                  priority === 'medium' && styles.prioritySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'medium' && styles.prioritySelectedText,
                  ]}
                >
                  Media
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: priority === 'low' }}
                onPress={() => setPriority('low')}
                style={({ pressed }) => [
                  styles.priorityButton,
                  priority === 'low' && styles.prioritySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === 'low' && styles.prioritySelectedText,
                  ]}
                >
                  Baja
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Explicación de FlowStep */}
        <Card style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>✦</Text>
          </View>

          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>
              FlowStep creará tu plan
            </Text>

            <Text style={styles.infoDescription}>
              Organizaremos tu objetivo en etapas y actividades para
              ayudarte a avanzar paso a paso.
            </Text>
          </View>
        </Card>

        {/* Acción principal */}
        <View style={styles.action}>
          <Button
            title="Crear mi plan"
            onPress={handleCreatePlan}
          />

          <Text style={styles.actionHint}>
            Podrás ajustar tu objetivo más adelante.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.light.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },

  backText: {
    fontSize: 32,
    lineHeight: 32,
    color: Colors.light.text,
    marginTop: -3,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.light.text,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 21,
    marginTop: Spacing.one,
  },

  form: {
    gap: Spacing.three,
  },

  descriptionContainer: {
    gap: Spacing.one,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
  },

  descriptionInput: {
    height: 120,
    paddingTop: Spacing.three,
  },

  field: {
    gap: Spacing.one,
  },

  dateInfo: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 16,
    backgroundColor: Colors.light.backgroundElement,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
  },

  selectIcon: {
    fontSize: 18,
    marginRight: Spacing.two,
  },

  dateInfoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.light.textSecondary,
  },

  priorityRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },

  priorityButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
  },

  prioritySelected: {
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: Colors.light.primary,
  },

  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },

  prioritySelectedText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.light.primary,
  },

  infoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.light.backgroundSelected,
    borderColor: 'transparent',
  },

  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.two,
  },

  infoIconText: {
    fontSize: 20,
    color: Colors.light.primary,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },

  infoDescription: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    lineHeight: 19,
    marginTop: Spacing.one,
  },

  action: {
    gap: Spacing.two,
  },

  actionHint: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.textSecondary,
  },

  pressed: {
    opacity: 0.75,
  },
});
