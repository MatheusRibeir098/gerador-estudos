import { api } from './client';
import type { Subject, SubjectDetail, CreateSubjectInput, ProcessingStatus } from '../types/subject';

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await api.get<{ data: Subject[] }>('/subjects');
  return data.data;
}

export async function getSubject(id: number): Promise<SubjectDetail> {
  const { data } = await api.get<SubjectDetail>(`/subjects/${id}`);
  return data;
}

export async function createSubject(input: CreateSubjectInput): Promise<Subject> {
  const { data } = await api.post<Subject>('/subjects', input);
  return data;
}

export async function deleteSubject(id: number): Promise<void> {
  await api.delete(`/subjects/${id}`);
}

export async function getProcessingStatus(id: number): Promise<ProcessingStatus> {
  const { data } = await api.get<ProcessingStatus>(`/subjects/${id}/status`);
  return data;
}
