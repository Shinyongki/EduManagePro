import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/card';
import { Users } from 'lucide-react';

function EmployeeStatsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [employeeData, setEmployeeData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch('/api/employees?page=1&limit=10000');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log('Fetched data:', result);
        setEmployeeData(result.data || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">종사자 통계</h1>
        <Card className="p-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-500">데이터를 불러오는 중...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">종사자 통계</h1>
        <Card className="p-12">
          <div className="text-center">
            <p className="text-red-500">오류: {error}</p>
          </div>
        </Card>
      </div>
    );
  }

  const activeEmployees = employeeData.filter((e: any) => e.isActive);
  const inactiveEmployees = employeeData.filter((e: any) => !e.isActive);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">종사자 통계</h1>
      
      {employeeData.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">종사자 데이터가 없습니다</h3>
            <p className="text-gray-500">종사자 관리 &gt; 종사자 데이터 메뉴에서 데이터를 업로드해주세요.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-500">전체 종사자</p>
                <p className="text-2xl font-bold">{employeeData.length}명</p>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-500">재직자</p>
                <p className="text-2xl font-bold text-green-600">{activeEmployees.length}명</p>
              </div>
            </Card>
            <Card className="p-4">
              <div>
                <p className="text-sm text-gray-500">퇴직자</p>
                <p className="text-2xl font-bold text-red-600">{inactiveEmployees.length}명</p>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">직무별 현황</h3>
            <div className="space-y-2">
              {Object.entries(
                activeEmployees.reduce((acc: any, emp: any) => {
                  const jobType = emp.jobType || '미분류';
                  acc[jobType] = (acc[jobType] || 0) + 1;
                  return acc;
                }, {})
              ).map(([jobType, count]) => (
                <div key={jobType} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm">{jobType}</span>
                  <span className="font-medium">{count as number}명</span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default EmployeeStatsPage;