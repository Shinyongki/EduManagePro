import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck } from 'lucide-react';
import { GWANGYEOK_MANAGERS, GWANGYEOK_MANAGER_MAPPING } from '@/constants/managers';
import { saveSelectedManager, loadSelectedManager } from '@/lib/manager-storage';

interface ManagerSelectorProps {
  onManagerSelect: (manager: string) => void;
  showAllOption?: boolean;
  className?: string;
}

/**
 * 담당자 선택 컴포넌트
 *
 * 광역담당자를 선택하여 데이터 필터링을 최적화합니다.
 */
export default function ManagerSelector({
  onManagerSelect,
  showAllOption = true,
  className = ''
}: ManagerSelectorProps) {
  const [selectedManager, setSelectedManager] = useState<string>('all');

  // 초기 로드 시 저장된 담당자 불러오기
  useEffect(() => {
    const saved = loadSelectedManager();
    setSelectedManager(saved);
    onManagerSelect(saved);
  }, []);

  // 담당자별 기관 수 계산
  const getManagerInstitutionCount = (manager: string): number => {
    if (manager === 'all') {
      return Object.keys(GWANGYEOK_MANAGER_MAPPING).length;
    }
    return Object.values(GWANGYEOK_MANAGER_MAPPING).filter(m => m === manager).length;
  };

  const handleManagerSelect = (manager: string) => {
    setSelectedManager(manager);
    saveSelectedManager(manager);
    onManagerSelect(manager);
  };

  const managers = showAllOption ? ['all', ...GWANGYEOK_MANAGERS] : [...GWANGYEOK_MANAGERS];

  return (
    <Card className={`border-2 border-blue-200 bg-blue-50/50 ${className}`}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">담당자 선택</CardTitle>
        </div>
        <CardDescription>
          담당자를 선택하면 해당 기관의 데이터만 로딩되어 성능이 향상됩니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {managers.map(manager => {
            const isSelected = selectedManager === manager;
            const institutionCount = getManagerInstitutionCount(manager);
            const displayName = manager === 'all' ? '전체' : manager;

            return (
              <Button
                key={manager}
                variant={isSelected ? 'default' : 'outline'}
                className={`h-auto flex flex-col items-center gap-2 p-4 ${
                  isSelected
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'hover:bg-blue-100 hover:border-blue-300'
                }`}
                onClick={() => handleManagerSelect(manager)}
              >
                <div className="flex items-center gap-2">
                  {isSelected && <UserCheck className="w-4 h-4" />}
                  <span className="font-semibold">{displayName}</span>
                </div>
                <Badge
                  variant={isSelected ? 'secondary' : 'outline'}
                  className={isSelected ? 'bg-blue-800 text-white' : ''}
                >
                  {institutionCount}개 기관
                </Badge>
              </Button>
            );
          })}
        </div>

        {selectedManager !== 'all' && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">{selectedManager}</span> 담당자의{' '}
              <span className="font-semibold">{getManagerInstitutionCount(selectedManager)}개 기관</span>
              {' '}데이터만 로딩됩니다
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
