import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Colors, Spacing } from '@/constants/theme';

interface HomeNextStepCardProps {
  nextStepTitle: string;
  nextStepDescription: string;
  estimatedMinutes?: number | null;
  nextStepStage?: string | null;
  buttonText: string;
  onPress: () => void;
}

export function HomeNextStepCard({
  nextStepTitle,
  nextStepDescription,
  estimatedMinutes,
  nextStepStage,
  buttonText,
  onPress,
}: HomeNextStepCardProps) {
  return (
    <Card style={styles.nextStepCard}>
      <View style={styles.nextStepBadge}>
        <Text style={styles.nextStepBadgeText}>CONTINUAR</Text>
      </View>

      <Text style={styles.nextStepTitle} numberOfLines={2}>
        {nextStepTitle}
      </Text>

      <Text style={styles.nextStepDescription} numberOfLines={2}>
        {nextStepDescription}
      </Text>

      <View style={styles.activityInfo}>
        <Text style={styles.infoText} numberOfLines={1}>
          ⏱ {estimatedMinutes ? `${estimatedMinutes} min` : 'Duración no indicada'}
        </Text>
        <Text style={styles.infoText}>•</Text>
        <Text style={[styles.infoText, styles.stageText]} numberOfLines={1} ellipsizeMode="tail">
          {nextStepStage ?? 'Etapa no disponible'}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
        onPress={onPress}
      >
        <Text style={styles.primaryButtonText}>{buttonText}</Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  nextStepCard: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 24,
    padding: Spacing.four,
    borderWidth: 1.2,
    borderColor: Colors.light.border,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  nextStepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#D8ECF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: Spacing.two,
  },
  nextStepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.light.primary,
    letterSpacing: 0.8,
  },
  nextStepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: Spacing.one,
  },
  nextStepDescription: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  activityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  infoText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    fontWeight: '500',
  },
  stageText: {
    flexShrink: 1, // Esto obliga a que si el nombre de la etapa es muy largo, se ajuste y use puntos suspensivos sin salirse
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});