import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Database, Users, Building } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { snapshotManager } from '@/lib/snapshot-manager';
import { useToast } from '@/hooks/use-toast';

interface SnapshotSelectorProps {
  onSnapshotChange: (date: string | null) => void;
  className?: string;
}

export function SnapshotSelector({ onSnapshotChange, className }: SnapshotSelectorProps) {
  const [snapshots, setSnapshots] = useState<Array<{
    date: string;
    description: string;
    createdAt: string;
    metadata: any;
    isCurrent: boolean;
  }>>([]);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // 스냅샷 목록 로드
  const loadSnapshots = async () => {
    try {
      setIsLoading(true);
      const [metadata, current] = await Promise.all([
        snapshotManager.getSnapshotMetadata(),
        snapshotManager.getCurrentDate()
      ]);
      
      setSnapshots(metadata);
      setCurrentDate(current);
    } catch (error) {
      console.error('스냅샷 목록 로드 실패:', error);
      toast({
        title: "데이터 로드 실패",
        description: "스냅샷 목록을 불러올 수 없습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 스냅샷 변경
  const handleSnapshotChange = async (date: string) => {
    try {
      await snapshotManager.setCurrentSnapshot(date);
      setCurrentDate(date);
      onSnapshotChange(date);
      
      const snapshot = snapshots.find(s => s.date === date);
      toast({
        title: "기준 날짜 변경",
        description: `${date} 데이터로 분석 기준이 변경되었습니다.`,
      });
    } catch (error) {
      console.error('스냅샷 변경 실패:', error);
      toast({
        title: "변경 실패",
        description: "기준 날짜 변경에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 animate-pulse" />
            <span>날짜 정보 로드 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (snapshots.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>업로드된 데이터가 없습니다</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentSnapshot = snapshots.find(s => s.date === currentDate);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          분석 기준 날짜
        </CardTitle>
        <CardDescription className="text-xs">
          선택된 날짜의 데이터로 모든 분석이 수행됩니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={currentDate || ''} onValueChange={handleSnapshotChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="날짜를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {snapshots.map((snapshot) => (
              <SelectItem key={snapshot.date} value={snapshot.date}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex flex-col">
                    <div className="font-medium">{snapshot.date}</div>
                    <div className="text-xs text-muted-foreground">
                      {snapshot.description}
                    </div>
                  </div>
                  {snapshot.isCurrent && (
                    <Badge variant="default" className="ml-2 text-xs">현재</Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {currentSnapshot && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1 p-2 bg-muted rounded">
              <Users className="h-3 w-3" />
              <span className="font-medium">{currentSnapshot.metadata.totalEmployees}</span>
              <span className="text-muted-foreground">종사자</span>
            </div>
            <div className="flex items-center gap-1 p-2 bg-muted rounded">
              <Database className="h-3 w-3" />
              <span className="font-medium">{currentSnapshot.metadata.totalParticipants}</span>
              <span className="text-muted-foreground">참가자</span>
            </div>
            <div className="flex items-center gap-1 p-2 bg-muted rounded">
              <Building className="h-3 w-3" />
              <span className="font-medium">{currentSnapshot.metadata.totalInstitutions}</span>
              <span className="text-muted-foreground">기관</span>
            </div>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadSnapshots}
          className="w-full text-xs"
        >
          목록 새로고침
        </Button>
      </CardContent>
    </Card>
  );
}