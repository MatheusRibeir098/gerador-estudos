import { z } from 'zod';

export const quizAttemptSchema = z.object({
  totalQuestions: z.number().int().positive(),
  correctAnswers: z.number().int().min(0),
  answers: z.array(
    z.object({
      quizId: z.number().int(),
      selectedIndex: z.number().int(),
      correct: z.boolean(),
    })
  ),
});
