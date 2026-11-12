import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { BrandHeader } from '@/components/ui/BrandHeader';
import { useAuth } from '@/contexts/auth-context';

export default function PreferencesScreen() {
  const { user, clearSession } = useAuth();

  // Estados locales para los switches de preferencias (HU-49)
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [delayAlertsEnabled, setDelayAlertsEnabled] = useState(true);
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(true);

  const displayName = user?.name ?? 'Lucía Martínez';
  const displayEmail = user?.email ?? 'lucia@gmail.com';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con BrandHeader y etiqueta PERFIL */}
        <View style={styles.topHeader}>
          <BrandHeader showTagline={false} />
          <Text style={styles.headerTag}>PERFIL</Text>
        </View>

        {/* Tarjeta Azul Oscura de Usuario */}
        <View style={styles.userCardDark}>
          <View style={styles.userAvatarBox}>
            <Text style={styles.userInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{displayEmail}</Text>
          </View>
        </View>

        {/* Sección PREFERENCIAS */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionCategory}>PREFERENCIAS</Text>
          <Text style={styles.sectionMainTitle}>Tu experiencia FlowStep</Text>

          <View style={styles.preferenceDivider} />

          {/* Opción 1: Recordatorios */}
          <View style={styles.preferenceItem}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.preferenceTitle}>Recordatorios de actividades</Text>
              <Text style={styles.preferenceSubtitle}>Recibe avisos antes de cada sesión</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={setRemindersEnabled}
              trackColor={{ false: '#CBD5E1', true: '#174A62' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Opción 2: Alertas de retraso */}
          <View style={styles.preferenceItem}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.preferenceTitle}>Alertas de retraso</Text>
              <Text style={styles.preferenceSubtitle}>Te avisaremos si pierdes el ritmo</Text>
            </View>
            <Switch
              value={delayAlertsEnabled}
              onValueChange={setDelayAlertsEnabled}
              trackColor={{ false: '#CBD5E1', true: '#174A62' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Opción 3: Resumen semanal */}
          <View style={styles.preferenceItem}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.preferenceTitle}>Resumen semanal</Text>
              <Text style={styles.preferenceSubtitle}>Cada domingo por la tarde</Text>
            </View>
            <Switch
              value={weeklyDigestEnabled}
              onValueChange={setWeeklyDigestEnabled}
              trackColor={{ false: '#CBD5E1', true: '#174A62' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Opción 4: Hora de recordatorio */}
          <TouchableOpacity style={styles.preferenceItemClickable} activeOpacity={0.7}>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceTitle}>Hora de recordatorio</Text>
              <Text style={styles.preferenceSubtitle}>Antes de cada actividad</Text>
            </View>
            <View style={styles.rowValueContainer}>
              <Text style={styles.valueText}>30 min</Text>
              <Feather name="chevron-right" size={16} color="#627D98" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sección CUENTA */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionCategory}>CUENTA</Text>

          <View style={styles.preferenceDivider} />

          {/* Objetivos anteriores (Conecta con archivados HU-46/47) */}
          <TouchableOpacity 
            style={styles.menuRowButton} 
            activeOpacity={0.7}
            onPress={() => router.push('/archived-goals' as any)}
          >
            <View style={styles.menuIconBox}>
              <Feather name="folder" size={16} color="#174A62" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceTitle}>Objetivos anteriores</Text>
              <Text style={styles.preferenceSubtitle}>Archivados y completados</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#627D98" />
          </TouchableOpacity>

          {/* Privacidad y datos */}
          <TouchableOpacity style={styles.menuRowButton} activeOpacity={0.7}>
            <View style={styles.menuIconBox}>
              <Feather name="lock" size={16} color="#174A62" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceTitle}>Privacidad y datos</Text>
              <Text style={styles.preferenceSubtitle}>Gestiona tu información</Text>
            </View>
            <Feather name="chevron-right" size={16} color="#627D98" />
          </TouchableOpacity>
        </View>

        {/* Botón de Cerrar Sesión (HU-55) */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: 1.2,
  },
  userCardDark: {
    backgroundColor: '#174A62',
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  userAvatarBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#335E75',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#D8ECF8',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    elevation: 2,
  },
  sectionCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
    marginTop: -8,
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 2,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  preferenceItemClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  preferenceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  preferenceSubtitle: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  rowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#174A62',
  },
  menuRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#FDF2F2',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F8D7CD',
    marginTop: 4,
  },
  logoutButtonText: {
    color: '#9C4221',
    fontSize: 14,
    fontWeight: '800',
  },
});