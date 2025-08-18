import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Database, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { snapshotManager } from '@/lib/snapshot-manager';

interface MigrationStatus {
  employeeCount: number;
  participantCount: number;
  basicEducationCount: number;
  advancedEducationCount: number;
  institutionCount: number;
  totalCount: number;
}

export function DataMigration() {
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [hasSnapshot, setHasSnapshot] = useState<boolean | null>(null);
  const [migrationComplete, setMigrationComplete] = useState(false);
  const { toast } = useToast();

  // 현재 데이터 현황 확인
  const checkCurrentData = async () => {
    setIsChecking(true);
    try {
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const db = new IndexedDBStorage();

      // 기존 데이터 수집
      const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
        db.getItem('employeeData') || [],
        db.getItem('participantData') || [],
        db.getItem('basicEducationData') || [],
        db.getItem('advancedEducationData') || [],
        db.getItem('institutionData') || []
      ]);

      const status: MigrationStatus = {
        employeeCount: employeeData.length,
        participantCount: participantData.length,
        basicEducationCount: basicEducationData.length,
        advancedEducationCount: advancedEducationData.length,
        institutionCount: institutionData.length,
        totalCount: employeeData.length + participantData.length + basicEducationData.length + advancedEducationData.length + institutionData.length
      };

      setMigrationStatus(status);

      // 스냅샷 존재 여부 확인
      const snapshots = await snapshotManager.getAvailableDates();
      setHasSnapshot(snapshots.length > 0);

      console.log('📊 현재 데이터 현황:', status);
      console.log('📸 기존 스냅샷:', snapshots.length);

    } catch (error) {
      console.error('데이터 확인 실패:', error);
      toast({
        title: "데이터 확인 실패",
        description: "현재 데이터를 확인할 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  // 마이그레이션 실행
  const performMigration = async () => {
    if (!migrationStatus) return;

    setIsMigrating(true);
    try {
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const db = new IndexedDBStorage();

      // 기존 데이터 다시 수집 (최신 상태)
      const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
        db.getItem('employeeData') || [],
        db.getItem('participantData') || [],
        db.getItem('basicEducationData') || [],
        db.getItem('advancedEducationData') || [],
        db.getItem('institutionData') || []
      ]);

      // 오늘 날짜로 첫 번째 스냅샷 생성
      const today = new Date().toISOString().split('T')[0];

      await snapshotManager.createSnapshot(
        today,
        {
          employeeData,
          participantData,
          basicEducationData,
          advancedEducationData,
          institutionData
        },
        '기존 데이터 마이그레이션 - 첫 번째 스냅샷'
      );

      setMigrationComplete(true);
      setHasSnapshot(true);

      toast({
        title: "마이그레이션 완료",
        description: `${today} 날짜로 첫 번째 스냅샷이 생성되었습니다.`,
      });

      console.log(`✅ 마이그레이션 완료! ${today} 날짜로 첫 번째 스냅샷 생성`);

    } catch (error) {
      console.error('마이그레이션 실패:', error);
      toast({
        title: "마이그레이션 실패",
        description: "데이터 마이그레이션 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          데이터 마이그레이션
        </CardTitle>
        <CardDescription>
          기존 데이터를 날짜별 스냅샷 시스템으로 마이그레이션합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* 단계 1: 현재 데이터 확인 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">1단계: 현재 데이터 확인</h4>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkCurrentData}
              disabled={isChecking}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? '확인 중...' : '데이터 확인'}
            </Button>
          </div>

          {migrationStatus && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div className="p-2 bg-blue-50 rounded border">
                <div className="font-medium text-blue-900">종사자</div>
                <div className="text-blue-700">{migrationStatus.employeeCount}명</div>
              </div>
              <div className="p-2 bg-green-50 rounded border">
                <div className="font-medium text-green-900">참가자</div>
                <div className="text-green-700">{migrationStatus.participantCount}명</div>
              </div>
              <div className="p-2 bg-yellow-50 rounded border">
                <div className="font-medium text-yellow-900">기본교육</div>
                <div className="text-yellow-700">{migrationStatus.basicEducationCount}개</div>
              </div>
              <div className="p-2 bg-purple-50 rounded border">
                <div className="font-medium text-purple-900">심화교육</div>
                <div className="text-purple-700">{migrationStatus.advancedEducationCount}개</div>
              </div>
              <div className="p-2 bg-gray-50 rounded border">
                <div className="font-medium text-gray-900">기관</div>
                <div className="text-gray-700">{migrationStatus.institutionCount}개</div>
              </div>
              <div className="p-2 bg-indigo-50 rounded border">
                <div className="font-medium text-indigo-900">전체</div>
                <div className="text-indigo-700">{migrationStatus.totalCount}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 상태 표시 */}
        {hasSnapshot !== null && (
          <Alert>
            {hasSnapshot ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {hasSnapshot ? (
                <div className="flex items-center gap-2">
                  <span>이미 스냅샷이 존재합니다.</span>
                  <Badge variant="default">마이그레이션 완료</Badge>
                </div>
              ) : (
                <span>아직 스냅샷이 없습니다. 마이그레이션이 필요합니다.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* 단계 2: 마이그레이션 실행 */}
        {migrationStatus && !hasSnapshot && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              <h4 className="font-medium">2단계: 마이그레이션 실행</h4>
            </div>
            
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                현재 데이터를 <strong>{new Date().toISOString().split('T')[0]}</strong> 날짜의 첫 번째 스냅샷으로 생성합니다.
                이 작업은 기존 데이터에 영향을 주지 않습니다.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={performMigration}
              disabled={isMigrating || migrationComplete}
              className="w-full"
            >
              <Database className="h-4 w-4 mr-2" />
              {isMigrating ? '마이그레이션 중...' : migrationComplete ? '마이그레이션 완료' : '마이그레이션 시작'}
            </Button>
          </div>
        )}

        {/* 완료 메시지 */}
        {migrationComplete && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>마이그레이션이 성공적으로 완료되었습니다!</strong>
              <br />이제 날짜별 데이터 관리 시스템을 사용할 수 있습니다.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}