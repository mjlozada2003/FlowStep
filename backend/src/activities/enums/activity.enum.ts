export enum ActivityType {
  LEARNING = 'learning',
  PRACTICE = 'practice',
  EXERCISE = 'exercise',
  ASSESSMENT = 'assessment',
  REINFORCEMENT = 'reinforcement',
}

export enum ActivityStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export enum ActivityOrigin {
  INITIAL_PLAN = 'initial_plan',
  AI_ADJUSTMENT = 'ai_adjustment',
  MANUAL = 'manual',
}
