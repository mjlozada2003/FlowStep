import { Feather } from '@expo/vector-icons';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const DIFFICULTY_TAGS = [
  'Falta de conocimientos',
  'Falta de tiempo',
  'Difícil de comprender',
  'Problemas externos',
  'Otra',
];

interface ActivityDifficultyCardProps {
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  notes: string;
  onChangeNotes: (val: string) => void;
}

export function ActivityDifficultyCard({
  selectedTag,
  onSelectTag,
  notes,
  onChangeNotes,
}: ActivityDifficultyCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.iconCircle}>
          <Feather name="alert-circle" size={16} color="#174A62" />
        </View>
        <View style={styles.headerTextFlex}>
          <Text style={styles.sectionCategory}>EXPERIENCIA</Text>
          <Text style={styles.sectionTitle}>¿Tuviste alguna dificultad?</Text>
        </View>
      </View>

      <View style={styles.pillsContainer}>
        {DIFFICULTY_TAGS.map((tag) => {
          const isSelected = selectedTag === tag;
          return (
            <TouchableOpacity
              key={tag}
              style={[styles.pillButton, isSelected && styles.pillButtonSelected]}
              onPress={() => onSelectTag(tag)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                {tag}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.subLabel}>CUÉNTANOS UN POCO MÁS</Text>
      <TextInput
        style={styles.textArea}
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Me costó entender..."
        multiline
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#174A62', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconCircle: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#EBF5FB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTextFlex: { flex: 1 },
  sectionCategory: { fontSize: 9, fontWeight: '800', color: '#174A62', letterSpacing: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0F2C40' },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  pillButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  pillButtonSelected: { borderColor: '#174A62', backgroundColor: '#D8ECF8' },
  pillText: { fontSize: 12, color: '#486581', fontWeight: '600' },
  pillTextSelected: { color: '#174A62', fontWeight: '800' },
  subLabel: { fontSize: 10, fontWeight: '800', color: '#627D98', marginBottom: 6, letterSpacing: 0.8 },
  textArea: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, padding: 12, height: 80, fontSize: 13, color: '#0F2C40', backgroundColor: '#F8FAFC', textAlignVertical: 'top' },
});