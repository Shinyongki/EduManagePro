import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Filter, Download, Plus, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ParticipantData {
  no: number;
  institution: string;
  institutionCode: string;
  name: string;
  gender?: string;
  email?: string;
  phone?: string;
  jobType?: string;
  status?: string;
  basicTraining?: string;
  advancedEducation?: string;
  courseCount: number;
}

interface MatchingResult {
  participantId: string;
  name: string;
  institution: string;
  basicEducation: {
    status: '수료' | '미수료' | '진행중' | '미등록';
    courses: any[];
  };
  advancedEducation: {
    status: '수료' | '미수료' | '진행중' | '미등록';
    courses: any[];
  };
  overallStatus: '우수' | '미완료' | '진행중';
  lastCompletionDate?: string;
}

export const ParticipantList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('전체');
  const [matchingResults, setMatchingResults] = useState<MatchingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 교육 매칭 데이터 로드
  useEffect(() => {
    const fetchMatchingData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/education-matching');
        if (response.ok) {
          const data = await response.json();
          setMatchingResults(data);
        }
      } catch (error) {
        console.error('Failed to fetch matching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMatchingData();
  }, []);

  const filteredResults = matchingResults.filter(result => {
    const matchesSearch = 
      result.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.institution.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === '전체' || result.overallStatus === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case '진행중':
        return 'secondary';
      case '미완료':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getEducationBadgeVariant = (education?: string) => {
    switch (education) {
      case '수료':
        return 'default';
      case '미수료':
        return 'destructive';
      case '진행중':
        return 'secondary';
      case '미등록':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            교육 수강자 관리
          </CardTitle>
          <CardDescription>
            등록된 교육 수강자를 조회하고 관리합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 검색 및 필터 */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 소속, 기관코드로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  {filterStatus}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStatus('전체')}>
                  전체
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('진행중')}>
                  진행중
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('미완료')}>
                  미완료
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              수강자 추가
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              내보내기
            </Button>
          </div>

          {/* 통계 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-muted p-4 rounded-md">
              <div className="text-2xl font-bold">{matchingResults.length}</div>
              <div className="text-sm text-muted-foreground">전체 수강자</div>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <div className="text-2xl font-bold">
                {matchingResults.filter(r => r.overallStatus === '진행중').length}
              </div>
              <div className="text-sm text-muted-foreground">진행중 수강자</div>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <div className="text-2xl font-bold">
                {matchingResults.filter(r => r.basicEducation.status === '수료').length}
              </div>
              <div className="text-sm text-muted-foreground">기초 수료자</div>
            </div>
            <div className="bg-muted p-4 rounded-md">
              <div className="text-2xl font-bold">
                {matchingResults.filter(r => r.advancedEducation.status === '수료').length}
              </div>
              <div className="text-sm text-muted-foreground">심화 수료자</div>
            </div>
          </div>

          {/* 테이블 */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>소속</TableHead>
                  <TableHead>기초교육</TableHead>
                  <TableHead>심화교육</TableHead>
                  <TableHead>전체상태</TableHead>
                  <TableHead>수강과정</TableHead>
                  <TableHead>최근수료일</TableHead>
                  <TableHead>작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      교육 매칭 데이터를 로딩 중입니다...
                    </TableCell>
                  </TableRow>
                ) : filteredResults.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      검색 결과가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredResults.map((result, index) => (
                    <TableRow key={result.participantId}>
                      <TableCell>
                        <div className="font-medium">{result.name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{result.institution}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEducationBadgeVariant(result.basicEducation.status)}>
                          {result.basicEducation.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.basicEducation.courses.length}개 과정
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEducationBadgeVariant(result.advancedEducation.status)}>
                          {result.advancedEducation.status}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {result.advancedEducation.courses.length}개 과정
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(result.overallStatus)}>
                          {result.overallStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          총 {result.basicEducation.courses.length + result.advancedEducation.courses.length}개
                        </div>
                        <div className="text-xs text-muted-foreground">
                          기초 {result.basicEducation.courses.length} + 심화 {result.advancedEducation.courses.length}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {result.lastCompletionDate 
                            ? new Date(result.lastCompletionDate).toLocaleDateString('ko-KR')
                            : '없음'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          상세
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};