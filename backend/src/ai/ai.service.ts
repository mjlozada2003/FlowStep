import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

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

  async generateInitialPlan(goalTitle: string, goalDescription: string) {
    const prompt = `
      Actúa como un experto planificador y educador. 
      Tengo el siguiente objetivo: "${goalTitle}"
      Descripción detallada: "${goalDescription}"
      
      Por favor, divide este objetivo en etapas lógicas (stages).
      Para cada etapa, define las actividades necesarias (activities).
      Para cada actividad, indica un título, tipo (learning, practice, exercise, assessment, reinforcement), y minutos estimados.
      
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
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        }
      });
      
      if (!response.text) return null;
      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error generando plan con IA:', error);
      throw new InternalServerErrorException('No se pudo generar el plan personalizado');
    }
  }
}
