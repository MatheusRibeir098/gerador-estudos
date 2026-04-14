import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  const speak = useCallback((text: string) => {
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/[|─┌┐└┘├┤┬┴┼═║╔╗╚╝╠╣╦╩╬]/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'pt-BR';
    utt.rate = 1;
    utt.onend = () => { setSpeaking(false); setPaused(false); };
    utt.onerror = () => { setSpeaking(false); setPaused(false); };
    utteranceRef.current = utt;
    setSpeaking(true);
    setPaused(false);
    window.speechSynthesis.speak(utt);
  }, []);

  const pause = useCallback(() => { window.speechSynthesis.pause(); setPaused(true); }, []);
  const resume = useCallback(() => { window.speechSynthesis.resume(); setPaused(false); }, []);
  const stop = useCallback(() => { window.speechSynthesis.cancel(); setSpeaking(false); setPaused(false); }, []);

  return { speaking, paused, speak, pause, resume, stop };
}
