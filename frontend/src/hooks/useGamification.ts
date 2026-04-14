import { useState, useCallback, useRef } from 'react';

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastStudyDate: string | null;
  achievements: string[];
}

const LEVELS = [
  { name: 'Iniciante', xp: 0 },
  { name: 'Estudante', xp: 100 },
  { name: 'Dedicado', xp: 300 },
  { name: 'Avançado', xp: 600 },
  { name: 'Mestre', xp: 1000 },
  { name: 'Lenda', xp: 2000 },
];

const ACHIEVEMENT_NAMES: Record<string, string> = {
  'first-subject': 'Primeira Matéria',
  'first-quiz': 'Primeiro Quiz',
  'perfect-quiz': 'Quiz Perfeito',
  'streak-3': '3 Dias Seguidos',
  'streak-7': '7 Dias Seguidos',
  'streak-30': '30 Dias Seguidos',
  'xp-100': '100 XP',
  'xp-500': '500 XP',
  'xp-1000': '1000 XP',
  'all-slides': 'Slides Completos',
  'flashcard-master': 'Mestre dos Flashcards',
};

const STORAGE_KEY = 'studygen-gamification';
const today = () => new Date().toISOString().slice(0, 10);

function getLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return i;
  }
  return 0;
}

function load(): GamificationState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const s = JSON.parse(saved);
      return { xp: s.xp || 0, level: getLevel(s.xp || 0), streak: s.streak || 0, lastStudyDate: s.lastStudyDate || null, achievements: s.achievements || [] };
    }
  } catch {}
  return { xp: 0, level: 0, streak: 0, lastStudyDate: null, achievements: [] };
}

function save(state: GamificationState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function useGamification() {
  const [state, setState] = useState<GamificationState>(load);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fcCountRef = useRef<number>((() => {
    try { return JSON.parse(localStorage.getItem('studygen-fc-count') || '0'); } catch { return 0; }
  })());

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const addXP = useCallback((amount: number, action: string) => {
    setState(prev => {
      const d = today();
      let streak = prev.streak;
      if (prev.lastStudyDate) {
        const last = new Date(prev.lastStudyDate);
        const now = new Date(d);
        const diff = Math.floor((now.getTime() - last.getTime()) / 86400000);
        if (diff === 1) streak++;
        else if (diff > 1) streak = 1;
      } else {
        streak = 1;
      }

      const xp = prev.xp + amount;
      const level = getLevel(xp);
      const achievements = [...prev.achievements];
      const unlock = (id: string) => {
        if (!achievements.includes(id)) {
          achievements.push(id);
          showToast(ACHIEVEMENT_NAMES[id] || id);
        }
      };

      if (action === 'create-subject') unlock('first-subject');
      if (action === 'complete-quiz') unlock('first-quiz');
      if (action === 'perfect-quiz') unlock('perfect-quiz');
      if (action === 'complete-chunk') unlock('all-slides');
      if (action === 'review-flashcard') {
        const count = (typeof fcCountRef.current === 'number' ? fcCountRef.current : 0) + 1;
        fcCountRef.current = count;
        localStorage.setItem('studygen-fc-count', String(count));
        if (count >= 50) unlock('flashcard-master');
      }
      if (streak >= 3) unlock('streak-3');
      if (streak >= 7) unlock('streak-7');
      if (streak >= 30) unlock('streak-30');
      if (xp >= 100) unlock('xp-100');
      if (xp >= 500) unlock('xp-500');
      if (xp >= 1000) unlock('xp-1000');

      const next = { xp, level, streak, lastStudyDate: d, achievements };
      save(next);
      return next;
    });
  }, [showToast]);

  const getLevelName = useCallback(() => LEVELS[state.level].name, [state.level]);

  const getLevelProgress = useCallback(() => {
    const curr = LEVELS[state.level].xp;
    const next = state.level < LEVELS.length - 1 ? LEVELS[state.level + 1].xp : LEVELS[state.level].xp;
    if (next === curr) return 100;
    return Math.min(100, ((state.xp - curr) / (next - curr)) * 100);
  }, [state.xp, state.level]);

  return { state, addXP, getLevelName, getLevelProgress, toast, achievementNames: ACHIEVEMENT_NAMES };
}
