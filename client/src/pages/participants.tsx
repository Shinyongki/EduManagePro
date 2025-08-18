import React, { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Users, RefreshCw, Filter, AlertTriangle } from 'lucide-react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEducationData } from '@/hooks/use-education-data';
import { type EducationCompletionStatus, type ParticipantEducationStatus } from '@/store/education-store';
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

export default function ParticipantsPage() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EducationCompletionStatus | 'all'>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const { 
    participantData, 
    setParticipantData, 
    getParticipantEducationStatus, 
    getAllParticipantEducationStatus,
    getEducationSummaryStats,
    getDataInconsistencies,
    loadLazyData,
    isLoaded
  } = useEducationData();

  // 검색어 debounce 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 컴포넌트 마운트 시 참여자 데이터 로드
  useEffect(() => {
    if (!isLoaded?.participant) {
      console.log('🔄 Loading participant data...');
      loadLazyData('participant');
    }
  }, [isLoaded?.participant]); // loadLazyData 제거

  // API 호출 비활성화 - IndexedDB 데이터만 사용
  // useEffect(() => {
  //   fetchParticipantData();
  // }, []);

  const fetchParticipantData = async () => {
    setIsLoading(true);
    try {
      // IndexedDB에서 직접 로드
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      const indexedData = await educationDB.getItem<any[]>('participantData');
      
      console.log(`🗃️ IndexedDB에서 참가자 데이터 로드: ${indexedData?.length || 0}명`);
      
      if (indexedData && indexedData.length > 0) {
        setParticipantData(indexedData);
      } else {
        // IndexedDB에 데이터가 없으면 서버 API 호출 (백업)
        console.log('📡 IndexedDB에 데이터 없음, 서버 API 호출...');
        const response = await fetch('/api/participants');
        if (response.ok) {
          const data = await response.json();
          setParticipantData(data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch participant data:', error);
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

  const handleClearData = async () => {
    if (!window.confirm('모든 소속 회원 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/participants/clear', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('데이터 초기화에 실패했습니다.');
      }

      toast({
        title: "데이터 초기화 완료",
        description: "모든 소속 회원 데이터가 삭제되었습니다.",
      });

      // 스토어 데이터 즉시 초기화
      setParticipantData([]);

      // 데이터 다시 로드
      await fetchParticipantData();

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

  // 날짜별 업로드 함수
  const handleDateUpload = async (date: string, description: string, file: File) => {
    setIsUploading(true);
    try {
      // 1. 서버에 파일 업로드
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'participants');

      const response = await fetch('/api/participants/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      // 2. 서버에서 모든 데이터 가져오기
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

      // 4. IndexedDB 동기화
      const { IndexedDBStorage } = await import('@/lib/indexeddb');
      const educationDB = new IndexedDBStorage();
      await educationDB.setItem('participantData', participantData);
      setParticipantData(participantData);

      toast({
        title: "업로드 완료",
        description: `${date} 날짜로 ${result.count}개의 참가자 데이터가 업로드되었습니다.`,
      });

      console.log(`✅ ${date} 날짜별 업로드 완료: ${result.count}개 참가자 데이터`);
      
    } catch (error) {
      console.error('날짜별 업로드 실패:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "파일을 선택해주세요",
        description: "업로드할 소속 회원 데이터 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('type', 'participants');

      const response = await fetch('/api/participants/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await response.json();
      
      toast({
        title: "업로드 완료",
        description: `${result.count}개의 소속 회원 데이터가 성공적으로 업로드되었습니다.`,
      });
      
      // 파일 선택 초기화
      setUploadedFile(null);
      const fileInput = document.getElementById('participant-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // 업로드된 데이터를 서버에서 가져와서 IndexedDB에 자동 동기화
      await fetchParticipantData();
      
      // 🔥 중요: 서버에서 데이터를 다시 가져와서 IndexedDB에 저장
      try {
        const { IndexedDBStorage } = await import('@/lib/indexeddb');
        const educationDB = new IndexedDBStorage();
        const serverResponse = await fetch('/api/participants');
        if (serverResponse.ok) {
          const allParticipantData = await serverResponse.json();
          
          console.log(`💾 서버에서 ${allParticipantData.length}명 참가자 데이터를 IndexedDB에 동기화`);
          await educationDB.setItem('participantData', allParticipantData);
          
          // 스토어도 업데이트
          setParticipantData(allParticipantData);
        }
      } catch (syncError) {
        console.error('IndexedDB 동기화 실패:', syncError);
      }
      
      // 목록 탭으로 이동
      setActiveTab('list');
      
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

  // 교육 상태에 따른 컬러 코딩
  const getStatusBadge = (status: EducationCompletionStatus) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">🟢 완전수료</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">🟡 부분수료</Badge>;
      case 'none':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white">🔴 미수료</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">⚪ 진행중</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getEducationBadge = (status: 'completed' | 'incomplete' | 'in_progress' | 'not_found') => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">✅ 수료</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">⏳ 진행중</Badge>;
      case 'incomplete':
        return <Badge variant="destructive">❌ 미수료</Badge>;
      case 'not_found':
        return <Badge variant="outline" className="text-gray-500">- 없음</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getParticipantStatusBadge = (status: string) => {
    switch (status) {
      case '중지':
        return <Badge variant="destructive" className="text-xs">🚫 중지</Badge>;
      case '휴먼대상':
        return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">⏸️ 휴먼대상</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status || '-'}</Badge>;
    }
  };

  // 데이터 필터링 및 페이지네이션 - useMemo로 최적화
  const allParticipantStatusList = useMemo(() => getAllParticipantEducationStatus(), [participantData, getAllParticipantEducationStatus]);
  const summaryStats = useMemo(() => getEducationSummaryStats(), [participantData, getEducationSummaryStats]);
  const dataInconsistencies = useMemo(() => getDataInconsistencies(), [participantData, getDataInconsistencies]);
  
  const filteredData = useMemo(() => {
    return allParticipantStatusList?.filter(participantStatus => {
      const participant = participantStatus.participant;
      const matchesSearch = !debouncedSearchTerm || 
        participant.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        participant.id?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        participant.institution?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        participant.jobType?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchesStatusFilter = statusFilter === 'all' || participantStatus.overallStatus === statusFilter;
      
      const matchesJobTypeFilter = jobTypeFilter === 'all' || 
        (jobTypeFilter === '전담사회복지사' && (
          participant.jobType?.includes('전담') || 
          participant.jobType === '전담사회복지사' ||
          participant.jobType === '선임전담사회복지사'
        )) ||
        (jobTypeFilter === '생활지원사' && (
          participant.jobType?.includes('생활지원') || 
          participant.jobType === '생활지원사'
        ));

      const matchesActiveStatusFilter = activeStatusFilter === 'all' ||
        (activeStatusFilter === 'active' && 
          participant.status !== '중지' && 
          participant.status !== '휴먼대상' && 
          participant.isActive !== false &&
          // 퇴사일 체크
          (!participant.resignDate || (() => {
            try {
              const resignDate = new Date(participant.resignDate);
              const today = new Date();
              return resignDate > today;
            } catch {
              return true;
            }
          })())
        ) ||
        (activeStatusFilter === '중지' && participant.status === '중지') ||
        (activeStatusFilter === '휴먼대상' && participant.status === '휴먼대상');
      
      return matchesSearch && matchesStatusFilter && matchesJobTypeFilter && matchesActiveStatusFilter;
    }) || [];
  }, [allParticipantStatusList, debouncedSearchTerm, statusFilter, jobTypeFilter, activeStatusFilter]);

  const { totalPages, startIndex, currentData } = useMemo(() => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + itemsPerPage);
    return { totalPages, startIndex, currentData };
  }, [filteredData, currentPage, itemsPerPage]);

  // debounced search term 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter]);

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
          <h1 className="text-3xl font-bold">소속 회원 목록 관리</h1>
          <p className="text-muted-foreground mt-2">
            소속 회원들의 상세 정보를 업로드하고 관리합니다
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
            소속 회원 목록 ({participantData?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="inconsistencies">
            <AlertTriangle className="h-4 w-4 mr-2" />
            데이터 불일치 분석 ({dataInconsistencies?.reduce((sum, inst) => sum + inst.inconsistencies.length, 0) || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="space-y-6">
            <DateUploadForm
              onUpload={handleDateUpload}
              isUploading={isUploading}
              title="참가자 데이터 업로드"
              description="Excel 파일을 통해 참가자 정보를 특정 날짜 기준으로 업로드합니다"
            />
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                소속 회원 데이터 업로드
              </CardTitle>
              <CardDescription>
                Excel 파일을 통해 소속 회원의 상세 정보를 일괄 업로드합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">소속 회원 업로드 파일은 다음 헤더를 포함해야 합니다:</p>
                    <ul className="text-sm list-disc ml-4 space-y-1">
                      <li>번호, 소속, 기관코드, 유형, 회원명, 성별, 생년월일</li>
                      <li>ID, 휴대전화, 이메일, 수강건수, 접속일, 가입일</li>
                      <li>직군, 입사일, 퇴사일, 특화, 중간관리자, 최고관리자</li>
                      <li>경력, 시법사업참여여부, 이메일수신동의여부, SMS수신동의 여부</li>
                      <li>상태, 최종수료, 기초직무, 심화교육</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="participant-file">파일 선택</Label>
                <Input
                  id="participant-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>

              {uploadedFile && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                  <Eye className="h-4 w-4" />
                  <span className="text-sm">{uploadedFile.name}</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpload} 
                  disabled={!uploadedFile || isUploading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? '업로드 중...' : '업로드'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClearData}
                  disabled={isLoading || !participantData || participantData.length === 0}
                >
                  데이터 초기화
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    소속 회원 교육 이수 현황
                  </CardTitle>
                  <CardDescription>
                    기초교육 + 심화교육 연동분석 결과
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchParticipantData}
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
              ) : !participantData || participantData.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">
                    아직 업로드된 소속 회원 데이터가 없습니다.
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
                  {/* 통계 요약 */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <Card className="p-4 text-center border-l-4 border-l-gray-400">
                      <div className="text-2xl font-bold text-gray-600">{summaryStats.total}</div>
                      <div className="text-xs text-muted-foreground">총 인원</div>
                    </Card>
                    <Card className="p-4 text-center border-l-4 border-l-green-500">
                      <div className="text-2xl font-bold text-green-600">{summaryStats.complete}</div>
                      <div className="text-xs text-muted-foreground">🟢 완전수료</div>
                      <div className="text-xs text-green-600 font-medium">
                        {summaryStats.total > 0 ? Math.round((summaryStats.complete / summaryStats.total) * 100) : 0}%
                      </div>
                    </Card>
                    <Card className="p-4 text-center border-l-4 border-l-yellow-500">
                      <div className="text-2xl font-bold text-yellow-600">{summaryStats.partial}</div>
                      <div className="text-xs text-muted-foreground">🟡 부분수료</div>
                      <div className="text-xs text-yellow-600 font-medium">
                        {summaryStats.total > 0 ? Math.round((summaryStats.partial / summaryStats.total) * 100) : 0}%
                      </div>
                    </Card>
                    <Card className="p-4 text-center border-l-4 border-l-blue-500">
                      <div className="text-2xl font-bold text-blue-600">{summaryStats.inProgress}</div>
                      <div className="text-xs text-muted-foreground">⚪ 진행중</div>
                      <div className="text-xs text-blue-600 font-medium">
                        {summaryStats.total > 0 ? Math.round((summaryStats.inProgress / summaryStats.total) * 100) : 0}%
                      </div>
                    </Card>
                    <Card className="p-4 text-center border-l-4 border-l-red-500">
                      <div className="text-2xl font-bold text-red-600">{summaryStats.none}</div>
                      <div className="text-xs text-muted-foreground">🔴 미수료</div>
                      <div className="text-xs text-red-600 font-medium">
                        {summaryStats.total > 0 ? Math.round((summaryStats.none / summaryStats.total) * 100) : 0}%
                      </div>
                    </Card>
                  </div>

                  {/* 필터링 및 검색 */}
                  <div className="mb-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-lg font-semibold">{filteredData.length}명</div>
                          <div className="text-xs text-muted-foreground">
                            {searchTerm || statusFilter !== 'all' || jobTypeFilter !== 'all' || activeStatusFilter !== 'all' ? `필터된 결과 (재직자 기준 통계 ${summaryStats.total}명)` : '전체 회원'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Input
                          placeholder="이름, ID, 기관, 직군으로 검색..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value);
                          }}
                          className="w-full sm:w-64"
                        />
                        <Select value={statusFilter} onValueChange={(value: EducationCompletionStatus | 'all') => {
                          setStatusFilter(value);
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 상태</SelectItem>
                            <SelectItem value="complete">🟢 완전수료</SelectItem>
                            <SelectItem value="partial">🟡 부분수료</SelectItem>
                            <SelectItem value="in_progress">⚪ 진행중</SelectItem>
                            <SelectItem value="none">🔴 미수료</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={jobTypeFilter} onValueChange={(value: string) => {
                          setJobTypeFilter(value);
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 직군</SelectItem>
                            <SelectItem value="전담사회복지사">전담사회복지사</SelectItem>
                            <SelectItem value="생활지원사">생활지원사</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={activeStatusFilter} onValueChange={(value: string) => {
                          setActiveStatusFilter(value);
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">전체 상태</SelectItem>
                            <SelectItem value="active">재직자(중지,휴먼대상 제외)</SelectItem>
                            <SelectItem value="중지">중지</SelectItem>
                            <SelectItem value="휴먼대상">휴먼대상</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1);
                        }}>
                          <SelectTrigger className="w-full sm:w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10개</SelectItem>
                            <SelectItem value="25">25개</SelectItem>
                            <SelectItem value="50">50개</SelectItem>
                            <SelectItem value="100">100개</SelectItem>
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

                  {/* 소속 회원 목록 테이블 */}
                  <div className="rounded-md border">
                    <div className="overflow-auto max-h-[800px] w-full">
                      <Table className="table-fixed w-full" style={{ minWidth: '2400px' }}>
                        <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                          <TableRow>
                            <TableHead className="w-16 text-center bg-background border-b border-r">No</TableHead>
                            <TableHead className="w-32 bg-background border-b border-r">소속</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">기관코드</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">유형</TableHead>
                            <TableHead className="w-28 bg-background border-b border-r">회원명</TableHead>
                            <TableHead className="w-20 text-center bg-background border-b border-r">성별</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">생년월일</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">ID</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">휴대전화</TableHead>
                            <TableHead className="w-48 text-center bg-background border-b border-r">이메일</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">수강건수</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">접속일</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">가입일</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">직군</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">입사일</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">퇴사일</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">특화</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">중간관리자</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">최고관리자</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">경력</TableHead>
                            <TableHead className="w-36 text-center bg-background border-b border-r">시법사업참여여부</TableHead>
                            <TableHead className="w-40 text-center bg-background border-b border-r">이메일수신동의여부</TableHead>
                            <TableHead className="w-40 text-center bg-background border-b border-r">SMS수신동의 여부</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">상태</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">최종수료</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">기초직무</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b">심화교육</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentData.map((participantStatus, index) => {
                            const participant = participantStatus.participant;
                            const isInactive = participant.status === '중지' || participant.status === '휴먼대상';
                            const rowClassName = isInactive 
                              ? "hover:bg-muted/50 bg-gray-50 opacity-75" 
                              : "hover:bg-muted/50";
                            return (
                              <TableRow key={participant.id || index} className={rowClassName}>
                                <TableCell className="font-medium text-center border-r">{participant.no || (startIndex + index + 1)}</TableCell>
                                <TableCell className="border-r text-sm" title={participant.institution}>{participant.institution || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono text-xs">{participant.institutionCode || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.institutionType || '-'}</TableCell>
                                <TableCell className="font-medium border-r">{participant.name || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.gender || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.birthDate || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono text-sm">{participant.id || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono text-xs">{participant.phone || '-'}</TableCell>
                                <TableCell className="border-r text-xs" title={participant.email}>{participant.email || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.courseCount || 0}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.lastAccessDate || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.registrationDate || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  <Badge variant="outline" className="text-xs">{participant.jobType || '-'}</Badge>
                                </TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.hireDate || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.resignDate || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.specialization || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.middleManager || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.topManager || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.career || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.participatesInLegalBusiness || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.emailConsent || '-'}</TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.smsConsent || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  {getParticipantStatusBadge(participant.status)}
                                </TableCell>
                                <TableCell className="text-center border-r text-xs">{getStatusBadge(participantStatus.overallStatus)}</TableCell>
                                <TableCell className="text-center border-r text-xs">{getEducationBadge(participantStatus.basicEducation.status)}</TableCell>
                                <TableCell className="text-center text-xs">{getEducationBadge(participantStatus.advancedEducation.status)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inconsistencies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                데이터 불일치 분석
              </CardTitle>
              <CardDescription>
                종사자 관리(모인우리) 데이터와 소속 회원(배움터) 데이터 간의 상태 불일치를 분석합니다.
                <br />
                <strong className="text-orange-600">중요:</strong> 불일치 발견 시 종사자 관리(모인우리) 데이터를 우선으로 처리됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dataInconsistencies.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-orange-600 mb-2">⚠️ 종사자 데이터 필요</div>
                  <div className="text-muted-foreground mb-4">
                    종사자 관리(모인우리) 데이터가 업로드되지 않아 불일치 분석을 할 수 없습니다.
                  </div>
                  <div className="bg-orange-50 p-4 rounded-md">
                    <h4 className="font-semibold text-orange-800 mb-2">📝 다음 단계</h4>
                    <ol className="text-sm text-orange-700 list-decimal list-inside space-y-1">
                      <li>종사자 관리 &gt; 종사자 데이터에서 Excel 파일 업로드</li>
                      <li>박은정님, 손혜원님 등의 퇴직 정보 포함 확인</li>
                      <li>이 페이지로 돌아와서 불일치 분석 재실행</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 전체 요약 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4 border-l-4 border-l-orange-500">
                      <div className="text-2xl font-bold text-orange-600">
                        {dataInconsistencies.reduce((sum, inst) => sum + inst.inconsistencies.length, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">총 불일치 건수</div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-red-500">
                      <div className="text-2xl font-bold text-red-600">
                        {dataInconsistencies.length}
                      </div>
                      <div className="text-sm text-muted-foreground">영향받는 기관</div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                      <div className="text-2xl font-bold text-blue-600">
                        {dataInconsistencies.filter(inst => inst.institution.includes('거제')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">거제 관련 기관</div>
                    </Card>
                  </div>

                  {/* 기관별 불일치 리스트 */}
                  {dataInconsistencies.map((institutionData, instIndex) => (
                    <Card key={instIndex} className="border-l-4 border-l-orange-400">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{institutionData.institution}</span>
                          <Badge variant="destructive" className="ml-2">
                            {institutionData.inconsistencies.length}건 불일치
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-32">성명</TableHead>
                                <TableHead className="w-32">생년월일</TableHead>
                                <TableHead className="w-32">ID</TableHead>
                                <TableHead className="w-32">직군</TableHead>
                                <TableHead className="w-32 bg-red-50">종사자관리 상태(모인우리)</TableHead>
                                <TableHead className="w-32 bg-blue-50">소속회원 상태(배움터)</TableHead>
                                <TableHead className="w-32">종사자 퇴사일</TableHead>
                                <TableHead className="w-32">소속회원 퇴사일</TableHead>
                                <TableHead className="w-32">불일치 유형</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {institutionData.inconsistencies.map((inconsistency, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">
                                    {inconsistency.name}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{inconsistency.birthDate || '-'}</TableCell>
                                  <TableCell className="font-mono text-xs">{inconsistency.id}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {inconsistency.jobType || '미분류'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="bg-red-50">
                                    <Badge variant={inconsistency.employeeStatus === '퇴직' ? 'destructive' : 'default'} className="text-xs">
                                      {inconsistency.employeeStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="bg-blue-50">
                                    <Badge variant={inconsistency.participantStatus === '정상' ? 'default' : 'secondary'} className="text-xs">
                                      {inconsistency.participantStatus}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs">{inconsistency.employeeResignDate}</TableCell>
                                  <TableCell className="text-xs">{inconsistency.participantResignDate || '-'}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {inconsistency.type?.replace(/_/g, ' ')}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* 해결 방안 안내 */}
                  <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                      <CardTitle className="text-lg text-green-700">📋 해결 방안</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="bg-green-50 p-4 rounded-md">
                        <h4 className="font-semibold text-green-800 mb-2">1. 우선순위 원칙</h4>
                        <p className="text-green-700 text-sm">
                          <strong>종사자 관리(모인우리) 데이터를 우선으로 처리</strong>합니다. 
                          종사자 관리(모인우리)에서 '퇴직'으로 표시된 경우 소속 회원(배움터) 목록에서도 비활성화 처리됩니다.
                        </p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-md">
                        <h4 className="font-semibold text-blue-800 mb-2">2. 자동 동기화</h4>
                        <p className="text-blue-700 text-sm">
                          시스템이 종사자 관리(모인우리) 데이터를 기준으로 소속 회원(배움터) 상태를 자동으로 업데이트합니다.
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-md">
                        <h4 className="font-semibold text-orange-800 mb-2">3. 정기 점검</h4>
                        <p className="text-orange-700 text-sm">
                          데이터 일관성 유지를 위해 정기적으로 이 분석을 확인하시기 바랍니다.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}