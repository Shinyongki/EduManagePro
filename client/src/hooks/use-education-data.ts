import { useEffect, useState, useCallback } from 'react';
import { useEducationStore } from '@/store/education-store';

export function useEducationData() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const store = useEducationStore();

  useEffect(() => {
    let mounted = true;

    const loadCriticalData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // 대시보드에 필요한 핵심 데이터만 먼저 로드 (빠른 초기 로딩)
        await store.loadFromIndexedDB();
        
        if (mounted) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load critical education data:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load data');
          setIsLoading(false);
        }
      }
    };

    loadCriticalData();

    return () => {
      mounted = false;
    };
  }, []); // 의존성 제거로 한 번만 실행

  // 특정 데이터를 필요시에만 로드하는 함수
  const loadLazyData = useCallback(async (type: 'basic' | 'advanced' | 'participant' | 'employee') => {
    try {
      await store.loadSpecificData(type);
    } catch (err) {
      console.error(`Failed to load ${type} data:`, err);
    }
  }, [store.loadSpecificData]); // 안정적인 메서드만 의존성으로

  // 강제 리로드 함수 (이미 로드된 데이터도 다시 로드)
  const forceReloadData = useCallback(async (type: 'basic' | 'advanced' | 'participant' | 'employee') => {
    try {
      await store.forceReloadData(type);
    } catch (err) {
      console.error(`Failed to force reload ${type} data:`, err);
    }
  }, [store.forceReloadData]);

  return {
    ...store,
    isLoading,
    error,
    loadLazyData,
    forceReloadData,
    retry: () => {
      setError(null);
      store.loadFromIndexedDB().catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    }
  };
}