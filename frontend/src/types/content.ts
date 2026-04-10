export interface StudyPlan {
  id: number;
  subjectId: number;
  content: string;
  createdAt: string;
}

export interface Summary {
  id: number;
  lessonId: number;
  youtubeTitle: string;
  content: string;
  keyTopics: string[];
  createdAt: string;
}

export interface QuizQuestion {
  id: number;
  lessonId: number | null;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ExamRadarItem {
  id: number;
  lessonId: number | null;
  topic: string;
  relevance: 'high' | 'medium' | 'low';
  professorQuote: string | null;
  reasoning: string;
}

export interface QuizAttempt {
  id: number;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  createdAt: string;
}

export interface QuizAttemptInput {
  totalQuestions: number;
  correctAnswers: number;
  answers: { quizId: number; selectedIndex: number; correct: boolean }[];
}
