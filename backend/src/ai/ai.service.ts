import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export interface UserAvailabilitySlot {
  day_of_week: string;
  start_time: string;
  end_time: string;
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

  async generateInitialPlan(
    goalTitle: string,
    goalDescription: string,
    userAvailabilities?: UserAvailabilitySlot[],
  ) {
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

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (!response.text) return null;
      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generando plan con IA adaptado a disponibilidad:', error);
      throw new InternalServerErrorException('No se pudo generar el plan personalizado');
    }
  }
}
