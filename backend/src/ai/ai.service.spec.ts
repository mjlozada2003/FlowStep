import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('mock-api-key'),
          },
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate quiz scores from selected options, not client grading flags', () => {
    const questions = [
      {
        id: 1,
        category: 'Fundamentos',
        question: 'Pregunta 1',
        options: [
          { key: 'A', text: 'Correcta', isCorrect: true },
          { key: 'B', text: 'Incorrecta', isCorrect: false },
        ],
        explanation: '',
      },
      {
        id: 2,
        category: 'Práctica',
        question: 'Pregunta 2',
        options: [
          { key: 'A', text: 'Incorrecta', isCorrect: false },
          { key: 'B', text: 'Correcta', isCorrect: true },
        ],
        explanation: '',
      },
    ];
    const answers = [
      { question_id: 1, selected_option: 'B', is_correct: true },
      { question_id: 2, selected_option: 'B', is_correct: false },
    ];

    expect(service.evaluateQuizAnswers(questions, answers)).toEqual({
      score: 1,
      total_questions: 2,
      percentage: 50,
      weak_topics: ['Fundamentos'],
      reinforcement_recommendations: [
        {
          topic: 'Fundamentos',
          suggested_title: 'Refuerzo guiado: Fundamentos',
          estimated_minutes: 30,
        },
      ],
    });
  });
});
