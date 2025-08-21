import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import EmployeeStatistics from '@/components/employees/employee-statistics';
import { useEmployeeStore } from '@/store/employee-store';

function EmployeeStatsPage() {
  const { loadEmployeeData } = useEmployeeStore();

  useEffect(() => {
    // 페이지 로드 시 종사자 데이터를 자동으로 로딩
    loadEmployeeData();
  }, [loadEmployeeData]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                대시보드로 돌아가기
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold">종사자 통계</h1>
          <p className="text-muted-foreground mt-2">
            종사자 현황에 대한 포괄적인 통계 분석입니다
          </p>
        </div>
      </div>

      {/* 향상된 종사자 통계 컴포넌트 */}
      <EmployeeStatistics />
    </div>
  );
}

export default EmployeeStatsPage;