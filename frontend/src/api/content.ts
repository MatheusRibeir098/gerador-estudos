import { api } from './client';
import type { StudyPlan, Summary, QuizQuestion, ExamRadarItem, QuizAttempt, QuizAttemptInput, ChatMessage, ChatResponse, StudyContent, Flashcard } from '../types/content';

export async function getStudyPlan(subjectId: number): Promise<StudyPlan> {
  const { data } = await api.get<StudyPlan>(`/subjects/${subjectId}/study-plan`);
  return data;
}

export async function getSummaries(subjectId: number): Promise<Summary[]> {
  const { data } = await api.get<{ data: Summary[] }>(`/subjects/${subjectId}/summaries`);
  return data.data;
}

export async function getQuizzes(subjectId: number): Promise<QuizQuestion[]> {
  const { data } = await api.get<{ data: QuizQuestion[] }>(`/subjects/${subjectId}/quizzes`);
  return data.data;
}

export async function getExamRadar(subjectId: number): Promise<ExamRadarItem[]> {
  const { data } = await api.get<{ data: ExamRadarItem[] }>(`/subjects/${subjectId}/exam-radar`);
  return data.data;
}

export async function submitQuizAttempt(subjectId: number, input: QuizAttemptInput): Promise<QuizAttempt> {
  const { data } = await api.post<QuizAttempt>(`/subjects/${subjectId}/quiz-attempts`, input);
  return data;
}

export async function getQuizAttempts(subjectId: number): Promise<QuizAttempt[]> {
  const { data } = await api.get<{ data: QuizAttempt[] }>(`/subjects/${subjectId}/quiz-attempts`);
  return data.data;
}

export async function sendChatMessage(
  lessonId: number,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const { data } = await api.post<ChatResponse>(`/content/${lessonId}/chat`, { message, history });
  return data.reply;
}

export async function getStudyContent(subjectId: number): Promise<StudyContent[]> {
  const { data } = await api.get<{ data: StudyContent[] }>(`/subjects/${subjectId}/study-content`);
  return data.data;
}

export async function getFlashcards(subjectId: number): Promise<Flashcard[]> {
  const { data } = await api.get<{ data: Flashcard[] }>(`/subjects/${subjectId}/flashcards`);
  return data.data;
}
