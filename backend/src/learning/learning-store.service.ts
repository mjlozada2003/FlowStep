import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import type {
  GoalKnowledgeResponse,
  LearningResourceItem,
  QuizEvaluationResult,
  QuizQuestionItem,
  RecommendationDiagnostic,
  ReplanAlternativesResponse,
  ReplanProposalItem,
} from '../ai/ai.service';

/**
 * Persistencia del Sprint 5 (database/12 a 15).
 *
 * Guarda en PostgreSQL lo que antes se generaba con IA en cada llamada:
 * conocimientos (HU-37), recursos (HU-05, HU-38), evaluaciones e intentos
 * (HU-40, HU-41), recomendaciones (HU-04, HU-26, HU-30, HU-43) y propuestas
 * de replanificacion con su detalle (HU-27, HU-28, HU-29, HU-31, HU-51, HU-52).
 * Las reglas de integridad viven en la base (triggers); aqui solo se lee y escribe.
 */

export type RecommendationType =
  | 'delay_adjustment'
  | 'difficulty_support'
  | 'personalized'
  | 'knowledge_gap'
  | 'replan';

export interface StoredRecommendation {
  recommendation_id: number;
  details: Record<string, any>;
  diagnostic: RecommendationDiagnostic;
}

export interface ReplanItemPlan {
  action: 'reschedule' | 'add' | 'keep';
  activity_id?: number;
  new_title?: string;
  description?: string;
  estimated_minutes?: number;
  new_scheduled_date?: string;
  new_start_time?: string | null;
  new_end_time?: string | null;
}

export interface ReplanProposalPlan {
  proposal: ReplanProposalItem;
  items: ReplanItemPlan[];
  new_due_date?: string | null;
}

export interface StoredReplan {
  recommendation_id: number;
  proposals: (ReplanProposalItem & { proposal_id: number; status: string })[];
}

export interface SelectedProposal {
  recommendation_id: number;
  proposal_id: number;
  proposal_type: 'balanced' | 'learning' | 'time';
  new_due_date: string | null;
  items: ReplanItemPlan[];
}

const RESOURCE_TYPES: Record<string, string> = {
  LECTURA: 'reading',
  'VÍDEO': 'video',
  VIDEO: 'video',
  'PRÁCTICA': 'practice',
  PRACTICA: 'practice',
  EJERCICIO: 'exercise',
};

const RECENT_MINUTES = 60;

