import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSubjects,
  getSubject,
  createSubject,
  deleteSubject,
  getProcessingStatus,
} from '../api/subjects';

export function useSubjects() {
  return useQuery({ queryKey: ['subjects'], queryFn: getSubjects });
}

export function useSubject(id: number) {
  return useQuery({ queryKey: ['subjects', id], queryFn: () => getSubject(id), enabled: !!id });
}

export function useCreateSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });
}

export function useDeleteSubject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteSubject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subjects'] }),
  });
}

export function useProcessingStatus(id: number, enabled: boolean) {
  return useQuery({
    queryKey: ['processing', id],
    queryFn: () => getProcessingStatus(id),
    enabled,
    refetchInterval: 3000,
  });
}
