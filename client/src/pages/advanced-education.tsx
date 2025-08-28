import React, { useState, useMemo, useEffect } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Award, BarChart3, RefreshCw, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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
import { extractSido, extractSigungu } from "@/utils/institution-matcher";

/**
 * 데이터 소스별 역할 정의:
 * 
 * 1. 모인우리 시스템 (3,104명):
 *    - employeeData: 종사자 기본 정보, 자격, 근속 정보
 *    - institutionData: 기관별 현황 및 예산 정보  
 *    - 담당 컬럼: A~H (자격현황, 근속현황, 예산지시 등록자 수)
 * 
 * 2. 배움터 시스템 (3,261명):
 *    - participantData: 소속회원목록 정보
 *    - basicEducationData: 기초교육 이수 현황
 *    - advancedEducationData: 심화교육 이수 현황
 *    - 담당 컬럼: I (직무교육 이수인원), 수강권리 등록자 수
 * 
 * 3. 별도 계산 방식:
 *    - 시스템 간 매칭 시도하지 않음
 *    - 각 시스템 데이터를 독립적으로 사용
 *    - 기관코드 기준으로 그룹화만 수행
 */

// 종합 현황표 데이터 구조
interface IntegratedAnalysisData {
  management: string;
  region: string;
  district: string;
  institutionCode: string;
  institutionName: string;
  
  // [배움터 시스템] 백업입력(수강권리 등록자 수) - 소속회원목록 기준
  backup1_total: number;        // 전체 근무자(=O+@) 
  backup1_social: number;       // 전문사회복지사 ①
  backup1_life: number;         // 생활지원사회복지사 ②
  
  // [모인우리 시스템] 백업입력(예산지시 등록자 수) - 기관현황 기준
  backup2_a: number;            // A 전체
  backup2_b: number;            // B 전업사회복지사  
  backup2_c: number;            // C 생활지원사
  backup2_total: number;        // 전체 근무자(=@+@)
  
  // [배움터 시스템] D급 백업입력(수강권리 등록자 수) - 소속회원목록 기준
  dLevel_social: number;        // 전문사회복지사 ①
  dLevel_life: number;          // 생활지원사 ②
  dLevel_total: number;         // D 전체
  
  // [모인우리 시스템] (1-1.) 근무자 자격현황 - 종사자데이터 기준
  qualification_social: number;  // 전업사회복지사
  qualification_life: number;    // 생활지원사
  qualification_total: number;   // 자격취득(=@+@)
  
  // [모인우리 시스템] (1-1.a) 근무자 근속현황 - 종사자데이터 기준
  tenure_social: number;        // 전문사회복지사 ①
  tenure_life: number;          // 생활지원사 ②  
  tenure_rate: number;          // (E/A) 재응률
  
  // [배움터 시스템] (1-4.) 근무자 직무교육 이수율 - 교육데이터 기준
  education_f: number;          // F 재응률
  education_rate_fb: number;    // (F/B) 재응률
  education_warning: number;    // (경고) 총험률
  education_g: number;          // G 재응관관(G/C) 재응률(경고) 총험률
}

