import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
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

interface Activity {
  id: number;
  title: string;
  duration: string;
  type: string;
  completed: boolean;
}

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 1,
    title: 'Introducción a React',
    duration: '20 min',
    type: 'Lectura',
    completed: true,
  },
  {
    id: 2,
    title: 'Componentes de React',
    duration: '30 min',
    type: 'Práctica',
    completed: false,
  },
  {
    id: 3,
    title: 'Hooks',
    duration: '30 min',
    type: 'Práctica',
    completed: false,
  },
  {
    id: 4,
    title: 'Consumo de APIs',
    duration: '35 min',
    type: 'Práctica',
    completed: false,
  },
];

export default function StageDetailScreen() {
  const params = useLocalSearchParams<{ stageId?: string; title?: string }>();
  const [activities, setActivities] = useState<Activity[]>(INITIAL_ACTIVITIES);
  
  // Estado para el Modal de Agregar Actividad (HU-13)
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDuration, setNewDuration] = useState('25 min');
  const [newType, setNewType] = useState('Práctica');

  const toggleActivity = (id: number) => {
    setActivities((prev) =>
      prev.map((act) =>
        act.id === id ? { ...act, completed: !act.completed } : act
      )
    );
  };

  const handleAddActivity = () => {
    if (!newTitle.trim()) return;

    const newAct: Activity = {
      id: activities.length + 1,
      title: newTitle.trim(),
      duration: newDuration,
      type: newType,
      completed: false,
    };

    setActivities([...activities, newAct]);
    setNewTitle('');
    setModalVisible(false);
  };

  const completedCount = activities.filter((a) => a.completed).length;
  const totalCount = activities.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#0F2C40" />
          </TouchableOpacity>
          <BrandHeader showTagline={false} />
        </View>

        <View style={styles.headerHero}>
          <Text style={styles.stageBadge}>ETAPA 01</Text>
          <Text style={styles.stageTitle}>Aprendizaje</Text>
          <Text style={styles.stageSubtitle}>
            Construye las bases que necesitas para empezar a desarrollar con confianza.
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Progreso de la etapa</Text>
            <Text style={styles.progressValue}>{progressPercent}%</Text>
          </View>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.bodyContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tus actividades</Text>
            <TouchableOpacity
              style={styles.addButtonMini}
              onPress={() => setModalVisible(true)}
            >
              <Feather name="plus" size={14} color="#174A62" />
              <Text style={styles.addButtonMiniText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.counterText}>
            {completedCount} de {totalCount} completadas (HU-11, 16)
          </Text>

          <View style={styles.activitiesList}>
            {activities.map((activity) => (
              <Pressable
                key={activity.id}
                style={[
                  styles.activityCard,
                  activity.completed && styles.activityCardCompleted,
                ]}
                onPress={() => toggleActivity(activity.id)}
              >
                <View
                  style={[
                    styles.checkbox,
                    activity.completed && styles.checkboxCompleted,
                  ]}
                >
                  {activity.completed ? (
                    <Feather name="check" size={14} color="#FFFFFF" />
                  ) : null}
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityBadge}>
                    ACTIVIDAD {activity.id}
                  </Text>
                  <Text
                    style={[
                      styles.activityTitle,
                      activity.completed && styles.activityTitleCompleted,
                    ]}
                  >
                    {activity.title}
                  </Text>
                  <Text style={styles.activityMeta}>
                    {activity.duration} · {activity.type}
                  </Text>
                </View>

                <Feather
                  name={activity.completed ? 'rotate-ccw' : 'check'}
                  size={18}
                  color="#94A3B8"
                />
              </Pressable>
            ))}
          </View>

          <TouchableOpacity
            style={styles.returnButton}
            onPress={() => router.push('/schedule')}
            activeOpacity={0.8}
          >
            <Text style={styles.returnButtonText}>Ver agenda adaptada</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal para Agregar Actividad Propia (HU-13) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar actividad propia</Text>
            <Text style={styles.modalSubtitle}>
              Personaliza tu plan añadiendo una nueva tarea a esta etapa.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Título de la actividad</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej. Repasar conceptos clave"
                value={newTitle}
                onChangeText={setNewTitle}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddActivity}
              >
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF6F0',
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
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
  headerHero: {
    backgroundColor: '#D8ECF8',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  stageBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  stageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F2C40',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  stageSubtitle: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F2C40',
  },
  addButtonMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D8ECF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  addButtonMiniText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#174A62',
  },
  counterText: {
    fontSize: 12,
    color: '#627D98',
    fontWeight: '600',
    marginBottom: 4,
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    boxShadow: '0px 4px 12px rgba(23, 74, 98, 0.04)',
    elevation: 2,
    gap: 14,
  },
  activityCardCompleted: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#174A62',
    borderColor: '#174A62',
  },
  activityInfo: {
    flex: 1,
  },
  activityBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8FA3B8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F2C40',
    marginBottom: 2,
  },
  activityTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#627D98',
  },
  activityMeta: {
    fontSize: 12,
    color: '#94A3B8',
  },
  returnButton: {
    marginTop: 12,
    backgroundColor: '#FAF6F0',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  returnButtonText: {
    color: '#174A62',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 44, 64, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    gap: 16,
    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.2)',
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F2C40',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#627D98',
    lineHeight: 18,
  },
  inputContainer: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F2C40',
  },
  textInput: {
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F2C40',
    backgroundColor: '#FFFFFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#627D98',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});