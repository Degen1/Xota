import { useCallback, useState } from 'react';

export function useExtraLifeReward() {
  const [isGrantingLife, setIsGrantingLife] = useState(false);

  const showForExtraLife = useCallback(async () => {
    if (isGrantingLife) {
      return false;
    }

    setIsGrantingLife(true);
    try {
      return true;
    } finally {
      setIsGrantingLife(false);
    }
  }, [isGrantingLife]);

  return {
    isGrantingLife,
    showForExtraLife,
  };
}
