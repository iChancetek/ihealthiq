import { useState, useCallback } from "react";

export function useVoice() {
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const toggleVoice = useCallback(() => {
    setIsVoiceActive(prev => !prev);
  }, []);

  const startVoice = useCallback(() => {
    setIsVoiceActive(true);
  }, []);

  const stopVoice = useCallback(() => {
    setIsVoiceActive(false);
  }, []);

  return {
    isVoiceActive,
    toggleVoice,
    startVoice,
    stopVoice
  };
}