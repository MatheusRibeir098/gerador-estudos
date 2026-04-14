import { api } from './client';
import type { Subject, SubjectDetail, CreateSubjectInput, CreateExamSubjectInput, ProcessingStatus } from '../types/subject';

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await api.get<{ data: Subject[] }>('/subjects');
  return data.data;
}

export async function getSubject(id: number): Promise<SubjectDetail> {
  const { data } = await api.get<SubjectDetail>(`/subjects/${id}`);
  return data;
}

export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const { data } = await api.post<Subject>('/subjects', { ...input, contentOptions: input.contentOptions });
  return data;
}

export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

export async function getProcessingStatus(id: number): Promise<ProcessingStatus> {
  const { data } = await api.get<ProcessingStatus>(`/subjects/${id}/status`);
  return data;
}

export async function createExamSubject(input: CreateExamSubjectInput): Promise<Subject> {
  const formData = new FormData();
  formData.append('title', input.title);
  if (input.description) formData.append('description', input.description);
  if (input.text) formData.append('text', input.text);
  if (input.files) {
    for (const file of input.files) formData.append('files', file);
  }
  if (input.contentOptions) formData.append('contentOptions', JSON.stringify(input.contentOptions));
  const { data } = await api.post<Subject>('/subjects/from-exam', formData);
  return data;
}

export async function resolvePlaylist(url: string): Promise<{ url: string; title: string | null }[]> {
  const { data } = await api.get<{ data: { url: string; title: string | null }[]; total: number }>('/playlist', { params: { url } });
  return data.data;
}
