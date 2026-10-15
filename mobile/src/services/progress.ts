
const activityProgress = new Map<string, boolean>();

export function getActivityCompleted(
  activityKey: string,
  initialValue: boolean
): boolean {
  if (!activityProgress.has(activityKey)) {
    activityProgress.set(activityKey, initialValue);
  }

  return activityProgress.get(activityKey) ?? initialValue;
}

export function saveActivityCompleted(
  activityKey: string,
  isCompleted: boolean
): void {
  activityProgress.set(activityKey, isCompleted);
}
