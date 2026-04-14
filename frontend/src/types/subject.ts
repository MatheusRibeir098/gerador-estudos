export interface Subject {
  id: number;
  title: string;
  description: string | null;
  sourceType?: 'youtube' | 'exam';
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalLessons: number;
  processedLessons: number;
  createdAt: string;
}

export interface CreateExamSubjectInput {
  title: string;
  description?: string;
  text?: string;
  files?: File[];
  contentOptions?: ContentOptions;
}

export interface Lesson {
  id: number;
  youtubeUrl: string;
  youtubeTitle: string | null;
  durationSeconds: number | null;
  status: 'pending' | 'transcribing' | 'transcribed' | 'error';
  transcriptMethod: 'youtube' | 'whisper' | null;
  orderIndex: number;
}

export interface SubjectDetail extends Subject {
  lessons: Lesson[];
}

export interface CreateSubjectInput {
  title: string;
  description?: string;
  youtubeUrls: string[];
  contentOptions?: ContentOptions;
}

export interface ContentOptions {
  studyContent: boolean;
  summary: boolean;
  examRadar: boolean;
  quiz: boolean;
  studyPlan: boolean;
}

export interface ProcessingStatus {
  subjectId: number;
  status: string;
  sourceType?: string;
  totalLessons: number;
  processedLessons: number;
  currentStep: string;
  lessons: { id: number; status: string; youtubeTitle: string | null; aiGenerated: boolean }[];
}
