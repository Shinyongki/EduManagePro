import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEducationData } from '@/hooks/use-education-data';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateUploadForm } from "@/components/snapshot/date-upload-form";
import { snapshotManager } from "@/lib/snapshot-manager";

export default function BasicEducationPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { basicEducationData, setBasicEducationData, loadLazyData, isLoaded, forceReloadData } = useEducationData();

  // 컴포넌트 마운트 시 기본 교육 데이터 로드
  useEffect(() => {
    if (!isLoaded?.basicEducation) {
      console.log('🔄 Loading basic education data...');
      loadLazyData('basic');
    }
  }, [isLoaded?.basicEducation]); // loadLazyData 제거

  // API 호출 비활성화 - IndexedDB 데이터만 사용
  // useEffect(() => {
  //   fetchBasicEducationData();
  // }, []);

  // 탭 변경시 강제 리로드 비활성화 (데이터 덮어쓰기 방지)
  // useEffect(() => {
  //   if (activeTab === 'list' && basicEducationData.length > 0) {
  //     console.log('🔄 Forcing reload of other education data after basic education upload...');
  //     forceReloadData('advanced');
  //     forceReloadData('participant');
  //   }
  // }, [activeTab, basicEducationData.length]);

  const fetchBasicEducationData = async () => {
    setIsLoading(true);
    try {
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const indexedData = await educationDB.getItem<any[]>('basicEducationData');
      
      console.log(`🗃️ IndexedDB에서 기본교육 데이터 로드: ${indexedData?.length || 0}개`);
      
      if (indexedData && indexedData.length > 0) {
        setBasicEducationData(indexedData);
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/education/basic');
        if (response.ok) {
          const data = await response.json();
          setBasicEducationData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch basic education data:', error);
    } finally {
      setIsLoading(false);
    }
  };


  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'basic');

      const response = await fetch('/api/education/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 서버에서 모든 데이터 가져오기
      const [employeeResponse, participantResponse, basicResponse, advancedResponse, institutionResponse] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/participants'),
        fetch('/api/education/basic'),
        fetch('/api/education/advanced'),
        fetch('/api/institutions')
      ]);

      const [employeeData, participantData, basicEducationData, advancedEducationData, institutionData] = await Promise.all([
        employeeResponse.ok ? employeeResponse.json() : [],
        participantResponse.ok ? participantResponse.json() : [],
        basicResponse.ok ? basicResponse.json() : [],
        advancedResponse.ok ? advancedResponse.json() : [],
        institutionResponse.ok ? institutionResponse.json() : []
      ]);

      // 날짜별 스냅샷 생성
      await snapshotManager.createSnapshot(
        date,
        {
          employeeData,
          participantData,
          basicEducationData,
          advancedEducationData,
          institutionData
        },
        description
      );

      // IndexedDB 동기화
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      await educationDB.setItem('basicEducationData', basicEducationData);
      setBasicEducationData(basicEducationData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 기본교육 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 기본교육 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('모든 기본교육 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/education/basic/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 기본교육 데이터가 삭제되었습니다.",
      });

      // 스토어 및 IndexedDB 데이터 즉시 초기화
      setBasicEducationData([]);
      
      // IndexedDB 클리어
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        await educationDB.setItem('basicEducationData', []);
        console.log('🗃️ IndexedDB basicEducationData 클리어 완료');
      } catch (e) {
        console.warn('IndexedDB 클리어 실패:', e);
      }

      // localStorage 강제 클리어 (Zustand persist 때문에)
      try {
        localStorage.removeItem('education-store');
      } catch (e) {
        console.warn('localStorage 클리어 실패:', e);
      }

    } catch (error) {
      toast({
        title: "초기화 실패",
        description: error instanceof Error ? error.message : "데이터 초기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };


  // 데이터 필터링 및 페이지네이션
  const filteredData = basicEducationData.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.course?.toLowerCase().includes(searchLower) ||
      item.institution?.toLowerCase().includes(searchLower) ||
      item.id?.toLowerCase().includes(searchLower) ||
      item.institutionCode?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // 페이지 변경 시 스크롤 상단으로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

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
          <h1 className="text-3xl font-bold">기본 교육 데이터 관리</h1>
          <p className="text-muted-foreground mt-2">
            기본 교육 수료 데이터를 업로드하고 관리합니다
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            데이터 업로드
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            데이터 목록 ({basicEducationData.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="space-y-6">
            <DateUploadForm
              onUpload={handleDateUpload}
              isUploading={isUploading}
              title="기본교육 데이터 업로드"
              description="Excel 파일을 통해 기본교육 수료 데이터를 특정 날짜 기준으로 업로드합니다"
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">데이터 관리</CardTitle>
              <CardDescription>기본 교육 데이터를 관리합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={handleClearData}
                disabled={isLoading || !basicEducationData || basicEducationData.length === 0}
              >
                데이터 초기화
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <List className="h-5 w-5" />
                    기본 교육 데이터 목록
                  </CardTitle>
                  <CardDescription>
                    업로드된 기본 교육 수료 데이터를 조회합니다
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchBasicEducationData}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground">데이터를 불러오는 중...</div>
                </div>
              ) : basicEducationData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 기본 교육 데이터가 없습니다.
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('upload')}
                  >
                    데이터 업로드하기
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-muted rounded-md">
                          <div className="text-lg font-semibold">{filteredData.length}개</div>
                          <div className="text-xs text-muted-foreground">
                            {searchTerm ? `검색된 데이터 (전체 ${basicEducationData.length}개)` : '총 기본 교육 데이터'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Input
                          placeholder="이름, 기관, 과정명, ID로 검색..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1); // 검색 시 첫 페이지로
                          }}
                          className="w-full sm:w-64"
                        />
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="25">25개씩</SelectItem>
                            <SelectItem value="50">50개씩</SelectItem>
                            <SelectItem value="100">100개씩</SelectItem>
                            <SelectItem value="200">200개씩</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          이전
                        </Button>
                        <div className="flex items-center gap-1">
                          {[...Array(Math.min(5, totalPages))].map((_, i) => {
                            const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                            if (pageNum > totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={pageNum === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          다음
                        </Button>
                        <span className="text-sm text-muted-foreground ml-2">
                          {currentPage} / {totalPages} 페이지
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="rounded-md border">
                    <div className="overflow-auto max-h-[800px] w-full">
                      <Table className="table-fixed w-full" style={{ minWidth: '6000px' }}>
                        <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                          <TableRow>
                            <TableHead className="w-16 text-center bg-background border-b border-r">연번</TableHead>
                            <TableHead className="w-28 bg-background border-b border-r">년도/차수</TableHead>
                            <TableHead className="w-60 bg-background border-b border-r">과정명</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">교육신청일자</TableHead>
                            <TableHead className="w-28 text-center bg-background border-b border-r">기관코드</TableHead>
                            <TableHead className="w-48 bg-background border-b border-r">수행기관명</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">유형</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">시도</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">시군구</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">직군</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">수강생명</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">ID</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">특화</TableHead>
                            <TableHead className="w-28 text-center bg-background border-b border-r">중간관리자</TableHead>
                            <TableHead className="w-28 text-center bg-background border-b border-r">최고관리자</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">신규과정대상</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">교육시간</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">진도율</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">점수</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">수료여부</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">수료일</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">상태</TableHead>
                            <TableHead className="w-40 text-center bg-background border-b border-r">교육분류(VLOOKUP)</TableHead>
                            <TableHead className="w-48 text-center bg-background border-b">복합키(CONCAT)</TableHead>
                          </TableRow>
                        </TableHeader>
                      <TableBody>
                        {currentData.map((item, index) => (
                          <TableRow key={index} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-center border-r">{item.serialNumber || String(startIndex + index + 1)}</TableCell>
                            <TableCell className="border-r">{item.year || item.yearTerm || item.grade || '-'}</TableCell>
                            <TableCell className="border-r" title={item.course}>
                              <div className="max-w-full overflow-hidden text-ellipsis">
                                {item.course}
                              </div>
                            </TableCell>
                            <TableCell className="text-center border-r">
                              {item.applicationDate ? (() => {
                                try {
                                  if (item.applicationDate instanceof Date) {
                                    return item.applicationDate.toLocaleDateString('ko-KR');
                                  }
                                  const date = new Date(item.applicationDate);
                                  return isNaN(date.getTime()) ? item.applicationDate : date.toLocaleDateString('ko-KR');
                                } catch (e) {
                                  return item.applicationDate;
                                }
                              })() : '-'}
                            </TableCell>
                            <TableCell className="text-center border-r font-mono">{item.institutionCode}</TableCell>
                            <TableCell className="border-r" title={item.institution}>
                              <div className="max-w-full overflow-hidden text-ellipsis">
                                {item.institution}
                              </div>
                            </TableCell>
                            <TableCell className="text-center border-r">{item.institutionType || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.region || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.district || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.jobType || '-'}</TableCell>
                            <TableCell className="font-medium text-center border-r">{item.name}</TableCell>
                            <TableCell className="text-center border-r font-mono">{item.id}</TableCell>
                            <TableCell className="text-center border-r">{item.specialization || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.middleManager || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.topManager || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.targetInfo || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.educationHours || '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.progress ? `${item.progress}%` : '-'}</TableCell>
                            <TableCell className="text-center border-r">{item.score || '-'}</TableCell>
                            <TableCell className="text-center border-r">
                              <Badge variant={
                                item.status === '수료' ? 'default' : 
                                item.status === '수강취소' ? 'secondary' : 
                                'destructive'
                              } className="text-xs">
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center border-r">
                              {item.completionDate ? (() => {
                                try {
                                  if (item.completionDate instanceof Date) {
                                    return item.completionDate.toLocaleDateString('ko-KR');
                                  }
                                  const date = new Date(item.completionDate);
                                  return isNaN(date.getTime()) ? item.completionDate : date.toLocaleDateString('ko-KR');
                                } catch (e) {
                                  return item.completionDate;
                                }
                              })() : '-'}
                            </TableCell>
                            <TableCell className="text-center border-r">
                              <Badge variant="outline" className="text-xs">{item.rawStatus || '-'}</Badge>
                            </TableCell>
                            <TableCell className="text-center border-r" title={item.categoryVlookup}>
                              <Badge variant="secondary" className="text-xs">{item.categoryVlookup || '-'}</Badge>
                            </TableCell>
                            <TableCell className="text-center" title={item.concatenatedKey}>
                              <div className="max-w-full overflow-hidden text-ellipsis font-mono text-xs">
                                {item.concatenatedKey || '-'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}