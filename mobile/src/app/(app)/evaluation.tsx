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
import { BackButton } from '@/components/ui/BackButton';
import { BrandHeader } from '@/components/ui/BrandHeader';

interface Question {
  id: number;
  question: string;
  category: string;
  options: { key: string; text: string; isCorrect: boolean }[];
  explanation: string;
}

// Preguntas preparadas para enlazarse dinámicamente al backend / IA
const mockQuestions: Question[] = [
  {
    id: 1,
    category: 'REACT BÁSICO',
    question: '¿Cuál es el objetivo principal de un componente?',
    options: [
      { key: 'A', text: 'Reutilizar una parte de la interfaz', isCorrect: true },
      { key: 'B', text: 'Guardar todos los datos', isCorrect: false },
      { key: 'C', text: 'Conectar directamente la base de datos', isCorrect: false },
    ],
    explanation: 'Los componentes permiten reutilizar estructura y comportamiento.',
  },
  {
    id: 2,
    category: 'REACT BÁSICO',
    question: '¿Qué se utiliza para enviar datos a un componente?',
    options: [
      { key: 'A', text: 'Hooks', isCorrect: false },
      { key: 'B', text: 'Props', isCorrect: true },
      { key: 'C', text: 'CSS', isCorrect: false },
    ],
    explanation: 'La respuesta correcta te ayuda a reforzar este concepto antes de continuar.',
  },
  {
    id: 3,
    category: 'REACT BÁSICO',
    question: '¿Qué dato puede cambiar dentro de un componente?',
    options: [
      { key: 'A', text: 'El estado', isCorrect: true },
      { key: 'B', text: 'El nombre del archivo', isCorrect: false },
      { key: 'C', text: 'La etiqueta HTML', isCorrect: false },
    ],
    explanation: 'El estado (state) maneja los datos internos dinámicos del componente.',
  },
];

export default function EvaluationScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);

  const currentQ = mockQuestions[currentIndex] || mockQuestions[0];
  const progressPercent = ((currentIndex + 1) / mockQuestions.length) * 100;

  const handleSelectOption = (key: string, isCorrect: boolean) => {
    if (isAnswered) return;
    setSelectedOption(key);
    setIsAnswered(true);
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < mockQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      router.replace('/learning' as any);
    }
  };

  const selectedObj = currentQ.options.find((o) => o.key === selectedOption);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior */}
        <View style={styles.topHeader}>
          <BackButton />
          <Text style={styles.headerStep}>PREGUNTA {currentIndex + 1} DE {mockQuestions.length}</Text>
          <BrandHeader showTagline={false} />
        </View>

        {/* Barra de progreso */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Categoría */}
        <Text style={styles.categoryLabel}>{currentQ.category}</Text>
        
        {/* Enunciado de la pregunta */}
        <Text style={styles.questionTitle}>{currentQ.question}</Text>

        {/* Opciones de respuesta */}
        <View style={styles.optionsList}>
          {currentQ.options.map((opt) => {
            const isSelected = selectedOption === opt.key;
            const isCorrectOption = opt.isCorrect;

            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.optionCard,
                  isAnswered && isCorrectOption && styles.cardCorrect,
                  isAnswered && isSelected && !isCorrectOption && styles.cardIncorrect,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectOption(opt.key, opt.isCorrect)}
              >
                <View
                  style={[
                    styles.optionBadge,
                    isAnswered && isCorrectOption && styles.badgeCorrect,
                    isAnswered && isSelected && !isCorrectOption && styles.badgeIncorrect,
                  ]}
                >
                  <Text style={styles.badgeKey}>{opt.key}</Text>
                </View>
                <Text style={styles.optionText}>{opt.text}</Text>
                {isAnswered && isCorrectOption && (
                  <Feather name="check" size={18} color="#2F855A" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Caja de explicación / retroalimentación inmediata */}
        {isAnswered && (
          <View style={[styles.feedbackBox, selectedObj?.isCorrect ? styles.feedbackSuccess : styles.feedbackWarn]}>
            <Text style={[styles.feedbackTitle, selectedObj?.isCorrect ? styles.textSuccess : styles.textWarn]}>
              {selectedObj?.isCorrect ? '¡Correcto!' : 'Casi. Repasemos este punto.'}
            </Text>
            <Text style={styles.feedbackDesc}>{currentQ.explanation}</Text>
          </View>
        )}

        {/* Botón Siguiente pregunta */}
        {isAnswered && (
          <TouchableOpacity
            style={styles.nextButton}
            activeOpacity={0.85}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex < mockQuestions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados'}
            </Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerStep: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#174A62',
    borderRadius: 3,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  questionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F2C40',
    lineHeight: 30,
  },
  optionsList: {
    gap: 12,
    marginTop: 4,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  cardCorrect: {
    backgroundColor: '#F0FDF4',
    borderColor: '#34D399',
  },
  cardIncorrect: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
  },
  optionBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EDF2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeCorrect: {
    backgroundColor: '#D1FAE5',
  },
  badgeIncorrect: {
    backgroundColor: '#FEE2E2',
  },
  badgeKey: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A5568',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F2C40',
    flex: 1,
  },
  feedbackBox: {
    borderRadius: 16,
    padding: 16,
    gap: 4,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#E6FFFA',
    borderColor: '#B2F5EA',
  },
  feedbackWarn: {
    backgroundColor: '#FDF2F8',
    borderColor: '#FCE7F3',
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  textSuccess: {
    color: '#234E52',
  },
  textWarn: {
    color: '#9B2C2C',
  },
  feedbackDesc: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 18,
  },
  nextButton: {
    backgroundColor: '#174A62',
    borderRadius: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
    marginTop: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});