@Injectable()
export class LearningStoreService {
  private readonly logger = new Logger(LearningStoreService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Ejecuta una operacion de persistencia sin romper la respuesta si la base falla. */
  async safely<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      this.logger.warn(`${label}: ${error?.message ?? error}`);
      return fallback;
    }
  }

  transaction<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(fn);
  }

  private run(sql: string, params: any[] = [], manager?: EntityManager): Promise<any[]> {
    return (manager ?? this.dataSource.manager).query(sql, params);
  }

  /** Fecha de hoy segun la base (zona America/La_Paz), en formato YYYY-MM-DD. */
  async today(manager?: EntityManager): Promise<string> {
    const [row] = await this.run(`SELECT CURRENT_DATE::text AS today`, [], manager);
    return row.today;
  }

  private async topicId(manager: EntityManager, name: string, description?: string | null): Promise<number> {
    const [row] = await manager.query(
      `INSERT INTO "TOPIC" (name, description) VALUES ($1, $2)
       ON CONFLICT ((lower(btrim(name)))) DO UPDATE
         SET description = COALESCE("TOPIC".description, EXCLUDED.description)
       RETURNING topic_id`,
      [name.trim().slice(0, 150), description ?? null],
    );
    return Number(row.topic_id);
  }

  // ---------------------------------------------------------------- HU-37

  async loadGoalKnowledge(goalId: number, goalTitle: string): Promise<GoalKnowledgeResponse | null> {
    const topics = await this.run(
      `SELECT topic_id, topic_name, knowledge_status, stage_name
         FROM v_goal_knowledge WHERE goal_id = $1 ORDER BY sort_order, topic_id`,
      [goalId],
    );
    if (!topics.length) return null;

    const [summary] = await this.run('SELECT * FROM v_goal_knowledge_summary WHERE goal_id = $1', [goalId]);
    return {
      goal_id: goalId,
      goal_title: goalTitle,
      dominant_count: Number(summary?.dominant_count ?? 0),
      total_concepts: Number(summary?.total_concepts ?? topics.length),
      progress_percentage: Math.round(Number(summary?.progress_percentage ?? 0)),
      topics: topics.map((t) => ({
        id: String(t.topic_id),
        name: t.topic_name,
        status: t.knowledge_status,
        is_mastered: t.knowledge_status === 'completed',
        stage_name: t.stage_name ?? undefined,
      })),
      current_concept: summary?.current_topic_id
        ? {
            title: summary.current_topic_name,
            description:
              summary.current_topic_description ||
              `Concepto en desarrollo para consolidar las actividades de "${goalTitle}".`,
            mastery_percentage: Math.round(Number(summary.current_mastery_percentage ?? 0)),
          }
        : undefined,
    };
  }

  async saveGoalKnowledge(
    goalId: number,
    generated: GoalKnowledgeResponse,
    stages: { stage_id: number; name: string }[],
  ): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const existing = await m.query('SELECT 1 FROM "GOAL_TOPIC" WHERE goal_id = $1 LIMIT 1', [goalId]);
      if (existing.length) return;

      let order = 0;
      for (const topic of generated.topics ?? []) {
        if (!topic?.name?.trim()) continue;
        const isCurrent = generated.current_concept?.title?.trim() === topic.name.trim();
        const topicId = await this.topicId(m, topic.name, isCurrent ? generated.current_concept?.description : null);
        const stage = stages.find(
          (s) => topic.stage_name && s.name.trim().toLowerCase() === topic.stage_name.trim().toLowerCase(),
        );
        order += 1;
        await m.query(
          `INSERT INTO "GOAL_TOPIC" (goal_id, topic_id, stage_id, sort_order)
           VALUES ($1, $2, $3, $4) ON CONFLICT (goal_id, topic_id) DO NOTHING`,
          [goalId, topicId, stage?.stage_id ?? null, order],
        );
      }
    });
  }

  // --------------------------------------------------------- HU-05, HU-38

  private mapResource(row: any): LearningResourceItem {
    const details = row.details && typeof row.details === 'object' ? row.details : {};
    const url = row.url ?? details.url;
    return {
      ...details,
      id: String(row.resource_id),
      type: (details.type ?? row.type_label) as LearningResourceItem['type'],
      duration: details.duration ?? row.duration_label ?? '',
      title: row.title,
      category: row.category ?? details.category ?? '',
      badge_text: details.badge_text ?? row.badge_text,
      icon_name: (details.icon_name ?? row.icon_name) as LearningResourceItem['icon_name'],
      ...(url ? { url } : {}),
    };
  }

  async loadGoalResources(goalId: number): Promise<LearningResourceItem[]> {
    const rows = await this.run(
      `SELECT * FROM v_goal_learning_resources WHERE goal_id = $1
       ORDER BY goal_sort_order NULLS LAST, is_essential DESC, resource_id`,
      [goalId],
    );
    return rows.map((r) => this.mapResource(r));
  }

  /** Si el objetivo ya tiene su lista propia de recursos (GOAL_RESOURCE) o recursos por sus temas. */
  async hasGoalResources(goalId: number): Promise<boolean> {
    const rows = await this.run(
      `SELECT 1 FROM "GOAL_RESOURCE" WHERE goal_id = $1
       UNION ALL
       SELECT 1 FROM "GOAL_TOPIC" gt JOIN "LEARNING_RESOURCE" r ON r.topic_id = gt.topic_id
        WHERE gt.goal_id = $1 AND r.deleted_at IS NULL
       LIMIT 1`,
      [goalId],
    );
    return rows.length > 0;
  }

  async loadActivityResources(activityId: number): Promise<LearningResourceItem[]> {
    const rows = await this.run(
      `SELECT * FROM v_activity_learning_resources WHERE activity_id = $1
       ORDER BY sort_order, resource_id`,
      [activityId],
    );
    return rows.map((r) => this.mapResource(r));
  }

  private async insertResource(m: EntityManager, item: LearningResourceItem): Promise<number> {
    const typeKey = String(item.type ?? '').toUpperCase();
    const type = RESOURCE_TYPES[typeKey] ?? 'reading';
    const minutes = parseInt(String(item.duration ?? '').match(/\d+/)?.[0] ?? '', 10);
    const url = typeof item.url === 'string' && /^https?:\/\//i.test(item.url) ? item.url : null;
    const { id: _ignored, ...details } = item as any;
    const [row] = await m.query(
      `INSERT INTO "LEARNING_RESOURCE"
         (title, type, category, duration_minutes, url, content, is_essential, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING resource_id`,
      [
        String(item.title || 'Recurso de aprendizaje').slice(0, 200),
        type,
        item.category ? String(item.category).slice(0, 80) : null,
        Number.isFinite(minutes) && minutes > 0 ? minutes : null,
        url,
        item.reading_content ?? item.summary ?? null,
        /esencial/i.test(String(item.badge_text ?? '')),
        JSON.stringify(details),
      ],
    );
    return Number(row.resource_id);
  }

  async saveGoalResources(goalId: number, items: LearningResourceItem[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const existing = await m.query('SELECT 1 FROM "GOAL_RESOURCE" WHERE goal_id = $1 LIMIT 1', [goalId]);
      if (existing.length) return;
      let order = 0;
      for (const item of items ?? []) {
        if (!item?.title) continue;
        const resourceId = await this.insertResource(m, item);
        order += 1;
        await m.query(
          'INSERT INTO "GOAL_RESOURCE" (goal_id, resource_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [goalId, resourceId, order],
        );
      }
    });
  }

  async saveActivityResources(activityId: number, items: LearningResourceItem[]): Promise<void> {
    await this.dataSource.transaction(async (m) => {
      const existing = await m.query(
        'SELECT 1 FROM "ACTIVITY_RESOURCE" WHERE activity_id = $1 LIMIT 1',
        [activityId],
      );
      if (existing.length) return;
      let order = 0;
      for (const item of items ?? []) {
        if (!item?.title) continue;
        const resourceId = await this.insertResource(m, item);
        order += 1;
        await m.query(
          'INSERT INTO "ACTIVITY_RESOURCE" (activity_id, resource_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [activityId, resourceId, order],
        );
      }
    });
  }

  // --------------------------------------------------------- HU-40, HU-41

  private async loadQuestions(assessmentId: number): Promise<QuizQuestionItem[]> {
    const rows = await this.run(
      `SELECT q.question_id, q.category, q.question_text, q.explanation, q.sort_order,
              t.name AS topic_name, o.option_key, o.option_text, o.is_correct
         FROM "ASSESSMENT_QUESTION" q
         LEFT JOIN "TOPIC" t ON t.topic_id = q.topic_id
         LEFT JOIN "QUESTION_OPTION" o ON o.question_id = q.question_id
        WHERE q.assessment_id = $1
        ORDER BY q.sort_order, o.option_key`,
      [assessmentId],
    );
    const questions = new Map<number, QuizQuestionItem>();
    for (const r of rows) {
      const id = Number(r.question_id);
      if (!questions.has(id)) {
        questions.set(id, {
          id,
          category: r.category ?? r.topic_name ?? 'General',
          question: r.question_text,
          options: [],
          explanation: r.explanation ?? '',
        });
      }
      if (r.option_key) {
        questions.get(id)!.options.push({
          key: r.option_key,
          text: r.option_text,
          isCorrect: r.is_correct,
          is_correct: r.is_correct,
        });
      }
    }
    return [...questions.values()];
  }

  /** Cuestionario abierto (sin intento enviado) de los ultimos 7 dias, si existe. */
  async loadOpenAssessment(goalId: number, userId: number): Promise<QuizQuestionItem[] | null> {
    const [row] = await this.run(
      `SELECT a.assessment_id FROM "ASSESSMENT" a
        WHERE a.goal_id = $1 AND a.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
          AND NOT EXISTS (SELECT 1 FROM "ASSESSMENT_ATTEMPT" t
                          WHERE t.assessment_id = a.assessment_id AND t.user_id = $2
                            AND t.submitted_at IS NOT NULL)
        ORDER BY a.created_at DESC, a.assessment_id DESC LIMIT 1`,
      [goalId, userId],
    );
    if (!row) return null;
    const questions = await this.loadQuestions(Number(row.assessment_id));
    return questions.length ? questions : null;
  }

  async saveAssessment(goalId: number, questions: QuizQuestionItem[]): Promise<QuizQuestionItem[]> {
    const assessmentId = await this.dataSource.transaction(async (m) => {
      const [assessment] = await m.query(
        `INSERT INTO "ASSESSMENT" (goal_id, source) VALUES ($1, 'ai') RETURNING assessment_id`,
        [goalId],
      );
      let order = 0;
      for (const q of questions ?? []) {
        if (!q?.question?.trim() || !q.options?.length) continue;
        order += 1;
        const category = q.category?.trim() || 'General';
        const topicId = await this.topicId(m, category);
        const [question] = await m.query(
          `INSERT INTO "ASSESSMENT_QUESTION"
             (assessment_id, topic_id, category, question_text, explanation, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING question_id`,
          [assessment.assessment_id, topicId, category.slice(0, 80), q.question, q.explanation ?? null, order],
        );

        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const used = new Set<string>();
        let correctAssigned = false;
        for (const [index, option] of q.options.slice(0, 6).entries()) {
          let key = String(option.key ?? '').trim().toUpperCase().slice(0, 1);
          if (!/^[A-F]$/.test(key) || used.has(key)) key = letters.find((l) => !used.has(l)) ?? letters[index];
          used.add(key);
          const isCorrect = !correctAssigned && Boolean(option.isCorrect ?? option.is_correct);
          if (isCorrect) correctAssigned = true;
          await m.query(
            `INSERT INTO "QUESTION_OPTION" (question_id, option_key, option_text, is_correct)
             VALUES ($1, $2, $3, $4)`,
            [question.question_id, key, String(option.text ?? ''), isCorrect],
          );
        }
      }
      return Number(assessment.assessment_id);
    });
    return this.loadQuestions(assessmentId);
  }

  /**
   * Califica en el servidor contra el cuestionario guardado. Devuelve null si
   * las preguntas no pertenecen a un cuestionario guardado de este objetivo
   * (por ejemplo, un cuestionario generado antes de esta version).
   */
  async gradeSubmission(
    userId: number,
    goalId: number,
    answers: { question_id: number; selected_option?: string; selected_option_id?: string }[],
  ): Promise<(QuizEvaluationResult & { attempt_id: number }) | null> {
    const ids = [...new Set((answers ?? []).map((a) => Number(a.question_id)).filter(Number.isInteger))];
    if (!ids.length) return null;

    const owners = await this.run(
      `SELECT DISTINCT q.assessment_id FROM "ASSESSMENT_QUESTION" q
         JOIN "ASSESSMENT" a ON a.assessment_id = q.assessment_id
        WHERE q.question_id = ANY($1::int[]) AND a.goal_id = $2`,
      [ids, goalId],
    );
    if (owners.length !== 1) return null;
    const assessmentId = Number(owners[0].assessment_id);

    const attemptId = await this.dataSource.transaction(async (m) => {
      const [attempt] = await m.query(
        `INSERT INTO "ASSESSMENT_ATTEMPT" (assessment_id, user_id) VALUES ($1, $2) RETURNING attempt_id`,
        [assessmentId, userId],
      );
      for (const answer of answers) {
        const key = String(answer.selected_option || answer.selected_option_id || '').trim().toUpperCase();
        if (!key) continue;
        await m.query(
          `INSERT INTO "ATTEMPT_ANSWER" (attempt_id, question_id, option_id)
           SELECT $1, o.question_id, o.option_id
             FROM "QUESTION_OPTION" o
             JOIN "ASSESSMENT_QUESTION" q ON q.question_id = o.question_id AND q.assessment_id = $4
            WHERE o.question_id = $2 AND o.option_key = $3
           ON CONFLICT (attempt_id, question_id) DO NOTHING`,
          [attempt.attempt_id, Number(answer.question_id), key, assessmentId],
        );
      }
      // Al enviar, un trigger actualiza USER_TOPIC con el dominio de cada tema.
      await m.query('UPDATE "ASSESSMENT_ATTEMPT" SET submitted_at = CURRENT_TIMESTAMP WHERE attempt_id = $1', [
        attempt.attempt_id,
      ]);
      return Number(attempt.attempt_id);
    });

    const [result] = await this.run('SELECT * FROM v_assessment_attempt_result WHERE attempt_id = $1', [attemptId]);
    const weak = await this.run(
      `SELECT topic_name FROM v_attempt_topic_result
        WHERE attempt_id = $1 AND is_weak ORDER BY percentage, topic_name`,
      [attemptId],
    );
    const weakTopics: string[] = weak.map((w) => w.topic_name);
    return {
      attempt_id: attemptId,
      score: Number(result.score),
      total_questions: Number(result.total_questions),
      percentage: Math.round(Number(result.percentage)),
      weak_topics: weakTopics,
      reinforcement_recommendations: weakTopics.map((topic) => ({
        topic,
        suggested_title: `Refuerzo guiado: ${topic}`,
        estimated_minutes: 30,
      })),
    };
  }

  // ------------------------------------------------ HU-04, HU-26, HU-30, HU-43

  /** Recomendacion pendiente reciente del mismo objetivo/actividad, para no duplicar por visita. */
  async findRecentRecommendation(
    userId: number,
    types: RecommendationType[],
    goalId: number | null,
    activityId?: number | null,
  ): Promise<StoredRecommendation | null> {
    // activityId undefined = cualquier actividad; null o un id = esa exacta.
    const [row] = await this.run(
      `SELECT * FROM "AI_RECOMMENDATION"
        WHERE user_id = $1 AND type::text = ANY($2::text[]) AND status = 'pending'
          AND goal_id IS NOT DISTINCT FROM $3
          AND ($5::boolean OR activity_id IS NOT DISTINCT FROM $4::int)
          AND created_at > CURRENT_TIMESTAMP - make_interval(mins => $6::int)
        ORDER BY created_at DESC LIMIT 1`,
      [userId, types, goalId, activityId ?? null, activityId === undefined, RECENT_MINUTES],
    );
    if (!row) return null;
    const details = row.details ?? {};
    return {
      recommendation_id: Number(row.recommendation_id),
      details,
      diagnostic: {
        ...(details.diagnostic ?? {}),
        goal_id: row.goal_id ?? 0,
        alert_level: row.alert_level,
        why_suggested: row.why_suggested,
        solution_focus: row.solution_focus ?? '',
        solutions: row.solutions ?? [],
        metrics: row.metrics ?? {},
        recommendation_id: Number(row.recommendation_id),
      } as RecommendationDiagnostic,
    };
  }

  /** Guarda una recomendacion nueva y expira las pendientes anteriores del mismo tipo y objetivo. */
  async saveRecommendation(params: {
    userId: number;
    goalId: number | null;
    activityId?: number | null;
    type: RecommendationType;
    alertLevel: string;
    title: string;
    whySuggested: string;
    solutionFocus?: string | null;
    solutions?: string[];
    expectedBenefit?: string | null;
    metrics?: Record<string, any>;
    details?: Record<string, any>;
  }): Promise<number> {
    return this.dataSource.transaction(async (m) => {
      await m.query(
        `UPDATE "AI_RECOMMENDATION" SET status = 'expired'
          WHERE user_id = $1 AND type = $2 AND status = 'pending'
            AND goal_id IS NOT DISTINCT FROM $3 AND activity_id IS NOT DISTINCT FROM $4`,
        [params.userId, params.type, params.goalId, params.activityId ?? null],
      );
      const level = ['info', 'warning', 'critical'].includes(params.alertLevel) ? params.alertLevel : 'info';
      const [row] = await m.query(
        `INSERT INTO "AI_RECOMMENDATION"
           (user_id, goal_id, activity_id, type, alert_level, title, why_suggested, solution_focus,
            solutions, expected_benefit, metrics, details)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12::jsonb)
         RETURNING recommendation_id`,
        [
          params.userId,
          params.goalId,
          params.activityId ?? null,
          params.type,
          level,
          (params.title?.trim() || 'Recomendación').slice(0, 150),
          params.whySuggested?.trim() || 'Recomendación generada a partir de tu progreso.',
          params.solutionFocus ? params.solutionFocus.slice(0, 150) : null,
          JSON.stringify(Array.isArray(params.solutions) ? params.solutions : []),
          params.expectedBenefit ?? null,
          JSON.stringify(params.metrics && typeof params.metrics === 'object' ? params.metrics : {}),
          JSON.stringify(params.details ?? {}),
        ],
      );
      return Number(row.recommendation_id);
    });
  }

  /** Foco sugerido por la base para el usuario (v_user_learning_profile). */
  async focusGoalId(userId: number): Promise<number | null> {
    const [row] = await this.run('SELECT focus_goal_id FROM v_user_learning_profile WHERE user_id = $1', [userId]);
    return row?.focus_goal_id ? Number(row.focus_goal_id) : null;
  }

  // ------------------------------------- HU-27, HU-28, HU-29, HU-31, HU-51, HU-52

  private mapProposal(row: any): ReplanProposalItem & { proposal_id: number; status: string } {
    const p = row.presentation ?? {};
    return {
      proposal_id: Number(row.proposal_id),
      status: row.status,
      type: row.proposal_type,
      type_label: p.type_label ?? row.title,
      title: row.title,
      badge_text: p.badge_text ?? row.tagline ?? '',
      description: row.description,
      stats_summary: row.session_info ?? '',
      pills: row.changes ?? [],
      explanation: row.impact ?? '',
      rescheduled_count: Number(p.rescheduled_count ?? row.activities_moved ?? 0),
      ...(p.added_resources_count != null ? { added_resources_count: Number(p.added_resources_count) } : {}),
      ...(p.extended_days != null ? { extended_days: Number(p.extended_days) } : {}),
    };
  }

  /** Propuestas pendientes creadas hoy para el objetivo (se regeneran cada dia). */
  async loadTodayReplan(userId: number, goalId: number, manager?: EntityManager): Promise<StoredReplan | null> {
    const [rec] = await this.run(
      `SELECT recommendation_id FROM "AI_RECOMMENDATION"
        WHERE user_id = $1 AND goal_id = $2 AND type = 'replan' AND status = 'pending'
          AND created_at::date = CURRENT_DATE
        ORDER BY created_at DESC LIMIT 1`,
      [userId, goalId],
      manager,
    );
    if (!rec) return null;
    const rows = await this.run(
      `SELECT * FROM v_replan_proposal_detail WHERE recommendation_id = $1 ORDER BY display_order`,
      [rec.recommendation_id],
      manager,
    );
    if (!rows.length) return null;
    return { recommendation_id: Number(rec.recommendation_id), proposals: rows.map((r) => this.mapProposal(r)) };
  }

  async saveReplan(params: {
    userId: number;
    goalId: number;
    whySuggested: string;
    metrics: Record<string, any>;
    plans: ReplanProposalPlan[];
  }): Promise<StoredReplan> {
    const recommendationId = await this.dataSource.transaction(async (m) => {
      await m.query(
        `UPDATE "AI_RECOMMENDATION" SET status = 'expired'
          WHERE user_id = $1 AND goal_id = $2 AND type = 'replan' AND status = 'pending'`,
        [params.userId, params.goalId],
      );
      const [rec] = await m.query(
        `INSERT INTO "AI_RECOMMENDATION"
           (user_id, goal_id, type, alert_level, title, why_suggested, solution_focus, solutions, metrics)
         VALUES ($1, $2, 'replan', 'info', 'Propuestas para reorganizar tu plan', $3,
                 'Elegir una alternativa de planificación', $4::jsonb, $5::jsonb)
         RETURNING recommendation_id`,
        [
          params.userId,
          params.goalId,
          params.whySuggested,
          JSON.stringify(params.plans.map((p) => p.proposal.title)),
          JSON.stringify(params.metrics),
        ],
      );

      for (const plan of params.plans) {
        const p = plan.proposal;
        const [proposal] = await m.query(
          `INSERT INTO "REPLAN_PROPOSAL"
             (recommendation_id, proposal_type, title, tagline, description, session_info, changes,
              impact, is_recommended, new_due_date, presentation)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11::jsonb)
           RETURNING proposal_id`,
          [
            rec.recommendation_id,
            p.type,
            String(p.title).slice(0, 100),
            p.badge_text ? String(p.badge_text).slice(0, 150) : null,
            p.description,
            p.stats_summary ? String(p.stats_summary).slice(0, 100) : null,
            JSON.stringify(p.pills ?? []),
            p.explanation ?? null,
            p.type === 'balanced',
            plan.new_due_date ?? null,
            JSON.stringify({
              type_label: p.type_label,
              badge_text: p.badge_text,
              rescheduled_count: p.rescheduled_count,
              added_resources_count: p.added_resources_count,
              extended_days: p.extended_days,
            }),
          ],
        );
        for (const item of plan.items) {
          await m.query(
            `INSERT INTO "REPLAN_PROPOSAL_ITEM"
               (proposal_id, activity_id, action, new_title, estimated_minutes,
                new_scheduled_date, new_start_time, new_end_time)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              proposal.proposal_id,
              item.activity_id ?? null,
              item.action,
              item.new_title ? item.new_title.slice(0, 200) : null,
              item.estimated_minutes ?? null,
              item.new_scheduled_date ?? null,
              item.new_start_time ?? null,
              item.new_end_time ?? null,
            ],
          );
        }
      }
      return Number(rec.recommendation_id);
    });

    const stored = await this.loadTodayReplan(params.userId, params.goalId);
    if (!stored || stored.recommendation_id !== recommendationId) {
      throw new Error('No se pudieron leer las propuestas recien guardadas');
    }
    return stored;
  }

  async loadProposalForApply(
    m: EntityManager,
    userId: number,
    goalId: number,
    proposalType: string,
  ): Promise<SelectedProposal | null> {
    const [row] = await m.query(
      `SELECT p.proposal_id, p.recommendation_id, p.proposal_type, p.new_due_date::text AS new_due_date
         FROM "REPLAN_PROPOSAL" p
         JOIN "AI_RECOMMENDATION" r ON r.recommendation_id = p.recommendation_id
        WHERE r.user_id = $1 AND r.goal_id = $2 AND r.type = 'replan' AND r.status = 'pending'
          AND r.created_at::date = CURRENT_DATE AND p.proposal_type = $3 AND p.status = 'proposed'
        ORDER BY r.created_at DESC LIMIT 1
        FOR UPDATE OF p`,
      [userId, goalId, proposalType],
    );
    if (!row) return null;
    const items = await m.query(
      `SELECT action, activity_id, new_title, estimated_minutes,
              new_scheduled_date::text AS new_scheduled_date,
              new_start_time::text AS new_start_time, new_end_time::text AS new_end_time
         FROM "REPLAN_PROPOSAL_ITEM" WHERE proposal_id = $1 ORDER BY item_id`,
      [row.proposal_id],
    );
    return {
      recommendation_id: Number(row.recommendation_id),
      proposal_id: Number(row.proposal_id),
      proposal_type: row.proposal_type,
      new_due_date: row.new_due_date,
      items: items.map((i: any) => ({
        action: i.action,
        activity_id: i.activity_id != null ? Number(i.activity_id) : undefined,
        new_title: i.new_title ?? undefined,
        estimated_minutes: i.estimated_minutes != null ? Number(i.estimated_minutes) : undefined,
        new_scheduled_date: i.new_scheduled_date ?? undefined,
        new_start_time: i.new_start_time,
        new_end_time: i.new_end_time,
      })),
    };
  }

  /** HU-52: marcar la propuesta elegida (el trigger acepta la recomendacion y descarta las demas). */
  async markProposalSelected(m: EntityManager, proposalId: number): Promise<void> {
    await m.query(`UPDATE "REPLAN_PROPOSAL" SET status = 'selected' WHERE proposal_id = $1`, [proposalId]);
  }

  /** HU-31: rechazar las propuestas pendientes del objetivo. Devuelve los ids rechazados. */
  async rejectPendingReplan(userId: number, goalId: number): Promise<number[]> {
    const rows = await this.run(
      `WITH rejected AS (
         UPDATE "AI_RECOMMENDATION" SET status = 'rejected'
          WHERE user_id = $1 AND goal_id = $2 AND type = 'replan' AND status = 'pending'
         RETURNING recommendation_id)
       SELECT recommendation_id FROM rejected`,
      [userId, goalId],
    );
    return rows.map((r) => Number(r.recommendation_id));
  }

  /** HU-42: vincula una actividad de refuerzo al tema que refuerza. */
  async linkActivityTopic(activityId: number, topicName: string): Promise<void> {
    if (!topicName?.trim()) return;
    await this.dataSource.transaction(async (m) => {
      const topicId = await this.topicId(m, topicName);
      await m.query(
        'INSERT INTO "ACTIVITY_TOPIC" (activity_id, topic_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [activityId, topicId],
      );
    });
  }

  /**
   * HU-42: registra el refuerzo agregado: tema de la actividad y recomendacion
   * aceptada que lo origino (ACTIVITY.origin_recommendation_id).
   */
  async recordReinforcement(userId: number, goalId: number, activityId: number, topic: string): Promise<number | null> {
    await this.linkActivityTopic(activityId, topic);
    const recommendationId = await this.acceptKnowledgeGap(userId, goalId, topic);
    if (recommendationId) {
      await this.run('UPDATE "ACTIVITY" SET origin_recommendation_id = $1 WHERE activity_id = $2', [
        recommendationId,
        activityId,
      ]);
      await this.run('UPDATE "ACTIVITY_SCHEDULE" SET recommendation_id = $1 WHERE activity_id = $2', [
        recommendationId,
        activityId,
      ]);
    }
    return recommendationId;
  }

  /** Recomendacion por vacio de conocimiento, guardada como aceptada (el usuario agrego el refuerzo). */
  async acceptKnowledgeGap(userId: number, goalId: number, topic: string): Promise<number | null> {
    const id = await this.saveRecommendation({
      userId,
      goalId,
      type: 'knowledge_gap',
      alertLevel: 'info',
      title: `Refuerza ${topic}`.slice(0, 150),
      whySuggested: `La evaluación detectó que "${topic}" necesita refuerzo.`,
      solutionFocus: 'Agregar una actividad de refuerzo guiado',
      solutions: [`Refuerzo guiado: ${topic}`],
      details: { topic },
    });
    await this.run(
      `UPDATE "AI_RECOMMENDATION" SET status = 'accepted' WHERE recommendation_id = $1 AND status = 'pending'`,
      [id],
    );
    return id;
  }
}
