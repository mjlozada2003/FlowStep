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

interface LearningResource {
  id: string;
  type: 'LECTURA' | 'VÍDEO' | 'PRÁCTICA';
  duration: string;
  title: string;
  category: string;
  badgeText: string;
  iconName: keyof typeof Feather.glyphMap;
}

const mockResources: LearningResource[] = [
  {
    id: '1',
    type: 'LECTURA',
    duration: '3 min',
    title: 'Pensar en componentes',
    category: 'Componentes de React',
    badgeText: 'Esencial',
    iconName: 'book-open',
  },
  {
    id: '2',
    type: 'VÍDEO',
    duration: '12 min',
    title: 'Estado y propiedades paso a paso',
    category: 'React básico',
    badgeText: 'Recomendado',
    iconName: 'play',
  },
  {
    id: '3',
    type: 'PRÁCTICA',
    duration: '20 min',
    title: 'Construye tu primera interfaz',
    category: 'Componentes',
    badgeText: 'Intermedio',
    iconName: 'code',
  },
];

export default function LearningScreen() {
  const [dominantCount] = useState(2);
  const [totalConcepts] = useState(5);

  return (
    <Screen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabecera superior con etiqueta y BrandHeader */}
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.headerTag}>APRENDIZAJE</Text>
            <Text style={styles.mainTitle}>Conocimientos</Text>
          </View>
          <View style={styles.dominanceBadge}>
            <Text style={styles.dominanceText}>{dominantCount}/{totalConcepts}</Text>
            <Text style={styles.dominanceSub}>dominados</Text>
          </View>
        </View>

        {/* Tarjeta Azul Oscura del Objetivo Actual */}
        <View style={styles.goalCardDark}>
          <View style={styles.goalCardTop}>
            <Text style={styles.goalLabel}>OBJETIVO</Text>
            <Text style={styles.goalPercent}>33%</Text>
          </View>
          <Text style={styles.goalTitle}>Crear una aplicación web</Text>
          
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>

          {/* Píldoras de temas */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsRow}
          >
            <View style={[styles.topicPill, styles.topicDone]}><Text style={styles.topicDoneText}>✓ HTML y CSS</Text></View>
            <View style={[styles.topicPill, styles.topicDone]}><Text style={styles.topicDoneText}>✓ JavaScript</Text></View>
            <View style={[styles.topicPill, styles.topicActive]}><Text style={styles.topicActiveText}>React</Text></View>
            <View style={styles.topicPill}><Text style={styles.topicText}>Hooks</Text></View>
            <View style={styles.topicPill}><Text style={styles.topicText}>APIs</Text></View>
            <View style={styles.topicPill}><Text style={styles.topicText}>Pruebas</Text></View>
          </ScrollView>
        </View>

        {/* Sección RECURSOS RECOMENDADOS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionMainTitle}>Recursos recomendados</Text>
          <Text style={styles.sectionSubHint}>Según tus dificultades</Text>
        </View>

        <View style={styles.resourcesList}>
          {mockResources.map((res) => (
            <TouchableOpacity 
              key={res.id} 
              style={styles.resourceCard} 
              activeOpacity={0.8}
              onPress={() => router.push({ pathname: '/evaluation', params: { resourceId: res.id } } as any)}
            >
              <View style={styles.resourceIconBox}>
                <Feather name={res.iconName} size={20} color="#174A62" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resourceType}>{res.type} · {res.duration}</Text>
                <Text style={styles.resourceTitle}>{res.title}</Text>
                <View style={styles.resourceFooterRow}>
                  <Text style={styles.resourceCategory}>{res.category}</Text>
                  <View style={styles.miniBadge}>
                    <Text style={styles.miniBadgeText}>{res.badgeText}</Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color="#627D98" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Tarjeta de Evaluación Interactiva */}
        <TouchableOpacity 
          style={styles.evaluationBanner}
          activeOpacity={0.85}
          onPress={() => router.push('/evaluation' as any)}
        >
          <View style={styles.evalIconBox}>
            <Feather name="help-circle" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.evalTag}>COMPRUEBA LO APRENDIDO</Text>
            <Text style={styles.evalTitle}>Evaluación de React básico</Text>
            <Text style={styles.evalSubtitle}>3 preguntas · 5 minutos</Text>
          </View>
          <Text style={styles.evalAction}>Empezar</Text>
        </TouchableOpacity>

        {/* Enlace a plan conectado */}
        <TouchableOpacity style={styles.planConnectedCard} activeOpacity={0.8}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planConnectedTitle}>Aprendizaje conectado a tu plan</Text>
            <Text style={styles.planConnectedDesc}>Las actividades que añadas aparecerán en la Etapa I.</Text>
          </View>
          <Text style={styles.planConnectedAction}>Ver plan</Text>
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
    paddingTop: 16,
    paddingBottom: 40,
    gap: 16,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#174A62',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F2C40',
    letterSpacing: -0.5,
  },
  dominanceBadge: {
    backgroundColor: '#EBF5FB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D8ECF8',
  },
  dominanceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#174A62',
  },
  dominanceSub: {
    fontSize: 9,
    color: '#627D98',
    fontWeight: '600',
  },
  goalCardDark: {
    backgroundColor: '#174A62',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    elevation: 4,
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
  },
  goalPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: -4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '33%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  pillsRow: {
    gap: 8,
    paddingTop: 4,
  },
  topicPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  topicDone: {
    backgroundColor: '#335E75',
  },
  topicActive: {
    backgroundColor: '#FFFFFF',
  },
  topicText: {
    fontSize: 11,
    color: '#D8ECF8',
    fontWeight: '600',
  },
  topicDoneText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  topicActiveText: {
    fontSize: 11,
    color: '#174A62',
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
  },
  sectionMainTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F2C40',
  },
  sectionSubHint: {
    fontSize: 11,
    color: '#627D98',
    fontWeight: '600',
  },
  resourcesList: {
    gap: 10,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    elevation: 2,
  },
  resourceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#EBF5FB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceType: {
    fontSize: 10,
    fontWeight: '800',
    color: '#627D98',
    letterSpacing: 0.5,
  },
  resourceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
    marginVertical: 2,
  },
  resourceFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceCategory: {
    fontSize: 11,
    color: '#627D98',
  },
  miniBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#4A5568',
  },
  evaluationBanner: {
    backgroundColor: '#174A62',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#174A62',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    elevation: 3,
  },
  evalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  evalTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9FB3C8',
    letterSpacing: 1,
  },
  evalTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 1,
  },
  evalSubtitle: {
    fontSize: 11,
    color: '#D8ECF8',
  },
  evalAction: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  planConnectedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 4,
  },
  planConnectedTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F2C40',
  },
  planConnectedDesc: {
    fontSize: 11,
    color: '#627D98',
    marginTop: 2,
  },
  planConnectedAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#174A62',
  },
});