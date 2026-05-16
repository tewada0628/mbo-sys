export type GoalScoreInput = {
  weight: number;
  score: number | null;
};

export type Degree360ScoreInput = {
  achievementScore: number;
  credoScore: number;
  isTop20Achievement: boolean;
} | null;

export type EvaluationScorePreview = {
  mboScore: number | null;
  degree360AchievementBonus: number;
  degree360CredoBonus: number;
  totalScore: number | null;
  isComplete: boolean;
};

export const scoreToMboPoints = (score: number): number => {
  if (score >= 1.2) return 120;
  if (score >= 1.0) return 100;
  if (score >= 0.8) return 80;
  return Math.max(0, Math.round(score * 100));
};

export const calculateMboScore = (goals: GoalScoreInput[]): number | null => {
  if (goals.length === 0 || goals.some((goal) => goal.score == null)) {
    return null;
  }

  const score = goals.reduce((sum, goal) => {
    return sum + scoreToMboPoints(goal.score ?? 0) * (goal.weight / 100);
  }, 0);

  return Math.round(score * 100) / 100;
};

export const calculateDegree360AchievementBonus = (score: Degree360ScoreInput): number => {
  if (!score) return 0;
  return score.achievementScore >= 4.5 && score.isTop20Achievement ? 10 : 0;
};

export const calculateDegree360CredoBonus = (score: Degree360ScoreInput, grade: number): number => {
  if (!score) return 0;
  if (grade >= 5 && score.credoScore >= 6.5) return 3;
  if (grade >= 3 && grade <= 4 && score.credoScore >= 6.0) return 3;
  return 0;
};

export const calculateEvaluationScore = (
  goals: GoalScoreInput[],
  degree360Score: Degree360ScoreInput,
  grade: number,
): EvaluationScorePreview => {
  const mboScore = calculateMboScore(goals);
  const degree360AchievementBonus = calculateDegree360AchievementBonus(degree360Score);
  const degree360CredoBonus = calculateDegree360CredoBonus(degree360Score, grade);
  const totalScore = mboScore == null
    ? null
    : Math.round((mboScore + degree360AchievementBonus + degree360CredoBonus) * 100) / 100;

  return {
    mboScore,
    degree360AchievementBonus,
    degree360CredoBonus,
    totalScore,
    isComplete: mboScore != null,
  };
};
