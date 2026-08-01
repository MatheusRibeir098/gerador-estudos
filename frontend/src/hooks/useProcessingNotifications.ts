import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { getSubjects } from '../api/subjects';
import type { Subject } from '../types/subject';

interface Notification {
  id: number;
  title: string;
}

export function useProcessingNotifications() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const processingRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    refetchInterval: (query) => {
      const data = query.state.data as Subject[] | undefined;
      return data?.some(s => s.status === 'processing') ? 10000 : false;
    },
  });

  useEffect(() => {
    if (!subjects) return;

    const currentProcessing = new Set<number>();
    for (const s of subjects) {
      if (s.status === 'processing') currentProcessing.add(s.id);
    }

    if (!initializedRef.current) {
      processingRef.current = currentProcessing;
      initializedRef.current = true;
      return;
    }

    for (const s of subjects) {
      if (s.status === 'completed' && processingRef.current.has(s.id)) {
        const isOnProcessingPage = location.pathname === `/subjects/${s.id}/processing`;
        if (!isOnProcessingPage) {
          setNotifications(prev =>
            prev.some(n => n.id === s.id) ? prev : [...prev, { id: s.id, title: s.title }]
          );
        }
        queryClient.invalidateQueries({ queryKey: ['subjects'] });
      }
    }

    processingRef.current = currentProcessing;
  }, [subjects, location.pathname, queryClient]);

  const dismiss = (id: number) => setNotifications(prev => prev.filter(n => n.id !== id));

  return { notifications, dismiss };
}
