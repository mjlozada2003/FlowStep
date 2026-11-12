import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { FlowMascotAvatar } from '@/components/features/FlowMascotAvatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function HomeScreen() {
  const { user } = useAuth();
  
  // TODO: Reemplazar este mock state por getUserGoals(token) cuando el backend esté integrado
  const [goals] = useState([
    {
      id: 1,
      title: 'Crear una aplicación web',
      priority: 'ALTA',
      status: 'En curso',
      progress: 25,
      completed: 3,
      total: 12,
    },
    {
      id: 2,
      title: 'Mejorar mi inglés',
      priority: 'MEDIA',
      status: 'En curso',
      progress: 62,
      completed: 3,
      total: 13,
    },
    {
      id: 3,
      title: 'Correr mi primera 10K',
      priority: 'BAJA',
      status: 'En pausa',
      progress: 40,
      completed: 6,
      total: 15,
    },
  ]);

  const displayName = user?.name ? user.name.split(' ')[0] : 'Lucía';
  const initials = user?.name 
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) 
    : 'LM';

  return (
    <Screen style={styles.screen}>
      {/* Blob superior orgánico tipo esquina */}
      <View style={styles.headerBlob} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con navegación al Perfil/Preferencias */}
        <View style={styles.topHeader}>
          <BrandHeader showTagline={false} />
          <TouchableOpacity 
            style={styles.profileBadge}
            activeOpacity={0.8}
            onPress={() => router.push('/preferences' as any)}
          >
            <Text style={styles.profileInitials}>{initials}</Text>
          </TouchableOpacity>
        </View>

        {/* Saludo, Título y Mascota */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>BUENOS DÍAS, {displayName.toUpperCase()}</Text>
            <Text style={styles.mainTitle}>Tus objetivos</Text>
            <Text style={styles.subtitleText}>Avanza a tu ritmo. Lo importante es seguir.</Text>
          </View>
          <View style={styles.mascotContainer}>
            <FlowMascotAvatar />
          </View>
        </View>

        {/* Alerta de Retraso (HU-25) */}
        <TouchableOpacity 
          style={styles.alertBanner} 
          activeOpacity={0.85}
          onPress={() => router.push('/progress-analytics')}
        >
          <View style={styles.alertIconBox}>
            <Feather name="alert-circle" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.alertTextContent}>
            <Text style={styles.alertTitle}>Una actividad necesita tu atención</Text>
            <Text style={styles.alertSubtitle}>"Consumo de APIs" lleva 2 días de retraso.</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#7B341E" />
        </TouchableOpacity>

        {/* Sección Objetivos Activos con botones */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionHeaderTitle}>Objetivos activos</Text>
            <Text style={styles.sectionCounter}>3 objetivos</Text>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
              <Feather name="sliders" size={12} color="#174A62" style={{ marginRight: 4 }} />
              <Text style={styles.filterBtnText}>Prioridad</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addGoalBtn}
              onPress={() => router.push('/create-goal')}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={14} color="#FFFFFF" />
              <Text style={styles.addGoalText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Tarjetas de Objetivos */}
        <View style={styles.goalsList}>
          {goals.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.goalCard}
              activeOpacity={0.9}
              onPress={() =>
                router.push({
                  pathname: '/goal-plan',
                  params: { goalId: String(item.id), title: item.title },
                })
              }
            >
              <View style={styles.goalCardTopRow}>
                <View style={[
                  styles.priorityBadge,
                  item.priority === 'ALTA' && styles.priorityHigh,
                  item.priority === 'MEDIA' && styles.priorityMedium,
                  item.priority === 'BAJA' && styles.priorityLow,
                ]}>
                  <Text style={[
                    styles.priorityText,
                    item.priority === 'ALTA' && styles.priorityHighText,
                  ]}>{item.priority}</Text>
                </View>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>

              <Text style={styles.goalTitle}>{item.title}</Text>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
              </View>

              <View style={styles.goalCardFooter}>
                <Text style={styles.goalFooterText}>{item.completed} de {item.total} actividades</Text>
                <View style={styles.goalFooterRight}>
                  <Text style={styles.progressPercentText}>{item.progress}%</Text>
                  <Feather name="arrow-right" size={16} color="#174A62" style={{ marginLeft: 6 }} />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Banner Resumen Semanal */}
        <TouchableOpacity
          style={styles.weeklySummaryCard}
          activeOpacity={0.9}
          onPress={() => router.push('/weekly-summary' as any)}
        >
          <View style={styles.weeklySummaryContent}>
            <View style={styles.weeklyIconBox}>
              <Feather name="bar-chart-2" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.weeklyTag}>RESUMEN SEMANAL</Text>
              <Text style={styles.weeklyTitle}>Esta semana completaste 4 actividades</Text>
              <Text style={styles.weeklySubtitle}>Consulta tu evolución y los próximos pasos</Text>
            </View>
            <Feather name="chevron-right" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Enlace a Objetivos Anteriores */}
        <TouchableOpacity
          style={styles.archivedLinkRow}
          onPress={() => router.push('/archived-goals' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.archivedLinkText}>Ver objetivos anteriores</Text>
          <Feather name="arrow-right" size={14} color="#174A62" style={{ marginLeft: 6 }} />
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
  headerBlob: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '85%',
    height: 180,
    backgroundColor: '#D8ECF8',
    borderBottomLeftRadius: 160,
    opacity: 0.55,
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
  profileBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#174A62',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  greetingText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 13,
    color: '#627D98',
  },
  mascotContainer: {
    marginLeft: 8,
    marginTop: 4,
  },
  alertBanner: {
    backgroundColor: '#FDEEE9',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8D7CD',
    gap: 12,
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7B341E',
  },
  alertSubtitle: {
    fontSize: 11,
    color: '#9C4221',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  sectionCounter: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#174A62',
  },
  addGoalBtn: {
    backgroundColor: Colors.light.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    elevation: 2,
  },
  addGoalText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  goalsList: {
    gap: 12,
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
    gap: 10,
  },
  goalCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EDF2F7',
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityMedium: {
    backgroundColor: '#FEF3C7',
  },
  priorityLow: {
    backgroundColor: '#E2E8F0',
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4A5568',
    letterSpacing: 0.5,
  },
  priorityHighText: {
    color: '#991B1B',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#627D98',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#EDF2F7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  goalCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  goalFooterText: {
    fontSize: 11,
    color: '#627D98',
  },
  goalFooterRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
  weeklySummaryCard: {
    backgroundColor: '#174A62',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  weeklySummaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  weeklyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
    marginBottom: 2,
  },
  weeklyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  weeklySubtitle: {
    fontSize: 11,
    color: '#D8ECF8',
  },
  archivedLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 10,
  },
  archivedLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#174A62',
  },
});