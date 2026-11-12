import { StyleSheet, Text, View } from 'react-native';

interface GoalSuccessHeaderProps {
  isLoading: boolean;
  isConfirmed: boolean;
  completedActivityTitle?: string;
  errorMessage: string | null;
}

export function GoalSuccessHeader({
  isLoading,
  isConfirmed,
  completedActivityTitle,
  errorMessage,
}: GoalSuccessHeaderProps) {
  const badgeText = isLoading
    ? 'CONSULTANDO TU PROGRESO'
    : isConfirmed
      ? 'PRIMER PASO COMPLETADO'
      : 'ESTADO NO CONFIRMADO';

  const titleText = isLoading
    ? 'Actualizando tu progreso'
    : isConfirmed
      ? '¡Muy bien, lo has conseguido!'
      : 'No se pudo confirmar el cambio';

  return (
    <View style={styles.titleSection}>
      <Text style={styles.badge}>{badgeText}</Text>
      <Text style={styles.mainTitle}>{titleText}</Text>
      <Text style={styles.subtitle}>
        {isLoading
          ? 'Consultando el estado guardado de la actividad.'
          : isConfirmed
            ? (
                <>
                  Completaste <Text style={styles.boldText}>{completedActivityTitle}</Text>. Cada actividad te acerca un poco más a tu objetivo.
                </>
              )
            : errorMessage}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  titleSection: {
    alignItems: 'center',
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
    fontSize: 13,
    color: '#627D98',
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
  },
  boldText: {
    fontWeight: '800',
    color: '#0F2C40',
  },
});