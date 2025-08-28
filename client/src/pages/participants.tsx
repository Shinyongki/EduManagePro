import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Upload, List, Eye, Users, RefreshCw, Filter, AlertTriangle, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { DateUploadForm } from "@/components/snapshot/date-upload-form";
import { snapshotManager } from "@/lib/snapshot-manager";
import { 
  createUnifiedDataSource, 
  createEmployeeBasedStats,
  createParticipantBasedStats,
  calculateEducationStats,
  getActivePersons 
} from "@/utils/unified-data-source";
import { 
  categorizeInstitution, 
  getActiveInstitutions, 
  getManagedInstitutions,
  getUnmanagedInstitutions,
  loadInstitutionAnalysis,
  type InstitutionCategory 
} from "@/utils/institution-matcher";

export default function ParticipantsPage() {
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EducationCompletionStatus | 'all'>('all');
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [inconsistencySearchTerm, setInconsistencySearchTerm] = useState('');
  const [selectedInconsistency, setSelectedInconsistency] = useState<any>(null);
  const [selectedInconsistencyType, setSelectedInconsistencyType] = useState<string>('all');
  const [showFullTable, setShowFullTable] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('list'); // 소속 회원 목록을 기본 탭으로
  const [institutionPage, setInstitutionPage] = useState(1); // 기관별 분석 페이지
  const [institutionsPerPage] = useState(10); // 페이지당 기관 수
  const { toast } = useToast();
  
  // 강제 데이터 새로고침 함수
  const forceRefreshData = useCallback(() => {
    console.log('🔄 강제 데이터 새로고침 시작...');
    fetchParticipantData();
  }, []);
  
  // 불일치 유형별 권장조치 함수
  const getRecommendedActions = (inconsistency: any) => {
    const actions: { priority: 'high' | 'medium' | 'low', title: string, description: string, steps: string[] }[] = [];
    
    if (!inconsistency.inconsistencyTypes || inconsistency.inconsistencyTypes.length === 0) {
      return actions;
    }
    
    inconsistency.inconsistencyTypes.forEach((type: string) => {
      switch (type) {
        case '모인우리에만_존재':
          actions.push({
            priority: 'high',
            title: '배움터 등록 필요',
            description: '종사자로 재직 중이지만 배움터에 등록되지 않은 상태입니다.',
            steps: [
              '해당 종사자의 재직 상태를 확인하세요',
              '재직 중이라면 배움터에 회원 등록을 진행하세요',
              '퇴직했다면 종사자 데이터에서 퇴직 처리하세요',
              '등록 완료 후 다시 불일치 분석을 실행하세요'
            ]
          });
          break;
          
        case '배움터에만_존재':
          if (inconsistency.similarData?.hasSimilarData) {
            // 유사 데이터가 있는 경우
            const birthDateDiff = inconsistency.similarData.mostSimilarEmployee.similarity?.birthDateDiff;
            if (birthDateDiff && birthDateDiff <= 7) {
              actions.push({
                priority: 'high',
                title: '데이터 정정 필요 (입력 실수 추정)',
                description: `생년월일 차이가 ${birthDateDiff}일로 입력 실수일 가능성이 매우 높습니다.`,
                steps: [
                  '배움터와 모인우리 데이터의 생년월일을 비교 확인하세요',
                  '정확한 생년월일을 확인하여 잘못된 데이터를 수정하세요',
                  '주민등록등본이나 재직증명서로 정확한 정보를 확인하세요',
                  '수정 후 데이터를 다시 업로드하세요'
                ]
              });
            } else {
              actions.push({
                priority: 'medium',
                title: '동명이인 여부 확인 필요',
                description: '이름은 같지만 생년월일이 다른 사람이 발견되었습니다.',
                steps: [
                  '해당 인물이 동명이인인지 확인하세요',
                  '같은 사람이라면 정확한 생년월일로 데이터를 통일하세요',
                  '다른 사람이라면 종사자 데이터에 신규 등록하세요',
                  '필요시 추가 식별 정보(주민등록번호 뒷자리 등)를 활용하세요'
                ]
              });
            }
          } else {
            actions.push({
              priority: 'medium',
              title: '종사자 데이터 등록 또는 확인 필요',
              description: '배움터에는 등록되어 있지만 종사자 데이터에서 찾을 수 없습니다.',
              steps: [
                '해당 인물이 실제 종사자인지 확인하세요',
                '종사자라면 모인우리 시스템에 등록하세요',
                '외부 강사나 임시직이라면 별도 분류를 고려하세요',
                '퇴직자라면 배움터에서 상태를 업데이트하세요'
              ]
            });
          }
          break;
          
        case '퇴사일_불일치':
          const dateDiff = inconsistency.resignDateDiff;
          if (dateDiff && dateDiff <= 3) {
            actions.push({
              priority: 'medium',
              title: '퇴사일 정정 (경미한 차이)',
              description: `퇴사일이 ${dateDiff}일 차이로 비교적 경미한 불일치입니다.`,
              steps: [
                '정확한 퇴사일을 인사 기록으로 확인하세요',
                '차이가 적으므로 업무일/휴일 차이일 가능성을 확인하세요',
                '정확한 날짜로 두 시스템 모두 업데이트하세요'
              ]
            });
          } else {
            actions.push({
              priority: 'high',
              title: '퇴사일 대폭 수정 필요',
              description: `퇴사일이 ${dateDiff || '크게'}일 차이로 심각한 불일치입니다.`,
              steps: [
                '인사발령서나 사직서를 통해 정확한 퇴사일을 확인하세요',
                '시스템별로 서로 다른 기준(최종 근무일 vs 사직 효력 발생일)을 사용하는지 확인하세요',
                '조직 내 표준 퇴사일 기준을 수립하고 통일하세요',
                '두 시스템 모두 정확한 날짜로 업데이트하세요'
              ]
            });
          }
          break;
          
        case '소속기관_불일치':
          actions.push({
            priority: 'medium',
            title: '소속기관 정보 통일',
            description: '배움터와 종사자 관리에서 소속기관이 다르게 표시되고 있습니다.',
            steps: [
              '현재 실제 근무 기관을 확인하세요',
              '기관명 표기 방식의 차이인지 확인하세요 (예: 줄임말 vs 정식명칭)',
              '인사발령서로 정확한 소속을 확인하세요',
              '두 시스템에서 동일한 기관명으로 통일하세요'
            ]
          });
          break;
          
        case '입사일_불일치':
          actions.push({
            priority: 'low',
            title: '입사일 정보 정정',
            description: '입사일 정보가 일치하지 않습니다.',
            steps: [
              '인사발령서나 계약서로 정확한 입사일을 확인하세요',
              '시업일과 발령일 중 어느 것을 기준으로 할지 정하세요',
              '조직 내 입사일 기준을 명확히 하고 통일하세요',
              '필요시 경력 계산에 영향을 주는지 확인하세요'
            ]
          });
          break;
          
        case '직군_불일치':
          actions.push({
            priority: 'medium',
            title: '직군/직책 정보 업데이트',
            description: '담당 업무나 직책이 다르게 기록되어 있습니다.',
            steps: [
              '현재 실제 담당 업무를 확인하세요',
              '직군 분류 기준이 두 시스템에서 동일한지 확인하세요',
              '최근 인사발령이나 업무 변경사항을 반영하세요',
              '교육 이수 요건에 영향을 주는지 검토하세요'
            ]
          });
          break;
          
        case '상태모순_불일치':
          actions.push({
            priority: 'high',
            title: '재직 상태 긴급 확인',
            description: '재직/퇴직 상태에 모순이 발견되었습니다.',
            steps: [
              '해당 직원의 현재 근무 상태를 즉시 확인하세요',
              '휴직, 파견, 대기발령 등 특수 상황이 있는지 확인하세요',
              '시스템별 상태 업데이트 시점의 차이를 확인하세요',
              '정확한 상태로 모든 시스템을 동기화하세요'
            ]
          });
          break;
          
        default:
          actions.push({
            priority: 'medium',
            title: '데이터 검토 필요',
            description: '기타 데이터 불일치가 발견되었습니다.',
            steps: [
              '해당 항목의 데이터를 상세히 비교하세요',
              '불일치의 원인을 파악하세요',
              '필요시 원본 문서로 정확한 정보를 확인하세요',
              '데이터를 정정하고 재검토하세요'
            ]
          });
      }
    });
    
    // 우선순위별로 정렬 (high -> medium -> low)
    return actions.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };
  
  // 검색어 하이라이트 함수
  const highlightText = (text: string | undefined, searchTerm: string) => {
    if (!text || !searchTerm) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const { 
    participantData, 
    setParticipantData, 
    getParticipantEducationStatus, 
    getAllParticipantEducationStatus,
    getEducationSummaryStats,
    getDataInconsistencies,
    loadLazyData,
    forceReloadData,
    isLoaded,
    employeeData,
    setEmployeeData,
    basicEducationData,
    advancedEducationData
  } = useEducationData();

  // 검색어 debounce 처리
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 🔄 Optimized lazy loading with priority
  useEffect(() => {
    const loadDataAsync = async () => {
      // Priority 1: Load only essential data first (participants)
      if (!isLoaded?.participant) {
        console.log('📊 Loading participant data (priority)...');
        setIsLoading(true);
        try {
          await loadLazyData('participant');
        } finally {
          setIsLoading(false);
        }
      }
      
      // Priority 2: Load other data in background with delay
      setTimeout(() => {
        if (!isLoaded?.employee && activeTab === 'inconsistencies') {
          console.log('👥 Loading employee data for inconsistency analysis...');
          loadLazyData('employee');
        }
        
        if (!isLoaded?.basicEducation) {
          loadLazyData('basic');
        }
        
        if (!isLoaded?.advancedEducation) {
          loadLazyData('advanced');
        }
      }, 100); // Small delay to avoid blocking UI
    };
    
    loadDataAsync();
  }, []); // Load data on component mount

  // 종사자 데이터 재로딩 체크 (데이터가 비어있는 경우)
  useEffect(() => {
    if (isLoaded?.employee && (!employeeData || !Array.isArray(employeeData) || employeeData.length === 0)) {
      console.log('⚠️ 종사자 데이터가 로드되었지만 비어있음, forceReload 시도...');
      forceReloadData('employee');
    }
  }, [isLoaded?.employee, employeeData, forceReloadData]);

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

  // 🎯 Optimized participant stats with caching and worker support
  const participantStats = useMemo(() => {
    // 로딩중이면 이전 값 유지 또는 기본값 반환
    if (isLoading) {
      return { 
        allParticipants: [], 
        activeParticipants: [], 
        totalCount: 0, 
        activeCount: 0,
        stats: { total: 0, complete: 0, partial: 0, inProgress: 0, none: 0 }
      };
    }
    
    if (!participantData || participantData.length === 0) {
      return { 
        allParticipants: [], 
        activeParticipants: [], 
        totalCount: 0, 
        activeCount: 0,
        stats: { total: 0, complete: 0, partial: 0, inProgress: 0, none: 0 }
      };
    }
    
    // Use requestIdleCallback for non-blocking computation
    const computeStats = () => {
      const result = createParticipantBasedStats(
        participantData,
        basicEducationData || [],
        advancedEducationData || [],
        '2025-08-04'
      );
      
      // Batch process education status calculation
      const stats = { total: result.activeCount, complete: 0, partial: 0, inProgress: 0, none: 0 };
      const batchSize = 100;
      
      for (let i = 0; i < result.activeParticipants.length; i += batchSize) {
        const batch = result.activeParticipants.slice(i, i + batchSize);
        batch.forEach(participant => {
          const basicCompleted = participant.basicEducationStatus === '수료' || 
                                participant.basicEducationStatus === '완료' ||
                                participant.basicTraining === '수료' ||
                                participant.basicTraining === '완료';
          const advancedCompleted = participant.advancedEducationStatus === '수료' || 
                                   participant.advancedEducationStatus === '완료' ||
                                   participant.advancedEducation === '수료' ||
                                   participant.advancedEducation === '완료';
          
          if (basicCompleted && advancedCompleted) {
            stats.complete++;
          } else if (basicCompleted || advancedCompleted) {
            stats.partial++;
          } else if (participant.basicEducationStatus || participant.advancedEducationStatus ||
                     participant.basicTraining || participant.advancedEducation) {
            stats.inProgress++;
          } else {
            stats.none++;
          }
        });
      }
      
      return { ...result, stats };
    };
    
    return computeStats();
  }, [participantData, basicEducationData, advancedEducationData, isLoading]);

  // 기존 로직도 유지 (비교용)
  const allParticipantStatusList = useMemo(() => getAllParticipantEducationStatus(), [participantData, getAllParticipantEducationStatus]);
  const summaryStats = useMemo(() => getEducationSummaryStats(), [participantData, getEducationSummaryStats]);
  
  // 🔍 Cached inconsistency analysis for better performance
  const [inconsistencyData, setInconsistencyData] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  
  // Reset analysis cache when employee data changes
  useEffect(() => {
    setHasAnalyzed(false);
    setInconsistencyData([]);
  }, [employeeData?.length]);
  
  // Load analysis only when inconsistency tab is accessed
  useEffect(() => {
    // Only run when inconsistencies tab is active and we haven't analyzed yet
    if (activeTab === 'inconsistencies' && !hasAnalyzed && !isAnalyzing) {
      // Check if employee data is available and loaded
      if (isLoaded?.employee && employeeData && Array.isArray(employeeData) && employeeData.length > 0) {
        console.log('🚀 Starting inconsistency analysis for', employeeData.length, 'employees');
        setIsAnalyzing(true);
        
        // Use requestIdleCallback for better performance
        const performAnalysis = () => {
          console.log('🎯 performAnalysis 함수 시작됨');
          try {
            console.log('🔍 Computing inconsistency analysis...');
            console.log('📊 Employee data length:', employeeData.length);
            console.log('📊 Employee data sample:', employeeData.slice(0, 2));
            
            const result = getDataInconsistencies(employeeData);
            console.log('✅ Analysis completed:', result.length, 'institutions with issues');
            
            setInconsistencyData(result);
            setHasAnalyzed(true);
          } catch (error) {
            console.error('❌ Error during inconsistency analysis:', error);
            console.error('❌ Error stack:', error.stack);
            setInconsistencyData([]);
            setHasAnalyzed(true);
          } finally {
            console.log('🏁 performAnalysis 완료 - setIsAnalyzing(false) 호출');
            setIsAnalyzing(false);
          }
        };

        // Use a simple timeout to avoid requestIdleCallback issues with timeout protection
        const timeoutId = setTimeout(() => {
          if (isAnalyzing) {
            console.warn('⏰ Analysis timeout - forcing completion');
            setIsAnalyzing(false);
            setHasAnalyzed(true);
            setInconsistencyData([]);
          }
        }, 30000); // 30초 타임아웃
        
        setTimeout(() => {
          performAnalysis();
          clearTimeout(timeoutId);
        }, 100);
      } else {
        console.log('⚠️ Employee data not ready for inconsistency analysis');
        console.log('📊 Employee data state:', { 
          isLoaded: !!isLoaded?.employee,
          exists: !!employeeData, 
          isArray: Array.isArray(employeeData), 
          length: employeeData?.length || 0 
        });
        
        // If employee data is still loading, don't mark as analyzed yet
        if (!isLoaded?.employee || !employeeData || employeeData.length === 0) {
          console.log('🔄 Employee data not ready, loading directly from API...');
          
          // 즉시 API에서 데이터 로딩 (다시 분석하기와 동일한 로직)
          fetch('/api/employees?limit=10000&page=1&all=true')
            .then(response => {
              if (response.ok) {
                return response.json();
              }
              throw new Error('API request failed');
            })
            .then(apiData => {
              let employees = [];
              if (Array.isArray(apiData)) {
                employees = apiData;
              } else if (Array.isArray(apiData.data)) {
                employees = apiData.data;
              } else if (Array.isArray(apiData.employees)) {
                employees = apiData.employees;
              }
              
              if (employees.length > 0) {
                console.log('✅ API에서 직접 종사자 데이터 로드:', employees.length, '명');
                const result = getDataInconsistencies(employees);
                setInconsistencyData(result);
                setHasAnalyzed(true);
                setIsAnalyzing(false);
              }
            })
            .catch(error => {
              console.error('❌ API 직접 로딩 실패:', error);
              setIsAnalyzing(false);
            });
          
          return;
        }
        
        // No employee data available - mark as analyzed to stop loading
        console.log('🔄 No employee data available, stopping analysis');
        setIsAnalyzing(false);
        setHasAnalyzed(true);
        setInconsistencyData([]);
      }
    }
  }, [activeTab, hasAnalyzed, isAnalyzing, employeeData, isLoaded?.employee]);
  
  // Optimized filtering with better performance
  const filteredData = useMemo(() => {
    if (!allParticipantStatusList?.length) return [];
    
    const searchTerm = debouncedSearchTerm?.toLowerCase();
    
    // Use more efficient filtering approach
    return allParticipantStatusList.filter(participantStatus => {
      const participant = participantStatus.participant;
      
      // Quick exit for performance
      if (statusFilter !== 'all' && participantStatus.overallStatus !== statusFilter) {
        return false;
      }
      
      // Optimize search matching
      if (searchTerm) {
        const searchableText = [
          participant.name,
          participant.id,
          participant.institution,
          participant.jobType,
          participant.learningId,
          participant.institutionCode,
          participant.district,
          participant.birthDate
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      
      // Job type filter
      if (jobTypeFilter !== 'all') {
        const jobType = participant.jobType;
        if (jobTypeFilter === '전담사회복지사') {
          if (!jobType?.includes('전담') && jobType !== '전담사회복지사' && jobType !== '선임전담사회복지사') {
            return false;
          }
        } else if (jobTypeFilter === '생활지원사') {
          if (!jobType?.includes('생활지원') && jobType !== '생활지원사') {
            return false;
          }
        }
      }
      
      // Active status filter
      if (activeStatusFilter !== 'all') {
        if (activeStatusFilter === 'active') {
          if (participant.status === '중지' || participant.status === '휴먼대상' || participant.isActive === false) {
            return false;
          }
          if (participant.resignDate) {
            try {
              const resignDate = new Date(participant.resignDate);
              const today = new Date();
              if (resignDate <= today) {
                return false;
              }
            } catch {
              // Continue if date parsing fails
            }
          }
        } else if (activeStatusFilter === '중지' && participant.status !== '중지') {
          return false;
        } else if (activeStatusFilter === '휴먼대상' && participant.status !== '휴먼대상') {
          return false;
        }
      }
      
      return true;
    });
  }, [allParticipantStatusList, debouncedSearchTerm, statusFilter, jobTypeFilter, activeStatusFilter]);

  // Optimized pagination with larger default page size for better performance
  const { totalPages, startIndex, currentData, effectiveItemsPerPage } = useMemo(() => {
    // Increase default items per page to reduce re-renders
    const effectiveItemsPerPage = Math.max(itemsPerPage, 20);
    const totalPages = Math.ceil(filteredData.length / effectiveItemsPerPage);
    const startIndex = (currentPage - 1) * effectiveItemsPerPage;
    const currentData = filteredData.slice(startIndex, startIndex + effectiveItemsPerPage);
    return { totalPages, startIndex, currentData, effectiveItemsPerPage };
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
          {(isLoading || !isLoaded?.participant) && (
            <div className="flex items-center gap-2 mt-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">데이터 로딩 중...</span>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">
            <List className="h-4 w-4 mr-2" />
            소속 회원 목록 ({participantData?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="inconsistencies" className="relative">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span>데이터 불일치 분석</span>
            {/* 불일치 개수 표시 */}
            {isLoaded?.employee && employeeData?.length > 0 && (
              <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${
                inconsistencyData.length > 0 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {inconsistencyData?.reduce((sum, inst) => sum + inst.inconsistencies.length, 0) || 0}건
              </span>
            )}
            {/* 로딩 중 표시 */}
            {!isLoaded?.employee && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                로딩중...
              </span>
            )}
            {/* 분석 안내 */}
            {isLoaded?.employee && (!employeeData || employeeData.length === 0) && (
              <span className="ml-2 px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-700">
                클릭필요
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-6">
          {/* 데이터 업로드 섹션 - 접을 수 있는 UI */}
          <Collapsible defaultOpen={false}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-lg">데이터 업로드</CardTitle>
                  </div>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CardDescription>
                  Excel 파일을 통해 참가자 정보를 업로드하고 관리합니다
                </CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  <DateUploadForm
                    onUpload={handleDateUpload}
                    isUploading={isUploading}
                    title="참가자 데이터 업로드"
                    description="Excel 파일을 통해 참가자 정보를 특정 날짜 기준으로 업로드합니다"
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={handleClearData}
                      disabled={isLoading || !participantData || participantData.length === 0}
                    >
                      데이터 초기화
                    </Button>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* 교육 수료 통계 카드 */}
          {participantData && participantData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  교육 수료 통계
                </CardTitle>
                <CardDescription>
                  소속 회원들의 교육 수료 현황을 통계로 확인합니다
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <Card className="p-4 text-center border-l-4 border-l-blue-400">
                    <div className="text-2xl font-bold text-blue-600">{participantStats.stats.total}</div>
                    <div className="text-xs text-muted-foreground">재직자 ('정상' 상태)</div>
                    <div className="text-xs text-gray-500">전체: {participantStats.totalCount}명</div>
                  </Card>
                  <Card className="p-4 text-center border-l-4 border-l-green-500">
                    <div className="text-2xl font-bold text-green-600">{participantStats.stats.complete}</div>
                    <div className="text-xs text-muted-foreground">🟢 완전수료</div>
                    <div className="text-xs text-green-600 font-medium">
                      {participantStats.stats.total > 0 ? Math.round((participantStats.stats.complete / participantStats.stats.total) * 100) : 0}%
                    </div>
                  </Card>
                  <Card className="p-4 text-center border-l-4 border-l-yellow-500">
                    <div className="text-2xl font-bold text-yellow-600">{participantStats.stats.partial}</div>
                    <div className="text-xs text-muted-foreground">🟡 부분수료</div>
                    <div className="text-xs text-yellow-600 font-medium">
                      {participantStats.stats.total > 0 ? Math.round((participantStats.stats.partial / participantStats.stats.total) * 100) : 0}%
                    </div>
                  </Card>
                  <Card className="p-4 text-center border-l-4 border-l-blue-500">
                    <div className="text-2xl font-bold text-blue-600">{participantStats.stats.inProgress}</div>
                    <div className="text-xs text-muted-foreground">⚪ 진행중</div>
                    <div className="text-xs text-blue-600 font-medium">
                      {participantStats.stats.total > 0 ? Math.round((participantStats.stats.inProgress / participantStats.stats.total) * 100) : 0}%
                    </div>
                  </Card>
                  <Card className="p-4 text-center border-l-4 border-l-red-500">
                    <div className="text-2xl font-bold text-red-600">{participantStats.stats.none}</div>
                    <div className="text-xs text-muted-foreground">🔴 미수료</div>
                    <div className="text-xs text-red-600 font-medium">
                      {participantStats.stats.total > 0 ? Math.round((participantStats.stats.none / participantStats.stats.total) * 100) : 0}%
                    </div>
                  </Card>
                </div>

              </CardContent>
            </Card>
          )}

          {/* 소속 회원 교육 이수 현황 카드 */}
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
                  onClick={forceRefreshData}
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

                  {/* 필터링 및 검색 */}
                  <div className="mb-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-md">
                          <div className="text-lg font-semibold">
                            {searchTerm || statusFilter !== 'all' || jobTypeFilter !== 'all' || activeStatusFilter !== 'all' 
                              ? `${filteredData.length}명` 
                              : `${participantStats.stats.total}명`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {searchTerm || statusFilter !== 'all' || jobTypeFilter !== 'all' || activeStatusFilter !== 'all' 
                              ? `필터된 결과 (정상상태 ${participantStats.stats.total}명 중)` 
                              : `전체 정상상태 회원 (총 ${participantStats.totalCount}명 중)`}
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

                  {/* 소속 회원 목록 테이블 - Optimized */}
                  <div className="rounded-md border">
                    <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                      <div className="text-sm text-muted-foreground">
                        총 {filteredData.length}명 중 {currentData.length}명 표시
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullTable(!showFullTable)}
                        className="text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        {showFullTable ? '간단히 보기' : '전체 컴럼 보기'}
                      </Button>
                    </div>
                    <div className="overflow-auto max-h-[600px] w-full">
                      <Table className="table-auto w-full" style={{ minWidth: showFullTable ? '2000px' : '1200px' }}>
                        <TableHeader className="sticky top-0 bg-background z-20 shadow-sm">
                          <TableRow>
                            <TableHead className="w-16 text-center bg-background border-b border-r">No</TableHead>
                            <TableHead className="w-40 bg-background border-b border-r">소속</TableHead>
                            <TableHead className="w-28 bg-background border-b border-r">회원명</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">직군</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">생년월일</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">휴대전화</TableHead>
                            <TableHead className="w-24 text-center bg-background border-b border-r">상태</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">최종수료</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b border-r">기초직무</TableHead>
                            <TableHead className="w-32 text-center bg-background border-b">심화교육</TableHead>
                            
                            {/* 전체 보기에서만 표시되는 컴럼들 */}
                            {showFullTable && (
                              <>
                                <TableHead className="w-32 text-center bg-background border-b border-r">기관코드</TableHead>
                                <TableHead className="w-24 text-center bg-background border-b border-r">유형</TableHead>
                                <TableHead className="w-20 text-center bg-background border-b border-r">성별</TableHead>
                                <TableHead className="w-32 text-center bg-background border-b border-r">ID</TableHead>
                                <TableHead className="w-48 text-center bg-background border-b border-r">이메일</TableHead>
                                <TableHead className="w-24 text-center bg-background border-b border-r">수강건수</TableHead>
                                <TableHead className="w-32 text-center bg-background border-b border-r">입사일</TableHead>
                                <TableHead className="w-32 text-center bg-background border-b border-r">퇴사일</TableHead>
                                <TableHead className="w-32 text-center bg-background border-b border-r">접속일</TableHead>
                                <TableHead className="w-32 text-center bg-background border-b border-r">가입일</TableHead>
                              </>
                            )}
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
                                <TableCell className="font-medium border-r">{participant.name || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  <Badge variant="outline" className="text-xs">{participant.jobType || '-'}</Badge>
                                </TableCell>
                                <TableCell className="text-center border-r text-xs">{participant.birthDate || '-'}</TableCell>
                                <TableCell className="text-center border-r font-mono text-xs">{participant.phone || '-'}</TableCell>
                                <TableCell className="text-center border-r">
                                  {getParticipantStatusBadge(participant.status)}
                                </TableCell>
                                <TableCell className="text-center border-r text-xs">{getStatusBadge(participantStatus.overallStatus)}</TableCell>
                                <TableCell className="text-center border-r text-xs">{getEducationBadge(participantStatus.basicEducation.status)}</TableCell>
                                <TableCell className="text-center text-xs">{getEducationBadge(participantStatus.advancedEducation.status)}</TableCell>
                                
                                {/* 전체 보기에서만 표시되는 컬럼들 */}
                                {showFullTable && (
                                  <>
                                    <TableCell className="text-center border-r font-mono text-xs">{participant.institutionCode || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.institutionType || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.gender || '-'}</TableCell>
                                    <TableCell className="text-center border-r font-mono text-sm">{participant.id || '-'}</TableCell>
                                    <TableCell className="border-r text-xs" title={participant.email}>{participant.email || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.courseCount || 0}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.hireDate || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.resignDate || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.lastAccessDate || '-'}</TableCell>
                                    <TableCell className="text-center border-r text-xs">{participant.registrationDate || '-'}</TableCell>
                                  </>
                                )}
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

          {/* 기관별 교육이수 현황 분석 카드 */}
          {participantData && participantData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  📊 기관별 교육이수 현황 분석
                </CardTitle>
                <CardDescription>
                  소속 기관별 교육 수료 현황을 상세 분석합니다 (폐지 기관 제외)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(() => {
                    // 통합된 데이터 사용 (교육 상태가 매칭된 데이터) - 폐지 기관 제외
                    const allActiveMembers = participantStats.activeParticipants || participantStats.allParticipants || [];
                    const closedKeywords = ['폐지', '종료', '중단', '해지', '해산', '폐쇄', '중지', '종료예정'];
                    const activeMembers = allActiveMembers.filter(member => {
                      const institution = member.institution || '';
                      return !closedKeywords.some(keyword => 
                        institution.toLowerCase().includes(keyword.toLowerCase())
                      );
                    });
                    
                    const institutionStats = activeMembers.reduce((acc, member) => {
                      const institution = member.institution || '소속기관 미상';
                      const jobType = member.jobType || '직군 미상';
                      
                      // 수료 상태 다시 계산 (더 정확한 판정)
                      const basicCompleted = member.basicEducationStatus === '수료' || 
                                            member.basicEducationStatus === '완료' ||
                                            member.basicTraining === '수료' ||
                                            member.basicTraining === '완료';
                      const advancedCompleted = member.advancedEducationStatus === '수료' || 
                                               member.advancedEducationStatus === '완료' ||
                                               member.advancedEducation === '수료' ||
                                               member.advancedEducation === '완료';
                      
                      let completionStatus = 'none';
                      if (basicCompleted && advancedCompleted) {
                        completionStatus = 'complete';
                      } else if (basicCompleted || advancedCompleted) {
                        completionStatus = 'partial';
                      } else if (member.basicEducationStatus || member.advancedEducationStatus || 
                                member.basicTraining || member.advancedEducation) {
                        completionStatus = 'inProgress';
                      }
                      
                      // 기관명 정규화 (매칭 개선)
                      const normalizedInstitution = institution.replace(/\s+/g, '').toLowerCase();
                      const displayInstitution = institution;
                      
                      if (!acc[displayInstitution]) {
                        acc[displayInstitution] = {
                          total: 0,
                          전담사회복지사: { total: 0, complete: 0, partial: 0, inProgress: 0, none: 0 },
                          생활지원사: { total: 0, complete: 0, partial: 0, inProgress: 0, none: 0 }
                        };
                      }
                      
                      acc[displayInstitution].total++;
                      if (acc[displayInstitution][jobType]) {
                        acc[displayInstitution][jobType].total++;
                        acc[displayInstitution][jobType][completionStatus]++;
                      }
                      
                      return acc;
                    }, {});

                    // 모든 기관을 완전수료율 순으로 정렬 (우수기관 먼저, 개선필요 기관 마지막)
                    const allInstitutions = Object.entries(institutionStats)
                      .map(([institution, stats]) => {
                        const completionRate = stats.total > 0 
                          ? Math.round(((stats.전담사회복지사.complete + stats.생활지원사.complete) / stats.total) * 100)
                          : 0;
                        return { institution, stats, completionRate };
                      })
                      .sort((a, b) => {
                        // 1차: 완전수료율 높은 순 (우수기관 먼저)
                        if (b.completionRate !== a.completionRate) {
                          return b.completionRate - a.completionRate;
                        }
                        // 2차: 총 인원수 많은 순
                        return b.stats.total - a.stats.total;
                      });

                    // 페이지네이션 계산
                    const totalInstitutions = allInstitutions.length;
                    const totalPages = Math.ceil(totalInstitutions / institutionsPerPage);
                    const startIndex = (institutionPage - 1) * institutionsPerPage;
                    const endIndex = startIndex + institutionsPerPage;
                    const currentInstitutions = allInstitutions.slice(startIndex, endIndex);

                    return (
                      <>
                        {/* 기관별 분석 헤더 */}
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-sm text-gray-600">
                            전체 {totalInstitutions}개 기관 중 {startIndex + 1}-{Math.min(endIndex, totalInstitutions)}번째 
                            (페이지 {institutionPage}/{totalPages})
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInstitutionPage(Math.max(1, institutionPage - 1))}
                              disabled={institutionPage === 1}
                            >
                              이전
                            </Button>
                            <span className="text-sm px-3 py-1 bg-gray-100 rounded">
                              {institutionPage} / {totalPages}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInstitutionPage(Math.min(totalPages, institutionPage + 1))}
                              disabled={institutionPage === totalPages}
                            >
                              다음
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {currentInstitutions.map(({ institution, stats, completionRate }) => (
                            <Card key={institution} className={`p-5 transition-all duration-200 hover:shadow-md ${
                              completionRate >= 80 ? 'border-l-4 border-l-green-500 bg-green-50/30' :
                              completionRate >= 60 ? 'border-l-4 border-l-yellow-500 bg-yellow-50/30' :
                              'border-l-4 border-l-red-500 bg-red-50/30'
                            }`}>
                              <div className="space-y-4">
                                {/* 기관명 및 등급 */}
                                <div className="flex justify-between items-start">
                                  <div className="flex-1 pr-3">
                                    <h3 className="font-semibold text-base text-gray-800 leading-tight mb-1" title={institution}>
                                      {institution.length > 25 ? `${institution.substring(0, 25)}...` : institution}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <span className="font-medium">총 {stats.total}명</span>
                                      <span className="text-gray-400">•</span>
                                      <span className={`font-semibold ${
                                        completionRate >= 80 ? 'text-green-600' :
                                        completionRate >= 60 ? 'text-yellow-600' :
                                        'text-red-600'
                                      }`}>
                                        완전수료율 {completionRate}%
                                      </span>
                                    </div>
                                  </div>
                                  <div className={`px-3 py-2 rounded-lg font-bold text-sm ${
                                    completionRate >= 80 ? 'bg-green-100 text-green-800' :
                                    completionRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {completionRate >= 80 ? '🏆 우수' : completionRate >= 60 ? '📊 보통' : '⚠️ 개선필요'}
                                  </div>
                                </div>

                                {/* 진행률 바 - 상단으로 이동 */}
                                <div className="space-y-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all duration-500 ${
                                        completionRate >= 80 ? 'bg-green-400' :
                                        completionRate >= 60 ? 'bg-yellow-400' :
                                        'bg-red-400'
                                      }`}
                                      style={{ width: `${completionRate}%` }}
                                    />
                                  </div>
                                </div>
                                
                                {/* 직군별 상세 통계 - 단순화된 레이아웃 */}
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div className="bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-gray-800 font-medium">전담사회복지사</h4>
                                      <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded border">
                                        {stats.전담사회복지사.total}명
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>• 완전 {stats.전담사회복지사.complete} • 부분 {stats.전담사회복지사.partial}</div>
                                      <div>• 진행 {stats.전담사회복지사.inProgress} • 미수료 {stats.전담사회복지사.none}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="bg-gray-50 p-3 rounded-lg border">
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-gray-800 font-medium">생활지원사</h4>
                                      <span className="bg-white text-gray-700 text-xs font-semibold px-2 py-1 rounded border">
                                        {stats.생활지원사.total}명
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-1">
                                      <div>• 완전 {stats.생활지원사.complete} • 부분 {stats.생활지원사.partial}</div>
                                      <div>• 진행 {stats.생활지원사.inProgress} • 미수료 {stats.생활지원사.none}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="inconsistencies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                데이터 불일치 분석
                {/* 디버그 정보 */}
                {activeTab === 'inconsistencies' && (
                  <Badge variant="outline" className="ml-2">
                    종사자: {employeeData?.length || 0}명 | 로드상태: {isLoaded?.employee ? '✅' : '❌'}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                <div className="space-y-3">
                  <div className="text-gray-700">종사자 관리(모인우리) 데이터와 소속 회원(배움터) 데이터 간의 상태 불일치를 분석합니다.</div>
                  
                  {/* 🎯 분석 상태 안내 */}
                  <div className={`p-3 rounded-lg border-l-4 ${
                    !isLoaded?.employee 
                      ? 'bg-blue-50 border-l-blue-400'
                      : employeeData?.length > 0 
                        ? inconsistencyData.length > 0
                          ? 'bg-red-50 border-l-red-400'
                          : 'bg-green-50 border-l-green-400'
                        : 'bg-orange-50 border-l-orange-400'
                  }`}>
                    {!isLoaded?.employee ? (
                      <div className="text-blue-800">
                        <strong>📊 데이터 로딩 중...</strong> 
                        <span className="text-blue-600 ml-2">종사자 데이터를 백그라운드에서 불러오고 있습니다.</span>
                      </div>
                    ) : employeeData?.length > 0 ? (
                      inconsistencyData.length > 0 ? (
                        <div className="text-red-800">
                          <strong>⚠️ 불일치 발견!</strong> 
                          <span className="text-red-600 ml-2">
                            {inconsistencyData.reduce((sum, inst) => sum + inst.inconsistencies.length, 0)}건의 
                            데이터 불일치가 발견되었습니다.
                          </span>
                        </div>
                      ) : (
                        <div className="text-green-800">
                          <strong>✅ 분석 완료!</strong> 
                          <span className="text-green-600 ml-2">모든 데이터가 일치합니다.</span>
                        </div>
                      )
                    ) : (
                      <div className="text-orange-800">
                        <strong>🔄 분석 준비 중...</strong> 
                        <span className="text-orange-600 ml-2">종사자 데이터를 로딩하고 있습니다.</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <strong className="text-orange-600">중요:</strong> 불일치 발견 시 종사자 관리(모인우리) 데이터를 우선으로 처리됩니다.
                    </div>
                    
                    {/* 항상 사용 가능한 재분석 버튼 */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          console.log('🚀 Manual re-analysis with API data');
                          setIsAnalyzing(true);
                          setHasAnalyzed(false);
                          
                          try {
                            // API에서 직접 종사자 데이터 가져오기 (전체 데이터 요청)
                            const response = await fetch('/api/employees?limit=10000&page=1&all=true');
                            if (response.ok) {
                              const apiData = await response.json();
                              console.log('🔍 API 응답 구조:', apiData);
                              console.log('🔍 apiData.data 타입:', typeof apiData.data);
                              console.log('🔍 apiData.data 길이:', Array.isArray(apiData.data) ? apiData.data.length : 'Not array');
                              
                              // 다양한 구조 시도
                              let employees = [];
                              if (Array.isArray(apiData)) {
                                employees = apiData;
                                console.log('📊 직접 배열 사용:', employees.length, 'employees');
                              } else if (Array.isArray(apiData.data)) {
                                employees = apiData.data;
                                console.log('📊 apiData.data 사용:', employees.length, 'employees');
                              } else if (Array.isArray(apiData.employees)) {
                                employees = apiData.employees;
                                console.log('📊 apiData.employees 사용:', employees.length, 'employees');
                              } else {
                                console.error('❌ 알 수 없는 API 응답 구조');
                              }
                              
                              if (employees.length > 0) {
                                // API 데이터로 직접 분석 실행
                                const result = getDataInconsistencies(employees);
                                setInconsistencyData(result);
                                setHasAnalyzed(true);
                                console.log('✅ Manual analysis completed:', result.length, 'institutions');
                              } else {
                                throw new Error('No employee data from API');
                              }
                            } else {
                              throw new Error('API request failed');
                            }
                          } catch (error) {
                            console.error('❌ Manual analysis failed:', error);
                            setInconsistencyData([]);
                            setHasAnalyzed(true);
                          } finally {
                            setIsAnalyzing(false);
                          }
                        }}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800"
                        disabled={isAnalyzing}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        다시 분석하기
                      </Button>
                      
                      {/* 종사자 데이터 로딩 상태 표시 */}
                      <div className="flex items-center text-xs text-gray-500">
                        종사자 데이터: {isLoaded?.employee ? '✅ 로드됨' : '⏳ 로딩중'} 
                        ({employeeData?.length || 0}명)
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-md">
                    <h4 className="font-semibold text-blue-800 mb-2">📋 상태 일치 기준</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li><strong className="text-blue-800">재직 상태 일치:</strong> 배움터 "정상" ↔ 모인우리 "재직"</li>
                      <li><strong className="text-blue-800">퇴직 상태 일치:</strong> 배움터 "휴면대상", "중지", "탈퇴" ↔ 모인우리 "퇴직"</li>
                      <li><strong className="text-blue-800">퇴사일 일치:</strong> 양쪽 모두 동일한 날짜 또는 10일 이내 차이</li>
                      <li><strong className="text-blue-800">퇴사일 불일치:</strong> 한쪽만 퇴사일 있음, 또는 10일 이상 차이</li>
                      <li><strong className="text-blue-800">불일치 예시:</strong> 배움터 "정상" ↔ 모인우리 "퇴직"</li>
                    </ul>
                  </div>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAnalyzing ? (
                <div className="text-center py-12">
                  <div className="flex items-center justify-center mb-4">
                    <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mr-3" />
                    <div>
                      <div className="text-lg font-medium text-blue-600">불일치 분석 진행 중...</div>
                      <div className="text-sm text-gray-500">데이터를 분석하고 있습니다. 잠시만 기다려 주세요.</div>
                      <div className="text-xs text-gray-400 mt-2">
                        종사자 데이터: {employeeData?.length || 0}개 | 분석됨: {hasAnalyzed ? '예' : '아니오'}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🔄 Forcing analysis reset...');
                      setIsAnalyzing(false);
                      setHasAnalyzed(false);
                      setInconsistencyData([]);
                    }}
                    className="mt-4"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    분석 재시작
                  </Button>
                </div>
              ) : inconsistencyData.length === 0 ? (
                <div className="text-center py-8">
                  {!isLoaded?.employee ? (
                    <div>
                      <div className="text-blue-600 mb-2">📊 데이터 분석 준비 중...</div>
                      <div className="text-blue-500 mb-4">
                        백그라운드에서 종사자 데이터를 로딩하고 있습니다.
                      </div>
                      <div className="flex items-center justify-center gap-2 text-blue-400">
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        잠시만 기다려주세요...
                      </div>
                    </div>
                  ) : employeeData?.length > 0 ? (
                    <div>
                      <div className="text-green-600 mb-2">✅ 데이터 일치 확인</div>
                      <div className="text-green-500 mb-4">
                        모든 종사자 데이터와 소속 회원 데이터가 일치합니다.
                      </div>
                      <div className="text-sm text-gray-600">
                        총 {employeeData?.length || 0}명의 데이터를 분석한 결과입니다.
                      </div>
                      {/* 소속회원 기준 디버그 정보 */}
                      <div className="text-xs text-gray-500 mt-2 p-2 bg-blue-50 rounded">
                        <div>🔍 소속회원 기준 통계:</div>
                        <div>- 전체 소속회원: {participantStats.totalCount}명</div>
                        <div>- 정상상태만: {participantStats.stats.total}명</div>
                        <div>- 교육 데이터: 기초 {basicEducationData?.length || 0}건, 심화 {advancedEducationData?.length || 0}건</div>
                        <div className="text-green-600 font-medium">✅ 논리적으로 일관된 통계</div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-orange-600 mb-2">⚠️ 종사자 데이터 필요</div>
                      <div className="text-orange-500 mb-4">
                        종사자 관리(모인우리) 데이터가 업로드되지 않아 불일치 분석을 할 수 없습니다.
                      </div>
                      
                      {/* 디버그 정보 및 수동 로드 버튼 */}
                      <div className="bg-orange-50 p-4 rounded-md mb-4">
                        <h4 className="font-semibold text-orange-800 mb-2">🔧 디버그 정보</h4>
                        <div className="text-sm text-orange-600 space-y-1">
                          <div>종사자 데이터 배열: {employeeData ? `${employeeData.length}명` : '없음'}</div>
                          <div>로드 상태: {isLoaded?.employee ? '로드 완료' : '미로드'}</div>
                          <div>데이터 타입: {Array.isArray(employeeData) ? '배열' : typeof employeeData}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 border-orange-300 text-orange-700 hover:bg-orange-100"
                          onClick={() => {
                            console.log('🔄 수동 종사자 데이터 로드 시작...');
                            loadLazyData('employee');
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          종사자 데이터 수동 로드
                        </Button>
                      </div>
                    </div>
                  )}
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
                        {inconsistencyData.reduce((sum, inst) => sum + inst.inconsistencies.length, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">총 불일치 건수</div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-red-500">
                      <div className="text-2xl font-bold text-red-600">
                        {inconsistencyData.length}
                      </div>
                      <div className="text-sm text-muted-foreground">영향받는 기관</div>
                    </Card>
                    <Card className="p-4 border-l-4 border-l-blue-500">
                      <div className="text-2xl font-bold text-blue-600">
                        {inconsistencyData.filter(inst => inst.institution.includes('거제')).length}
                      </div>
                      <div className="text-sm text-muted-foreground">거제 관련 기관</div>
                    </Card>
                  </div>

                  {/* 📋 기관별 불일치 개요 테이블 */}
                  <Card id="inconsistency-overview" className="border-l-4 border-l-blue-500">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Eye className="h-5 w-5 text-blue-600" />
                        기관별 불일치 현황 개요
                        <Badge variant="outline" className="ml-2">
                          {inconsistencyData.length}개 기관
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        각 기관을 클릭하면 해당 기관의 상세 불일치 내역으로 이동합니다.
                        <br />
                        <span className="text-sm text-amber-600 font-medium">
                          ⚠️ 총 불일치는 고유한 항목 수이며, 각 카테고리별 합계와 다를 수 있습니다 (한 항목이 여러 카테고리에 해당될 수 있음)
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border border-gray-200 rounded-lg">
                        {/* 고정 헤더 */}
                        <div className="bg-white border-b-2 border-gray-300 rounded-t-lg">
                          <div className="grid grid-cols-8 gap-0 px-3 py-4 text-sm font-semibold">
                            <div className="text-left">기관명</div>
                            <div className="text-center">총 불일치</div>
                            <div className="text-center bg-red-50 px-2 py-1 rounded">배움터만 존재</div>
                            <div className="text-center bg-blue-50 px-2 py-1 rounded">모인우리만 존재</div>
                            <div className="text-center bg-orange-50 px-2 py-1 rounded">상태 모순</div>
                            <div className="text-center bg-yellow-50 px-2 py-1 rounded">퇴사일 불일치</div>
                            <div className="text-center bg-purple-50 px-2 py-1 rounded">소속기관 불일치</div>
                            <div className="text-center">이동</div>
                          </div>
                        </div>
                        
                        {/* 스크롤 가능한 데이터 영역 */}
                        <div className="overflow-auto max-h-[500px]">
                          <div className="space-y-0">
                            {inconsistencyData.map((institutionData, instIndex) => {
                              const learningOnlyCount = institutionData.inconsistencies.filter(inc => 
                                inc.type === '배움터에만_존재' || 
                                (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('배움터에만_존재'))
                              ).length;
                              
                              const employeeOnlyCount = institutionData.inconsistencies.filter(inc => 
                                inc.type === '모인우리에만_존재' || 
                                (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('모인우리에만_존재'))
                              ).length;
                              
                              const statusMismatchCount = institutionData.inconsistencies.filter(inc => 
                                inc.type?.includes('상태') || 
                                (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('상태모순_불일치'))
                              ).length;
                              
                              const resignDateMismatchCount = institutionData.inconsistencies.filter(inc => 
                                inc.type?.includes('퇴사일') || 
                                (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('퇴사일_불일치'))
                              ).length;
                              
                              const institutionMismatchCount = institutionData.inconsistencies.filter(inc => 
                                inc.type?.includes('소속기관') || 
                                (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('소속기관_불일치'))
                              ).length;
                              
                              return (
                                <div key={instIndex} className="grid grid-cols-8 gap-0 px-3 py-3 hover:bg-gray-50 border-b border-gray-100 items-center">
                                  <div className="font-medium text-sm">
                                    {institutionData.institution}
                                  </div>
                                  <div className="text-center">
                                    <Badge variant="destructive" className="px-2 py-1 text-xs">
                                      {institutionData.inconsistencies.length}
                                    </Badge>
                                  </div>
                                  <div className="text-center">
                                    {learningOnlyCount > 0 ? (
                                      <Badge variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 text-xs px-2 py-1">
                                        {learningOnlyCount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    {employeeOnlyCount > 0 ? (
                                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs px-2 py-1">
                                        {employeeOnlyCount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    {statusMismatchCount > 0 ? (
                                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 text-xs px-2 py-1">
                                        {statusMismatchCount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    {resignDateMismatchCount > 0 ? (
                                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 text-xs px-2 py-1">
                                        {resignDateMismatchCount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    {institutionMismatchCount > 0 ? (
                                      <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs px-2 py-1">
                                        {institutionMismatchCount}
                                      </Badge>
                                    ) : (
                                      <span className="text-gray-400 text-xs">0</span>
                                    )}
                                  </div>
                                  <div className="text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        console.log(`🔍 이동 버튼 클릭: institution-${instIndex}`);
                                        const element = document.getElementById(`institution-${instIndex}`);
                                        console.log(`🔍 대상 요소 찾음:`, element);
                                        if (element) {
                                          console.log(`🔍 스크롤 시작`);
                                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        } else {
                                          console.error(`❌ 요소를 찾을 수 없음: institution-${instIndex}`);
                                        }
                                      }}
                                      className="h-7 px-2 text-xs"
                                    >
                                      이동
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 불일치 유형별 필터 버튼 */}
                  <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg">
                    <Button
                      variant={selectedInconsistencyType === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('all')}
                      className="min-w-[100px]"
                    >
                      전체 보기
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => sum + inst.inconsistencies.length, 0)}
                      </Badge>
                    </Button>
                    <Button
                      variant={selectedInconsistencyType === '모인우리에만_존재' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('모인우리에만_존재')}
                      className="min-w-[150px]"
                    >
                      모인우리에만 존재
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => 
                          sum + inst.inconsistencies.filter(inc => 
                            inc.type === '모인우리에만_존재' || 
                            (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('모인우리에만_존재'))
                          ).length, 0)}
                      </Badge>
                    </Button>
                    <Button
                      variant={selectedInconsistencyType === '배움터에만_존재' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('배움터에만_존재')}
                      className="min-w-[150px]"
                    >
                      배움터에만 존재
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => 
                          sum + inst.inconsistencies.filter(inc => 
                            inc.type === '배움터에만_존재' || 
                            (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('배움터에만_존재'))
                          ).length, 0)}
                      </Badge>
                    </Button>
                    <Button
                      variant={selectedInconsistencyType === '퇴사일_불일치' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('퇴사일_불일치')}
                      className="min-w-[140px]"
                    >
                      퇴사일 불일치
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => 
                          sum + inst.inconsistencies.filter(inc => 
                            inc.type?.includes('퇴사일') || 
                            (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('퇴사일_불일치'))
                          ).length, 0)}
                      </Badge>
                    </Button>
                    <Button
                      variant={selectedInconsistencyType === '소속기관_불일치' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('소속기관_불일치')}
                      className="min-w-[140px]"
                    >
                      소속기관 불일치
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => 
                          sum + inst.inconsistencies.filter(inc => 
                            inc.type?.includes('소속기관') || 
                            (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('소속기관_불일치'))
                          ).length, 0)}
                      </Badge>
                    </Button>
                    <Button
                      variant={selectedInconsistencyType === '상태모순_불일치' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedInconsistencyType('상태모순_불일치')}
                      className="min-w-[140px]"
                    >
                      상태 모순
                      <Badge variant="secondary" className="ml-2">
                        {inconsistencyData.reduce((sum, inst) => 
                          sum + inst.inconsistencies.filter(inc => 
                            inc.type?.includes('상태') || 
                            (inc.inconsistencyTypes && inc.inconsistencyTypes.includes('상태모순_불일치'))
                          ).length, 0)}
                      </Badge>
                    </Button>
                  </div>

                  {/* 검색 기능 */}
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="flex-1">
                      <Input
                        placeholder="이름, 기관명, 직군으로 검색..."
                        value={inconsistencySearchTerm}
                        onChange={(e) => setInconsistencySearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {(() => {
                        // 현재 선택된 유형과 검색어를 모두 고려한 필터링
                        const filteredInstitutions = inconsistencyData
                          .map(inst => ({
                            ...inst,
                            inconsistencies: inst.inconsistencies.filter(inconsistency => {
                              // 유형별 필터링
                              if (selectedInconsistencyType !== 'all') {
                                const hasSelectedType = inconsistency.type === selectedInconsistencyType ||
                                  (inconsistency.inconsistencyTypes && 
                                   inconsistency.inconsistencyTypes.includes(selectedInconsistencyType));
                                if (!hasSelectedType) return false;
                              }
                              
                              // 검색어 필터링
                              if (!inconsistencySearchTerm) return true;
                              const searchLower = inconsistencySearchTerm.toLowerCase();
                              return (
                                inconsistency.name.toLowerCase().includes(searchLower) ||
                                inconsistency.jobType?.toLowerCase().includes(searchLower)
                              );
                            })
                          }))
                          .filter(inst => {
                            if (inconsistencySearchTerm) {
                              const searchLower = inconsistencySearchTerm.toLowerCase();
                              return inst.institution.toLowerCase().includes(searchLower) || inst.inconsistencies.length > 0;
                            }
                            return inst.inconsistencies.length > 0;
                          });
                        
                        const totalFilteredInconsistencies = filteredInstitutions.reduce((sum, inst) => sum + inst.inconsistencies.length, 0);
                        
                        let statusText = '';
                        if (selectedInconsistencyType !== 'all') {
                          statusText += `[${selectedInconsistencyType.replace(/_/g, ' ')}] `;
                        }
                        if (inconsistencySearchTerm) {
                          statusText += `검색: "${inconsistencySearchTerm}" `;
                        }
                        statusText += `${filteredInstitutions.length}개 기관, ${totalFilteredInconsistencies}건 불일치`;
                        
                        return statusText;
                      })()}
                    </div>
                  </div>

                  {/* 기관별 불일치 리스트 */}
                  {inconsistencyData
                    .map(inst => ({
                      ...inst,
                      inconsistencies: inst.inconsistencies.filter(inconsistency => {
                        // 유형별 필터링
                        if (selectedInconsistencyType !== 'all') {
                          const hasSelectedType = inconsistency.type === selectedInconsistencyType ||
                            (inconsistency.inconsistencyTypes && 
                             inconsistency.inconsistencyTypes.includes(selectedInconsistencyType));
                          if (!hasSelectedType) return false;
                        }
                        
                        // 검색어 필터링
                        if (!inconsistencySearchTerm) return true;
                        const searchLower = inconsistencySearchTerm.toLowerCase();
                        return (
                          inconsistency.name.toLowerCase().includes(searchLower) ||
                          inconsistency.jobType?.toLowerCase().includes(searchLower)
                        );
                      })
                    }))
                    .filter(inst => {
                      // 기관명 검색 또는 해당 유형의 불일치가 있는 기관만 표시
                      if (inconsistencySearchTerm) {
                        const searchLower = inconsistencySearchTerm.toLowerCase();
                        return inst.institution.toLowerCase().includes(searchLower) || inst.inconsistencies.length > 0;
                      }
                      return inst.inconsistencies.length > 0;
                    })
                    .map((institutionData, instIndex) => (
                    <Card key={instIndex} id={`institution-${instIndex}`} className="border-l-4 border-l-orange-400">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          <span>{highlightText(institutionData.institution, inconsistencySearchTerm)}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="ml-2">
                              {institutionData.inconsistencies.length}건 불일치
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const element = document.getElementById('inconsistency-overview');
                                if (element) {
                                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className="h-8 px-3 text-xs"
                              title="개요로 돌아가기"
                            >
                              ↑ 개요
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-4 p-3 bg-gray-50 rounded-md">
                          <div className="text-sm text-gray-700 space-y-1">
                            <div><strong>필터링 기준:</strong></div>
                            <div>• 배움터 "휴면대상"/"중지"/"탈퇴" ↔ 모인우리 "퇴직" = <span className="text-green-600 font-semibold">정상 일치</span></div>
                            <div>• 퇴사일 10일 이내 차이 = <span className="text-green-600 font-semibold">정상 일치</span></div>
                            <div>• 위 조건들은 아래 불일치 목록에서 <strong>제외</strong>됩니다</div>
                          </div>
                        </div>
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
                                <TableHead className="w-24 bg-orange-50">유사 데이터</TableHead>
                                <TableHead className="w-24">상세보기</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {institutionData.inconsistencies
                                .filter(inconsistency => {
                                  // 유형별 필터링
                                  if (selectedInconsistencyType !== 'all') {
                                    const hasSelectedType = inconsistency.type === selectedInconsistencyType ||
                                      (inconsistency.inconsistencyTypes && 
                                       inconsistency.inconsistencyTypes.includes(selectedInconsistencyType));
                                    if (!hasSelectedType) return false;
                                  }
                                  
                                  // 검색어 필터링
                                  if (!inconsistencySearchTerm) return true;
                                  const searchLower = inconsistencySearchTerm.toLowerCase();
                                  return (
                                    inconsistency.name.toLowerCase().includes(searchLower) ||
                                    inconsistency.jobType?.toLowerCase().includes(searchLower)
                                  );
                                })
                                .map((inconsistency, idx) => (
                                <TableRow key={idx} className="hover:bg-muted/50">
                                  <TableCell className="font-medium">
                                    {highlightText(inconsistency.name, inconsistencySearchTerm)}
                                  </TableCell>
                                  <TableCell className="font-mono text-xs">{inconsistency.birthDate || '-'}</TableCell>
                                  <TableCell className="font-mono text-xs">{highlightText(inconsistency.id, inconsistencySearchTerm)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="text-xs">
                                      {highlightText(inconsistency.jobType || '미분류', inconsistencySearchTerm)}
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
                                  <TableCell className="bg-orange-50">
                                    {inconsistency.similarData?.hasSimilarData ? (
                                      <div className="text-xs">
                                        <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800 border-orange-300">
                                          유사 {inconsistency.similarData.similarCount}건
                                        </Badge>
                                        <div className="mt-1 text-[10px] text-orange-600 leading-tight">
                                          {inconsistency.similarData.mostSimilarEmployee.similarity?.type === '이름일치_생년월일차이' && (
                                            `생년월일 ${inconsistency.similarData.mostSimilarEmployee.similarity.birthDateDiff}일 차이`
                                          )}
                                          {inconsistency.similarData.mostSimilarEmployee.similarity?.type === '생년월일일치_이름유사' && (
                                            '생년월일 일치'
                                          )}
                                          {inconsistency.similarData.mostSimilarEmployee.similarity?.type === '이름일치_생년월일형식차이' && (
                                            '형식 차이'
                                          )}
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-1 truncate" title={inconsistency.similarData.mostSimilarEmployee.name}>
                                          → {inconsistency.similarData.mostSimilarEmployee.name}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <button 
                                      onClick={() => setSelectedInconsistency(inconsistency)}
                                      className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border"
                                    >
                                      상세보기
                                    </button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                        
                        {/* 기관별 하단 돌아가기 버튼 */}
                        <div className="mt-6 pt-4 border-t border-gray-200 flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const element = document.getElementById('inconsistency-overview');
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }}
                            className="flex items-center gap-2"
                          >
                            ↑ 개요로 돌아가기
                          </Button>
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
      
      {/* 불일치 상세 정보 모달 */}
      {selectedInconsistency && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedInconsistency(null)}>
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">불일치 상세 정보 - {selectedInconsistency.name}</h3>
              <button 
                onClick={() => setSelectedInconsistency(null)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 기본 정보 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">기본 정보</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="font-medium">성명:</span><span>{selectedInconsistency.name}</span></div>
                  <div className="flex justify-between"><span className="font-medium">생년월일:</span><span>{selectedInconsistency.birthDate || '-'}</span></div>
                  <div className="flex justify-between"><span className="font-medium">ID:</span><span className="font-mono">{selectedInconsistency.id || '-'}</span></div>
                </div>
              </div>
              
              {/* 불일치 유형 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">불일치 유형 ({selectedInconsistency.inconsistencyCount || 0}개)</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedInconsistency.inconsistencyTypes?.map((type: string, idx: number) => (
                    <Badge key={idx} variant="destructive" className="text-xs">
                      {type.replace(/_/g, ' ')}
                    </Badge>
                  )) || <span className="text-gray-500 text-sm">정보 없음</span>}
                </div>
              </div>
              
              {/* 상태 비교 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">재직 상태 비교</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-medium text-red-800">모인우리 (종사자관리)</div>
                    <div>상태: <Badge variant={selectedInconsistency.employeeStatus === '퇴직' ? 'destructive' : 'default'} className="text-xs ml-1">{selectedInconsistency.employeeStatus}</Badge></div>
                    <div>퇴사일: {selectedInconsistency.employeeResignDate || '없음'}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">배움터 (소속회원)</div>
                    <div>상태: <Badge variant={selectedInconsistency.participantStatus === '정상' ? 'default' : 'secondary'} className="text-xs ml-1">{selectedInconsistency.participantStatus}</Badge></div>
                    <div>퇴사일: {selectedInconsistency.participantResignDate || '없음'}</div>
                  </div>
                  {selectedInconsistency.resignDateDiff && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      퇴사일 차이: {selectedInconsistency.resignDateDiff}일
                    </div>
                  )}
                </div>
              </div>
              
              {/* 소속/직군 비교 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">소속/직군 비교</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-medium text-red-800">모인우리</div>
                    <div>소속: {selectedInconsistency.employeeInstitution || '정보없음'}</div>
                    <div>직군: {selectedInconsistency.employeeJobType || '정보없음'}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">배움터</div>
                    <div>소속: {selectedInconsistency.participantInstitution || '정보없음'}</div>
                    <div>직군: {selectedInconsistency.participantJobType || '정보없음'}</div>
                  </div>
                </div>
              </div>
              
              {/* 입사일 비교 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">입사일 비교</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-medium text-red-800">모인우리 입사일</div>
                    <div>{selectedInconsistency.employeeHireDate || '정보없음'}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">배움터 입사일</div>
                    <div>{selectedInconsistency.participantHireDate || '정보없음'}</div>
                  </div>
                  {selectedInconsistency.hireDateDiff && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      입사일 차이: {selectedInconsistency.hireDateDiff}일
                      {selectedInconsistency.hireDateDiff > 90 && (
                        <span className="text-red-600 ml-2">(재입사 의심)</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 연락처 비교 */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-800 border-b pb-2">연락처 비교</h4>
                <div className="space-y-2 text-sm">
                  <div className="bg-red-50 p-2 rounded">
                    <div className="font-medium text-red-800">모인우리 연락처</div>
                    <div>{selectedInconsistency.employeePhone || '정보없음'}</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="font-medium text-blue-800">배움터 연락처</div>
                    <div>{selectedInconsistency.participantPhone || '정보없음'}</div>
                  </div>
                </div>
              </div>

              {/* 원본 데이터 섹션 추가 */}
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">원본 데이터 확인</h4>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* 모인우리(종사자) 원본 데이터 */}
                  <div className="bg-red-50 p-4 rounded border">
                    <h5 className="font-medium text-red-800 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                      모인우리 종사자 데이터
                    </h5>
                    {selectedInconsistency.employeeStatus !== '데이터없음' ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">성명:</span>
                          <span className="font-medium">{selectedInconsistency.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">생년월일:</span>
                          <span>{selectedInconsistency.birthDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">소속기관:</span>
                          <span>{selectedInconsistency.employeeInstitution || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">직군:</span>
                          <span>{selectedInconsistency.employeeJobType || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">입사일:</span>
                          <span>{selectedInconsistency.employeeHireDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">퇴사일:</span>
                          <span>{selectedInconsistency.employeeResignDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">재직상태:</span>
                          <Badge variant={selectedInconsistency.employeeStatus === '퇴직' ? 'destructive' : 'default'} className="text-xs">
                            {selectedInconsistency.employeeStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">연락처:</span>
                          <span>{selectedInconsistency.employeePhone || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                        <p className="text-sm">모인우리에 데이터가 없습니다</p>
                        <p className="text-xs text-gray-400 mt-1">배움터에만 존재하는 케이스</p>
                      </div>
                    )}
                  </div>

                  {/* 배움터(참가자) 원본 데이터 */}
                  <div className="bg-blue-50 p-4 rounded border">
                    <h5 className="font-medium text-blue-800 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      배움터 소속회원 데이터
                    </h5>
                    {selectedInconsistency.participantStatus !== '데이터없음' ? (
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">성명:</span>
                          <span className="font-medium">{selectedInconsistency.name}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">생년월일:</span>
                          <span>{selectedInconsistency.birthDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">소속기관:</span>
                          <span>{selectedInconsistency.participantInstitution || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">직군:</span>
                          <span>{selectedInconsistency.participantJobType || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">입사일:</span>
                          <span>{selectedInconsistency.participantHireDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">퇴사일:</span>
                          <span>{selectedInconsistency.participantResignDate || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b pb-1">
                          <span className="text-gray-600">회원상태:</span>
                          <Badge variant={selectedInconsistency.participantStatus === '정상' ? 'default' : 'secondary'} className="text-xs">
                            {selectedInconsistency.participantStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">연락처:</span>
                          <span>{selectedInconsistency.participantPhone || '-'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <AlertTriangle className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                        <p className="text-sm">배움터에 데이터가 없습니다</p>
                        <p className="text-xs text-gray-400 mt-1">모인우리에만 존재하는 케이스</p>
                      </div>
                    )}
                  </div>
                </div>

{/* 유사 데이터 정보 섹션 */}
                {selectedInconsistency.similarData && selectedInconsistency.similarData.hasSimilarData && (
                  <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded">
                    <h6 className="font-medium text-orange-800 mb-3 flex items-center">
                      🔍 유사 데이터 발견 ({selectedInconsistency.similarData.similarCount}건)
                      <Badge variant="outline" className="ml-2 text-xs">
                        데이터 정합성 검토 필요
                      </Badge>
                    </h6>
                    
                    <div className="bg-white p-3 rounded border border-orange-100">
                      <div className="text-sm">
                        <div className="font-medium text-orange-800 mb-2">
                          가장 유사한 종사자 데이터:
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded">
                          <div>
                            <span className="text-gray-600">이름:</span>
                            <span className="ml-2 font-medium">{selectedInconsistency.similarData.mostSimilarEmployee.name}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">생년월일:</span>
                            <span className="ml-2">{selectedInconsistency.similarData.mostSimilarEmployee.birthDate}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">소속:</span>
                            <span className="ml-2">{selectedInconsistency.similarData.mostSimilarEmployee.institution}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">직군:</span>
                            <span className="ml-2">{selectedInconsistency.similarData.mostSimilarEmployee.jobType}</span>
                          </div>
                        </div>
                        
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <span className="font-medium text-yellow-800">차이점:</span>
                          <span className="ml-2 text-yellow-700">
                            {selectedInconsistency.similarData.mostSimilarEmployee.similarity?.reason}
                          </span>
                        </div>
                        
                        <div className="mt-3 text-xs text-gray-600">
                          <strong>추정 원인:</strong>
                          {selectedInconsistency.similarData.mostSimilarEmployee.similarity?.type === '이름일치_생년월일차이' && (
                            <span className="ml-1">입력 실수 또는 서로 다른 데이터 소스에서 발생한 생년월일 차이일 가능성이 높습니다.</span>
                          )}
                          {selectedInconsistency.similarData.mostSimilarEmployee.similarity?.type === '생년월일일치_이름유사' && (
                            <span className="ml-1">동일인이지만 이름 표기 방식이 다를 가능성이 있습니다.</span>
                          )}
                          {selectedInconsistency.similarData.mostSimilarEmployee.similarity?.type === '이름일치_생년월일형식차이' && (
                            <span className="ml-1">동일인이지만 생년월일 형식이 다르게 저장된 것으로 보입니다.</span>
                          )}
                        </div>
                        
                        {selectedInconsistency.similarData.allSimilarEmployees.length > 1 && (
                          <div className="mt-3 text-xs">
                            <details className="cursor-pointer">
                              <summary className="text-gray-600 hover:text-gray-800">
                                다른 유사 데이터 {selectedInconsistency.similarData.allSimilarEmployees.length - 1}건 더 보기
                              </summary>
                              <div className="mt-2 space-y-2">
                                {selectedInconsistency.similarData.allSimilarEmployees.slice(1).map((emp, idx) => (
                                  <div key={idx} className="p-2 bg-gray-50 rounded border text-xs">
                                    <div className="grid grid-cols-3 gap-2">
                                      <span><strong>이름:</strong> {emp.name}</span>
                                      <span><strong>생년월일:</strong> {emp.birthDate}</span>
                                      <span><strong>소속:</strong> {emp.institution}</span>
                                    </div>
                                    <div className="text-yellow-600 mt-1">
                                      {emp.similarity?.reason}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 데이터 비교 요약 */}
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <h6 className="font-medium text-yellow-800 mb-2">📊 데이터 비교 요약</h6>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">입사일 차이:</span>
                      <span className="ml-2 font-medium">
                        {selectedInconsistency.hireDateDiff ? `${selectedInconsistency.hireDateDiff}일` : '비교불가'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">퇴사일 차이:</span>
                      <span className="ml-2 font-medium">
                        {selectedInconsistency.resignDateDiff ? `${selectedInconsistency.resignDateDiff}일` : '비교불가'}
                      </span>
                    </div>
                  </div>
                  
                  {/* 유사 데이터가 있을 때 추가 정보 */}
                  {selectedInconsistency.similarData && selectedInconsistency.similarData.hasSimilarData && (
                    <div className="mt-3 p-2 bg-orange-100 border border-orange-200 rounded text-xs">
                      <div className="font-medium text-orange-800">⚠️ 권장 조치:</div>
                      <div className="text-orange-700 mt-1">
                        위의 유사 데이터를 확인하여 같은 사람인지 검토하고, 필요시 데이터 정정을 진행하시기 바랍니다.
                        {selectedInconsistency.similarData.mostSimilarEmployee.similarity?.birthDateDiff && 
                         selectedInconsistency.similarData.mostSimilarEmployee.similarity.birthDateDiff <= 7 && (
                          <span className="block mt-1 font-medium">
                            📅 생년월일 차이가 {selectedInconsistency.similarData.mostSimilarEmployee.similarity.birthDateDiff}일 이내로 입력 실수일 가능성이 매우 높습니다.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 권장조치사항 섹션 */}
                {(() => {
                  const recommendedActions = getRecommendedActions(selectedInconsistency);
                  return recommendedActions.length > 0 && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
                      <h6 className="font-medium text-blue-800 mb-3 flex items-center">
                        🎯 권장조치사항 ({recommendedActions.length}개)
                      </h6>
                      
                      <div className="space-y-4">
                        {recommendedActions.map((action, idx) => (
                          <div key={idx} className={`p-3 rounded border ${
                            action.priority === 'high' ? 'bg-red-50 border-red-200' : 
                            action.priority === 'medium' ? 'bg-yellow-50 border-yellow-200' : 
                            'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center mb-2">
                              <Badge variant={
                                action.priority === 'high' ? 'destructive' : 
                                action.priority === 'medium' ? 'secondary' : 
                                'outline'
                              } className="text-xs mr-2">
                                {action.priority === 'high' ? '높음' : 
                                 action.priority === 'medium' ? '보통' : '낮음'}
                              </Badge>
                              <span className={`font-medium text-sm ${
                                action.priority === 'high' ? 'text-red-800' : 
                                action.priority === 'medium' ? 'text-yellow-800' : 
                                'text-gray-800'
                              }`}>
                                {action.title}
                              </span>
                            </div>
                            
                            <p className={`text-xs mb-3 ${
                              action.priority === 'high' ? 'text-red-700' : 
                              action.priority === 'medium' ? 'text-yellow-700' : 
                              'text-gray-700'
                            }`}>
                              {action.description}
                            </p>
                            
                            <div className="text-xs">
                              <div className="font-medium mb-2 text-gray-800">처리 단계:</div>
                              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                                {action.steps.map((step, stepIdx) => (
                                  <li key={stepIdx}>{step}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded text-xs">
                        <div className="font-medium text-blue-800 mb-1">📝 처리 완료 후:</div>
                        <div className="text-blue-700">
                          조치 완료 후 데이터를 다시 업로드하고 불일치 분석을 재실행하여 문제가 해결되었는지 확인하시기 바랍니다.
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            
            <div className="mt-6 text-center">
              <button 
                onClick={() => setSelectedInconsistency(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}