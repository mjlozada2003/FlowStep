import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface StageBannersProps {
  onPressSchedule: () => void;
  onPressHistory: () => void;
}

export function StageBanners({ onPressSchedule, onPressHistory }: StageBannersProps) {
  return (
    <>
      <TouchableOpacity style={styles.adaptedBanner} onPress={onPressSchedule} activeOpacity={0.8}>
        <View style={styles.bannerLeft}>
          <Feather name="calendar" size={18} color="#174A62" />
          <View style={styles.bannerTextFlex}>
            <Text style={styles.bannerTitle}>Plan adaptado a tu disponibilidad</Text>
            <Text style={styles.bannerSub}>Sesiones organizadas para evitar sobrecargas</Text>
          </View>
        </View>
        <Text style={styles.bannerAction}>Ver agenda</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.adaptedBanner, styles.historyBanner]}
        onPress={onPressHistory}
        activeOpacity={0.8}
      >
        <View style={styles.bannerLeft}>
          <Feather name="clock" size={18} color="#174A62" />
          <View style={styles.bannerTextFlex}>
            <Text style={styles.bannerTitle}>Historial de actividades</Text>
            <Text style={styles.bannerSub}>Revisa sesiones completadas e incidencias</Text>
          </View>
        </View>
        <Text style={styles.bannerAction}>Ver historial</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  adaptedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EBF5FB',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#D8ECF8',
    gap: 10,
  },
  historyBanner: {
    marginTop: -6,
    backgroundColor: '#FFFFFF',
    borderColor: '#E2EEF1',
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bannerTextFlex: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F2C40',
  },
  bannerSub: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  bannerAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
});