export default function AdvancedEducationPage() {
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { advancedEducationData, setAdvancedEducationData, integratedAnalysisData, setIntegratedAnalysisData, loadLazyData, isLoaded, forceReloadData } = useEducationData();

  // 컴포넌트 마운트 시 심화 교육 데이터 로드 (한 번만 실행)
  useEffect(() => {
    let mounted = true;
    if (!isLoaded?.advancedEducation && mounted) {
      console.log('🔄 Loading advanced education data...');
      loadLazyData('advanced');
    }
    return () => { mounted = false; };
  }, []); // 의존성 완전 제거

  // API 호출 비활성화 - IndexedDB 데이터만 사용
  // useEffect(() => {
  //   fetchAdvancedEducationData();
  // }, []);

  // 탭 변경시 강제 리로드 비활성화 (데이터 덮어쓰기 방지)
  // useEffect(() => {
  //   if (activeTab === 'list' && advancedEducationData.length > 0) {
  //     console.log('🔄 Forcing reload of other education data after advanced education upload...');
  //     forceReloadData('basic');
  //     forceReloadData('participant');
  //   }
  // }, [activeTab, advancedEducationData.length]);

  // 페이지 변경 시 스크롤 상단으로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const fetchAdvancedEducationData = async () => {
    setIsLoading(true);
    try {
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const indexedData = await educationDB.getItem<any[]>('advancedEducationData');
      
      console.log(`🗃️ IndexedDB에서 심화교육 데이터 로드: ${indexedData?.length || 0}개`);
      
      if (indexedData && indexedData.length > 0) {
        setAdvancedEducationData(indexedData);
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/education/advanced');
        if (response.ok) {
          const data = await response.json();
          setAdvancedEducationData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch advanced education data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data for integrated analysis table - Initialize store with mock data
  const mockAnalysisData: IntegratedAnalysisData[] = useMemo(() => [
    {
      id: "1",
      management: "서울시", region: "서울", district: "강남구", 
      institutionCode: "1001", institutionName: "강남종합복지관",
      backup1_total: 15, backup1_social: 8, backup1_life: 7,
      backup2_a: 12, backup2_b: 6, backup2_c: 6, backup2_total: 12,
      dLevel_social: 3, dLevel_life: 4, dLevel_total: 7,
      qualification_social: 8, qualification_life: 7, qualification_total: 15,
      tenure_social: 6, tenure_life: 5, tenure_rate: 73.3,
      education_f: 10, education_rate_fb: 83.3, education_warning: 2, education_g: 8,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: "2",
      management: "서울시", region: "서울", district: "서초구",
      institutionCode: "1002", institutionName: "서초사회복지관", 
      backup1_total: 18, backup1_social: 10, backup1_life: 8,
      backup2_a: 15, backup2_b: 8, backup2_c: 7, backup2_total: 15,
      dLevel_social: 4, dLevel_life: 3, dLevel_total: 7,
      qualification_social: 10, qualification_life: 8, qualification_total: 18,
      tenure_social: 8, tenure_life: 6, tenure_rate: 77.8,
      education_f: 12, education_rate_fb: 80.0, education_warning: 3, education_g: 9,
      createdAt: new Date(), updatedAt: new Date()
    },
    {
      id: "3",
      management: "경기도", region: "경기", district: "수원시",
      institutionCode: "2001", institutionName: "수원시종합사회복지관", 
      backup1_total: 22, backup1_social: 12, backup1_life: 10,
      backup2_a: 20, backup2_b: 11, backup2_c: 9, backup2_total: 20,
      dLevel_social: 5, dLevel_life: 4, dLevel_total: 9,
      qualification_social: 12, qualification_life: 10, qualification_total: 22,
      tenure_social: 9, tenure_life: 8, tenure_rate: 77.3,
      education_f: 15, education_rate_fb: 75.0, education_warning: 4, education_g: 11,
      createdAt: new Date(), updatedAt: new Date()
    }
  ], []);

  // Mock 데이터 설정 제거 - 실제 데이터만 사용
  // React.useEffect(() => {
  //   if (integratedAnalysisData.length === 0) {
  //     setIntegratedAnalysisData(mockAnalysisData);
  //   }
  // }, [integratedAnalysisData.length, mockAnalysisData, setIntegratedAnalysisData]);

  // 실제 데이터만 사용 (Mock 데이터 제거)
  const analysisData = integratedAnalysisData;


  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'advanced');

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
      await educationDB.setItem('advancedEducationData', advancedEducationData);
      setAdvancedEducationData(advancedEducationData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 심화교육 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 심화교육 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('모든 심화교육 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/education/advanced/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 심화교육 데이터가 삭제되었습니다.",
      });

      // 스토어 및 IndexedDB 데이터 즉시 초기화
      setAdvancedEducationData([]);
      
      // IndexedDB 클리어
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        await educationDB.setItem('advancedEducationData', []);
        console.log('🗃️ IndexedDB advancedEducationData 클리어 완료');
      } catch (e) {
        console.warn('IndexedDB 클리어 실패:', e);
      }

      // localStorage 강제 클리어 (Zustand persist 때문에)
      try {
        localStorage.removeItem('education-store');
      } catch (e) {
        console.warn('localStorage 클리어 실패:', e);
      }

      // 데이터 다시 로드
      await fetchAdvancedEducationData();

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
          <h1 className="text-3xl font-bold">심화 교육 데이터 관리</h1>
          <p className="text-muted-foreground mt-2">
            심화 교육 수료 데이터를 업로드하고 관리합니다
          </p>
        </div>
      </div>

      {/* 데이터 업로드 섹션 (Collapsible) */}
      <Collapsible open={showUploadSection} onOpenChange={setShowUploadSection}>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  데이터 업로드
                </CardTitle>
                <CardDescription>
                  Excel 파일을 통해 심화교육 수료 데이터를 업로드합니다
                </CardDescription>
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showUploadSection ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      접기
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      펼치기
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              <DateUploadForm
                onUpload={handleDateUpload}
                isUploading={isUploading}
                title="심화교육 데이터 업로드"
                description="Excel 파일을 통해 심화교육 수료 데이터를 특정 날짜 기준으로 업로드합니다"
              />
              
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isLoading || !advancedEducationData || advancedEducationData.length === 0}
                >
                  데이터 초기화
                </Button>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 데이터 목록 섹션 (메인) */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-purple-600" />
                    심화 교육 데이터 목록
                  </CardTitle>
                  <CardDescription>
                    업로드된 심화 교육 수료 데이터를 조회합니다
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUploadSection(!showUploadSection)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    데이터 업로드
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAdvancedEducationData}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    새로고침
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <div className="text-muted-foreground">데이터를 불러오는 중...</div>
                </div>
              ) : advancedEducationData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 심화 교육 데이터가 없습니다.
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setShowUploadSection(true)}
                  >
                    데이터 업로드하기
                  </Button>
                </div>
              ) : (() => {
                // 데이터 필터링 및 페이지네이션 로직
                const filteredData = advancedEducationData.filter(item => {
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

                return (
                  <>
                        <div className="mb-4 space-y-4">
                          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-muted rounded-md">
                                <div className="text-lg font-semibold">{filteredData.length}개</div>
                                <div className="text-xs text-muted-foreground">
                                  {searchTerm ? `검색된 데이터 (전체 ${advancedEducationData.length}개)` : '총 심화 교육 데이터'}
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
                            <TableCell className="text-center border-r">
                              {item.region || extractSido(item.institution) || '-'}
                            </TableCell>
                            <TableCell className="text-center border-r">
                              {item.district || extractSigungu(item.institution) || '-'}
                            </TableCell>
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
                );
              })()}
            </CardContent>
          </Card>
    </div>
  );
}