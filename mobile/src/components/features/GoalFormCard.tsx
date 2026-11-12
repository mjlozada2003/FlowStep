import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';

interface GoalFormCardProps {
  title: string;
  onChangeTitle: (text: string) => void;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  hasError: boolean;
}

export function GoalFormCard({
  title,
  onChangeTitle,
  isFocused,
  onFocus,
  onBlur,
  hasError,
}: GoalFormCardProps) {
  return (
    <View style={[styles.card, hasError ? styles.cardError : null]}>
      <Text style={styles.cardBadge}>MI OBJETIVO</Text>
      <TextInput
        placeholder="Crear una aplicación web"
        value={title}
        onChangeText={onChangeTitle}
        onFocus={onFocus}
        onBlur={onBlur}
        multiline
        maxLength={120}
        style={[
          styles.goalInput,
          isFocused && styles.goalInputFocused,
        ]}
        placeholderTextColor="#94A3B8"
      />
      <Text style={styles.inputHint}>Escríbelo con tus propias palabras</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    elevation: 4,
  },
  cardError: {
    borderColor: '#D97A7A',
    borderWidth: 1.5,
  },
  cardBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1,
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
});