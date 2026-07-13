import { useEffect } from 'react';
import { useProfile } from './useProfile';

export function useAccessibility() {
  const profile = useProfile();

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(profile.fontScale ?? 1));
  }, [profile.fontScale]);
}
