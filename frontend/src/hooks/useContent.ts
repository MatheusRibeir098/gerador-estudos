import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getStudyPlan,
  getSummaries,
  getQuizzes,
  getExamRadar,
  submitQuizAttempt,
  getQuizAttempts,
  getStudyContent,
  getFlashcards,
} from '../api/content';

export function useStudyPlan(subjectId: number) {
  return useQuery({ queryKey: ['study-plan', subjectId], queryFn: () => getStudyPlan(subjectId), enabled: !!subjectId });
}

export function useSummaries(subjectId: number) {
  return useQuery({ queryKey: ['summaries', subjectId], queryFn: () => getSummaries(subjectId), enabled: !!subjectId });
}

export function useQuizzes(subjectId: number) {
  return useQuery({ queryKey: ['quizzes', subjectId], queryFn: () => getQuizzes(subjectId), enabled: !!subjectId });
}

export function useExamRadar(subjectId: number) {
  return useQuery({ queryKey: ['exam-radar', subjectId], queryFn: () => getExamRadar(subjectId), enabled: !!subjectId });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ subjectId, input }: { subjectId: number; input: Parameters<typeof submitQuizAttempt>[1] }) =>
      submitQuizAttempt(subjectId, input),
    onSuccess: (_data, { subjectId }) => queryClient.invalidateQueries({ queryKey: ['quiz-attempts', subjectId] }),
  });
}

export function useQuizAttempts(subjectId: number) {
  return useQuery({ queryKey: ['quiz-attempts', subjectId], queryFn: () => getQuizAttempts(subjectId), enabled: !!subjectId });
}

export function useStudyContent(subjectId: number) {
  return useQuery({ queryKey: ['study-content', subjectId], queryFn: () => getStudyContent(subjectId), enabled: !!subjectId });
}

export function useFlashcards(subjectId: number) {
  return useQuery({ queryKey: ['flashcards', subjectId], queryFn: () => getFlashcards(subjectId), enabled: !!subjectId });
}
