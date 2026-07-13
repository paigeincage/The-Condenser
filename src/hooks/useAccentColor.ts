import { useEffect } from 'react';
import { useProfile } from './useProfile';
import { applyAccent } from '../config/accents';

export function useAccentColor() {
  const profile = useProfile();
  useEffect(() => {
    applyAccent(profile.accentColor);
  }, [profile.accentColor]);
}
