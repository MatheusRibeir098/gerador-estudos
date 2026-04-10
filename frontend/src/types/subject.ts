export interface Subject {
  id: number;
  title: string;
  description: string | null;
  status: 'pending' | 'processing' | 'completed' | 'error';
  totalLessons: number;
  processedLessons: number;
  createdAt: string;
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
}

export interface ProcessingStatus {
  subjectId: number;
  status: string;
  totalLessons: number;
  processedLessons: number;
  currentStep: string;
  lessons: { id: number; status: string; youtubeTitle: string | null }[];
}
