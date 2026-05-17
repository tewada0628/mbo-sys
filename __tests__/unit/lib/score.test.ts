import {
  calculateDegree360AchievementBonus,
  calculateDegree360CredoBonus,
  calculateEvaluationScore,
  calculateMboScore,
  scoreToMboPoints,
} from '@/lib/score';

describe('score calculation', () => {
  describe('scoreToMboPoints', () => {
    it.each([
      [1.2, 120],
      [1.0, 100],
      [0.8, 80],
      [0.5, 50],
      [-0.2, 0],
    ])('maps evaluation score %s to %s MBO points', (score, expected) => {
      expect(scoreToMboPoints(score)).toBe(expected);
    });
  });

  describe('calculateMboScore', () => {
    it('calculates weighted MBO score from manager scores', () => {
      expect(calculateMboScore([
        { weight: 40, score: 1.2 },
        { weight: 40, score: 1.0 },
        { weight: 20, score: 0.8 },
      ])).toBe(104);
    });

    it('returns null when at least one goal score is missing', () => {
      expect(calculateMboScore([
        { weight: 50, score: 1.0 },
        { weight: 50, score: null },
      ])).toBeNull();
    });
  });

  describe('360 degree bonuses', () => {
    it('adds achievement bonus only when score is 4.5+ and top 20%', () => {
      expect(calculateDegree360AchievementBonus({
        achievementScore: 4.5,
        credoScore: 6.0,
        isTop20Achievement: true,
      })).toBe(10);
      expect(calculateDegree360AchievementBonus({
        achievementScore: 4.5,
        credoScore: 6.0,
        isTop20Achievement: false,
      })).toBe(0);
      expect(calculateDegree360AchievementBonus({
        achievementScore: 4.49,
        credoScore: 6.0,
        isTop20Achievement: true,
      })).toBe(0);
    });

    it('adds credo bonus using grade-specific thresholds', () => {
      expect(calculateDegree360CredoBonus({
        achievementScore: 4.0,
        credoScore: 6.5,
        isTop20Achievement: false,
      }, 5)).toBe(3);
      expect(calculateDegree360CredoBonus({
        achievementScore: 4.0,
        credoScore: 6.0,
        isTop20Achievement: false,
      }, 4)).toBe(3);
      expect(calculateDegree360CredoBonus({
        achievementScore: 4.0,
        credoScore: 5.9,
        isTop20Achievement: false,
      }, 4)).toBe(0);
    });
  });

  it('calculates final score preview with MBO and 360 degree bonuses', () => {
    expect(calculateEvaluationScore(
      [
        { weight: 50, score: 1.2 },
        { weight: 50, score: 1.0 },
      ],
      {
        achievementScore: 4.6,
        credoScore: 6.5,
        isTop20Achievement: true,
      },
      5,
    )).toEqual({
      mboScore: 110,
      degree360AchievementBonus: 10,
      degree360CredoBonus: 3,
      totalScore: 123,
      isComplete: true,
    });
  });
});
