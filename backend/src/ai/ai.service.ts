import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface UserAvailabilitySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
}

export interface PlanActivity {
  title: string;
  type: string;
  estimated_minutes: number;
  sort_order: number;
}

export interface PlanStage {
  name: string;
  description: string;
  sort_order: number;
  activities: PlanActivity[];
}

export interface InitialPlanResponse {
  stages: PlanStage[];
}

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('API Key de Gemini no configurada');
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  private cleanJsonText(rawText?: string): string | null {
    if (!rawText) return null;
    let text = rawText.trim();
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }
    return text;
  }

  private generateFallbackPlan(
    goalTitle: string,
    goalDescription: string,
    userAvailabilities?: UserAvailabilitySlot[],
  ): InitialPlanResponse {
    let defaultDuration = 30;
    if (userAvailabilities && userAvailabilities.length > 0) {
      const slot = userAvailabilities[0];
      if (slot.start_time && slot.end_time) {
        const [sh, sm] = slot.start_time.split(':').map(Number);
        const [eh, em] = slot.end_time.split(':').map(Number);
        const diffMinutes = eh * 60 + em - (sh * 60 + sm);
        if (diffMinutes > 0 && diffMinutes <= 180) {
          defaultDuration = Math.min(diffMinutes, 60);
        }
      }
    }

    const cleanTitle = (goalTitle || 'Objetivo').trim();

    return {
      stages: [
        {
          name: `Fundamentos de ${cleanTitle}`,
          description: 'Bases teóricas, conceptos esenciales y configuración inicial.',
          sort_order: 1,
          activities: [
            {
              title: `Introducción y conceptos clave de ${cleanTitle}`,
              type: 'learning',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Configuración de herramientas y entorno de práctica',
              type: 'practice',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Primer ejercicio guiado de asimilación',
              type: 'exercise',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
        {
          name: `Desarrollo y Práctica de ${cleanTitle}`,
          description: 'Aplicación práctica de conocimientos y resolución de problemas.',
          sort_order: 2,
          activities: [
            {
              title: 'Práctica guiada: Ejercicios de nivel intermedio',
              type: 'practice',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Desarrollo de un caso práctico o proyecto base',
              type: 'exercise',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Revisión y corrección de dudas comunes',
              type: 'learning',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
        {
          name: `Consolidación y Evaluación de ${cleanTitle}`,
          description: 'Evaluación final, optimización y consolidación del aprendizaje.',
          sort_order: 3,
          activities: [
            {
              title: 'Autoevaluación de conocimientos adquiridos',
              type: 'assessment',
              estimated_minutes: defaultDuration,
              sort_order: 1,
            },
            {
              title: 'Refuerzo de conceptos y optimización del proyecto',
              type: 'reinforcement',
              estimated_minutes: defaultDuration,
              sort_order: 2,
            },
            {
              title: 'Cierre y consolidación del objetivo',
              type: 'assessment',
              estimated_minutes: defaultDuration,
              sort_order: 3,
            },
          ],
        },
      ],
    };
  }

  async generateInitialPlan(
    goalTitle: string,
    goalDescription: string,
    userAvailabilities?: UserAvailabilitySlot[],
  ): Promise<InitialPlanResponse | null> {
    const availabilitySection =
      userAvailabilities && userAvailabilities.length > 0
        ? `
      DISPONIBILIDAD HORARIA DEL USUARIO (HU-35, HU-07, HU-36):
      El usuario cuenta con la siguiente disponibilidad horaria semanal:
      ${userAvailabilities.map((slot) => `- ${slot.day_of_week}: de ${slot.start_time} a ${slot.end_time}`).join('\n')}

      CRITERIOS OBLIGATORIOS DE ADAPTACIÓN (HU-36 y HU-07):
      1. Adapta la duración estimada ("estimated_minutes") de cada actividad para que sea compatible con los bloques de tiempo del usuario.
      2. Ninguna actividad individual debe superar la duración máxima de una sesión disponible del usuario.
      3. Si un conocimiento o práctica es extenso, divídelo en varias actividades progresivas y digeribles que encajen dentro de sus horarios disponibles.
      `
        : `
      CRITERIOS DE TIEMPO:
      - Asigna duraciones estimadas realistas ("estimated_minutes" entre 15 y 60 minutos por actividad).
      `;

    const prompt = `
      Actúa como un experto planificador y educador. 
      Tengo el siguiente objetivo: "${goalTitle}"
      Descripción detallada: "${goalDescription}"

      ${availabilitySection}

      Por favor, divide este objetivo en etapas lógicas (stages).
      Para cada etapa, define las actividades necesarias (activities).
      Para cada actividad, indica un título, tipo (learning, practice, exercise, assessment, reinforcement), y minutos estimados adaptados.
      
      Devuelve la respuesta ESTRICTAMENTE en este formato JSON (sin texto adicional, sin bloques de código markdown, solo el JSON puro):
      {
        "stages": [
          {
            "name": "Nombre de la etapa",
            "description": "Descripción de la etapa",
            "sort_order": 1,
            "activities": [
              {
                "title": "Título de la actividad",
                "type": "learning",
                "estimated_minutes": 30,
                "sort_order": 1
              }
            ]
          }
        ]
      }
    `;

    // Modelos candidatos en orden de preferencia y resiliencia ante alta demanda
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash'];

    for (const model of candidateModels) {
      try {
        const response = await this.ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const cleaned = this.cleanJsonText(response?.text);
        if (cleaned) {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed?.stages) && parsed.stages.length > 0) {
            return parsed;
          }
        }
      } catch (error: any) {
        console.warn(`Aviso de IA (${model}): ${error?.message || error}. Probando alternativa...`);
      }
    }

    // Si la API de Gemini tiene picos de saturación (503/429) o fallas de red, aplicamos el plan pedagógico base adaptable
    console.warn('Gemini experimenta alta demanda o inaccesibilidad temporal. Aplicando plan pedagógico adaptable base.');
    return this.generateFallbackPlan(goalTitle, goalDescription, userAvailabilities);
  }
}
