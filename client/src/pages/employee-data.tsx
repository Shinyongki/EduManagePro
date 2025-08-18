import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Users, RefreshCw, Download } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEmployeeStore } from '@/store/employee-store';
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

export default function EmployeeDataPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [jobTypeFilter, setJobTypeFilter] = useState('all'); // 'all', 'social-worker', 'life-support'
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const { employeeData, setEmployeeData } = useEmployeeStore();

  useEffect(() => {
    fetchEmployeeData();
  }, []);

  const fetchEmployeeData = async () => {
    setIsLoading(true);
    try {
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const indexedData = await educationDB.getItem<any[]>('employeeData');
      
      console.log(`🗃️ IndexedDB에서 종사자 데이터 로드: ${indexedData?.length || 0}명`);
      
      if (indexedData && indexedData.length > 0) {
        setEmployeeData(indexedData);
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/employees');
        if (response.ok) {
          const result = await response.json();
          setEmployeeData(result.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch employee data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 IndexedDB 동기화 함수 추가
  const syncServerToIndexedDB = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 서버 데이터를 IndexedDB로 동기화 시작...');
      
      // 서버에서 모든 데이터 가져오기
      const response = await fetch('/api/employees?limit=10000');
      if (!response.ok) {
        throw new Error('서버 데이터 가져오기 실패');
      }
      
      const result = await response.json();
      const allData = result.data || [];
      
      console.log(`📊 서버에서 ${allData.length}명 데이터 가져옴`);
      
      // IndexedDB에 저장
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const db = new IndexedDBStorage();
      await db.setItem('employeeData', allData);
      
      console.log(`💾 IndexedDB에 ${allData.length}명 저장 완료`);
      
      // 스토어 업데이트
      setEmployeeData(allData);
      
      toast({
        title: "동기화 완료",
        description: `${allData.length}명의 종사자 데이터가 동기화되었습니다.`,
      });
      
    } catch (error) {
      console.error('동기화 실패:', error);
      toast({
        title: "동기화 실패",
        description: error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast({
        title: "파일 선택됨",
        description: `${file.name}이 선택되었습니다.`,
      });
    }
  };

  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      // 1. 서버에 파일 업로드
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/employees/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 2. 서버에서 모든 데이터 가져오기 (종사자 데이터 업로드 후)
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

      // 3. 날짜별 스냅샷 생성
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

      // 4. IndexedDB 동기화 (현재 스냅샷 기준)
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      await educationDB.setItem('employeeData', employeeData);
      setEmployeeData(employeeData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 종사자 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 종사자 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error; // DateUploadForm에서 에러 처리
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearData = async () => {
    if (!window.confirm('모든 종사자 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/employees/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 종사자 데이터가 삭제되었습니다.",
      });

      // 스토어 데이터 즉시 초기화
      setEmployeeData([]);

      // localStorage 강제 클리어 (Zustand persist 때문에)
      try {
        localStorage.removeItem('employee-store');
      } catch (e) {
        console.warn('localStorage 클리어 실패:', e);
      }

      // 데이터 다시 로드
      await fetchEmployeeData();

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

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "파일을 선택해주세요",
        description: "업로드할 종사자 데이터 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const response = await fetch('/api/employees/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      toast({
        title: "업로드 완료",
        description: `${result.count}개의 새로운 종사자 데이터가 업로드되었습니다. (총 ${result.total}명, 재직 중 ${result.active}명)`,
      });
      
      // 파일 선택 초기화
      setUploadedFile(null);
      const fileInput = document.getElementById('employee-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // 목록 탭으로 이동
      setActiveTab('list');
      // Refresh data after upload AND sync to IndexedDB
      await fetchEmployeeData();
      
      // 🔥 중요: 서버에서 데이터를 다시 가져와서 IndexedDB에 저장
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        const serverResponse = await fetch('/api/employees?limit=10000'); // 모든 데이터 가져오기
        if (serverResponse.ok) {
          const serverResult = await serverResponse.json();
          const allEmployeeData = serverResult.data || [];
          
          console.log(`💾 서버에서 ${allEmployeeData.length}명 데이터를 IndexedDB에 동기화`);
          await educationDB.setItem('employeeData', allEmployeeData);
          
          // 스토어도 업데이트
          setEmployeeData(allEmployeeData);
        }
      } catch (syncError) {
        console.error('IndexedDB 동기화 실패:', syncError);
      }
      
    } catch (error) {
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // 데이터 필터링 및 페이지네이션
  const filteredData = employeeData.filter(item => {
    // 상태 필터링
    if (statusFilter === 'active' && !item.isActive) return false;
    if (statusFilter === 'inactive' && item.isActive) return false;
    
    // 직무 필터링
    if (jobTypeFilter === 'social-worker' && 
        !(item.jobType === '전담사회복지사' || item.jobType === '선임전담사회복지사')) return false;
    if (jobTypeFilter === 'life-support' && 
        !(item.jobType === '생활지원사' || 
          item.jobType?.includes('생활지원') ||
          item.jobType?.includes('요양') ||
          item.jobType?.includes('돌봄') ||
          item.jobType?.includes('케어') ||
          item.jobType?.includes('특화') ||
          // 전담사회복지사가 아닌 모든 직무를 생활지원사로 분류
          (!item.jobType?.includes('전담') && !item.jobType?.includes('사회복지사') && item.jobType && item.jobType !== '전담사회복지사' && item.jobType !== '선임전담사회복지사')
        )) return false;
    
    // 검색어 필터링
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.institution?.toLowerCase().includes(searchLower) ||
      item.jobType?.toLowerCase().includes(searchLower) ||
      item.careerType?.toLowerCase().includes(searchLower) ||
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

  // 데이터 내보내기 기능
  const handleExportData = async () => {
    if (filteredData.length === 0) {
      toast({
        title: "데이터 없음",
        description: "내보낼 데이터가 없습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);

    try {
      // 동적 import로 xlsx 라이브러리 로드
      const XLSX = await import('xlsx');
      const { saveAs } = await import('file-saver');

      // 내보낼 데이터 준비
      const exportData = filteredData.map(emp => ({
        '광역시': emp.region || emp.province || '',
        '지자체': emp.district || '',
        '광역코드': emp.regionCode || '',
        '광역명': emp.regionName || emp.institution || '',
        '수행기관코드': emp.institutionCode || '',
        '직무구분': emp.jobType || '',
        '담당업무': emp.responsibility || emp.duty || '',
        '성명': emp.name || '',
        '경력구분/엔젯코드': emp.careerType || emp.angelCode || '',
        '생년월일': emp.birthDate || '',
        '성별': emp.gender || '',
        '입사일': emp.hireDate || '',
        '퇴사일': emp.resignDate || '',
        '비고': emp.notes || emp.remarks || emp.note || '',
        '배움터ID': emp.learningId || '',
        '수정일': emp.modifiedDate || '',
        '주요업무': emp.mainDuty || emp.primaryWork || '',
        '상태': emp.isActive ? '재직' : '퇴직'
      }));

      // 워크시트 생성
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '종사자 데이터');

      // 파일명 생성
      const getFilterDescription = () => {
        const parts = [];
        if (statusFilter !== 'all') parts.push(statusFilter === 'active' ? '재직' : '퇴직');
        if (jobTypeFilter !== 'all') {
          if (jobTypeFilter === 'social-worker') parts.push('전담사회복지사');
          if (jobTypeFilter === 'life-support') parts.push('생활지원사');
        }
        if (searchTerm) parts.push(`검색_${searchTerm}`);
        return parts.length > 0 ? `_${parts.join('_')}` : '';
      };

      const today = new Date().toISOString().split('T')[0];
      const fileName = `종사자데이터${getFilterDescription()}_${today}.xlsx`;

      // 파일 다운로드
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(data, fileName);

      toast({
        title: "내보내기 완료",
        description: `${filteredData.length}건의 데이터가 ${fileName}로 내보내졌습니다.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "내보내기 실패",
        description: "파일 내보내기 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
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
          <h1 className="text-3xl font-bold">종사자 데이터 관리</h1>
          <p className="text-muted-foreground mt-2">
            종사자 정보를 업로드하고 관리합니다
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
            데이터 목록 ({employeeData.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <DateUploadForm
            onUpload={handleDateUpload}
            isUploading={isUploading}
            title="종사자 데이터 업로드"
            description="Excel 파일을 통해 종사자 정보를 특정 날짜 기준으로 업로드합니다"
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    종사자 데이터 목록
                  </CardTitle>
                  <CardDescription>
                    업로드된 종사자 정보를 조회합니다
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    disabled={isExporting || employeeData.length === 0}
                  >
                    <Download className={`h-4 w-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                    {isExporting ? '내보내는 중...' : '내보내기'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchEmployeeData}
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
              ) : employeeData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 종사자 데이터가 없습니다.
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('upload')}
                  >
                    데이터 업로드하기
                  </Button>
                </div>
              ) : (() => {
                return (
                  <>
                    <div className="mb-4 space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                        <div className="flex items-center gap-4 flex-wrap">
                          {jobTypeFilter === 'social-worker' ? (
                            // 전담사회복지사 필터링 시에는 재직 전담사회복지사 수만 표시
                            <div className="p-4 bg-blue-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {filteredData.filter(emp => 
                                  emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')
                                ).length}명
                              </div>
                              <div className="text-xs text-blue-700">재직 전담사회복지사</div>
                            </div>
                          ) : jobTypeFilter === 'life-support' ? (
                            // 생활지원사 필터링 시에는 재직 생활지원사 수만 표시
                            <div className="p-4 bg-green-100 rounded-md">
                              <div className="text-lg font-semibold">
                                {filteredData.filter(emp => 
                                  emp.isActive && emp.jobType === '생활지원사'
                                ).length}명
                              </div>
                              <div className="text-xs text-green-700">재직 생활지원사</div>
                            </div>
                          ) : (
                            // 전체 보기 또는 기타 필터링 시에는 전체 재직자 수와 직무별 세부 수 표시
                            <>
                              <div className="p-4 bg-muted rounded-md">
                                <div className="text-lg font-semibold">
                                  {filteredData.filter(emp => emp.isActive).length}명
                                </div>
                                <div className="text-xs text-muted-foreground">전체 재직자</div>
                              </div>
                              <div className="p-4 bg-blue-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {filteredData.filter(emp => 
                                    emp.isActive && (emp.jobType === '전담사회복지사' || emp.jobType === '선임전담사회복지사')
                                  ).length}명
                                </div>
                                <div className="text-xs text-blue-600">전담사회복지사</div>
                              </div>
                              <div className="p-4 bg-green-50 rounded-md">
                                <div className="text-lg font-semibold">
                                  {filteredData.filter(emp => 
                                    emp.isActive && emp.jobType === '생활지원사'
                                  ).length}명
                                </div>
                                <div className="text-xs text-green-600">생활지원사</div>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <Input
                            placeholder="이름, 기관, 직군, 경력으로 검색..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setCurrentPage(1); // 검색 시 첫 페이지로
                            }}
                            className="w-full sm:w-64"
                          />
                          <Select value={statusFilter} onValueChange={(value) => {
                            setStatusFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-full sm:w-32">
                              <SelectValue placeholder="상태 필터" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체</SelectItem>
                              <SelectItem value="active">재직</SelectItem>
                              <SelectItem value="inactive">퇴직</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select value={jobTypeFilter} onValueChange={(value) => {
                            setJobTypeFilter(value);
                            setCurrentPage(1);
                          }}>
                            <SelectTrigger className="w-full sm:w-40">
                              <SelectValue placeholder="직무 필터" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">전체 직무</SelectItem>
                              <SelectItem value="social-worker">전담사회복지사</SelectItem>
                              <SelectItem value="life-support">생활지원사</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportData}
                            disabled={isExporting || filteredData.length === 0}
                            className="flex-shrink-0"
                          >
                            <Download className={`h-4 w-4 mr-1 ${isExporting ? 'animate-spin' : ''}`} />
                            내보내기
                          </Button>
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
                        <Table className="table-fixed w-full" style={{ minWidth: '2000px' }}>
                          <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                            <TableRow>
                              <TableHead className="w-32 bg-background border-b border-r">광역시</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">지자체</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">광역코드</TableHead>
                              <TableHead className="w-48 bg-background border-b border-r">광역명</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">수행기관코드</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">직무구분</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">담당업무</TableHead>
                              <TableHead className="w-24 bg-background border-b border-r">성명</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">경력구분/엔젤코드</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">생년월일</TableHead>
                              <TableHead className="w-20 text-center bg-background border-b border-r">성별</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">입사일</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">퇴사일</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">비고</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">배움터ID</TableHead>
                              <TableHead className="w-32 text-center bg-background border-b border-r">수정일</TableHead>
                              <TableHead className="w-32 bg-background border-b border-r">주요업무</TableHead>
                              <TableHead className="w-24 text-center bg-background border-b">상태</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {currentData.map((employee, index) => (
                              <TableRow key={index} className="hover:bg-muted/50">
                                <TableCell className="border-r">{employee.region || employee.province || '-'}</TableCell>
                                <TableCell className="border-r">{employee.district || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.regionCode || '-'}</TableCell>
                                <TableCell className="border-r">{employee.regionName || employee.institution || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.institutionCode || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  <Badge variant="outline">{employee.jobType || '-'}</Badge>
                                </TableCell>
                                <TableCell className="border-r">{employee.responsibility || employee.duty || '-'}</TableCell>
                                <TableCell className="font-medium border-r">{employee.name}</TableCell>
                                <TableCell className="text-center border-r">{employee.careerType || employee.angelCode || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.birthDate || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.gender || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  {employee.hireDate ? 
                                    (() => {
                                      try {
                                        const date = employee.hireDate instanceof Date ? 
                                          employee.hireDate : 
                                          new Date(employee.hireDate);
                                        return isNaN(date.getTime()) ? employee.hireDate : date.toLocaleDateString('ko-KR');
                                      } catch {
                                        return employee.hireDate;
                                      }
                                    })() : '-'}
                                </TableCell>
                                <TableCell className="text-center border-r">
                                  {employee.resignDate ? 
                                    (() => {
                                      try {
                                        const date = employee.resignDate instanceof Date ? 
                                          employee.resignDate : 
                                          new Date(employee.resignDate);
                                        return isNaN(date.getTime()) ? employee.resignDate : date.toLocaleDateString('ko-KR');
                                      } catch {
                                        return employee.resignDate;
                                      }
                                    })() : '-'}
                                </TableCell>
                                <TableCell className="border-r">{employee.note || employee.remarks || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono">{employee.learningId || '-'}</TableCell>
                                <TableCell className="text-center border-r">{employee.modifiedDate || '-'}</TableCell>
                                <TableCell className="border-r">{employee.mainDuty || employee.primaryWork || '-'}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                                    {employee.isActive ? '재직' : '퇴직'}
                                  </Badge>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}