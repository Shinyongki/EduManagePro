import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { useEducationData } from "@/hooks/use-education-data";
import { processEducationFile } from "@/lib/file-processor";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Award, Eye, Upload } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EducationData } from "@shared/schema";

interface EducationUploadProps {
  type: "basic" | "advanced";
}

export default function EducationUpload({ type }: EducationUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [previewData, setPreviewData] = useState<EducationData[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
  
  const { 
    basicEducationData, 
    advancedEducationData, 
    setBasicEducationData, 
    setAdvancedEducationData,
    forceReloadData
  } = useEducationData();

  const isBasic = type === "basic";
  const data = isBasic ? basicEducationData : advancedEducationData;
  const hasData = data.length > 0;

  const config = {
    basic: {
      title: "기본교육 데이터",
      description: "기본 교육 수료 데이터를 업로드하세요",
      icon: <BookOpen className="h-12 w-12 text-slate-400" />,
      uploadDescription: "Excel (.xlsx, .xls) 또는 CSV 파일을 지원합니다",
      placeholder: "교육 데이터를 복사하여 붙여넣기하세요...",
    },
    advanced: {
      title: "심화교육 데이터", 
      description: "심화 교육 수료 데이터를 업로드하세요",
      icon: <Award className="h-12 w-12 text-slate-400" />,
      uploadDescription: "Excel (.xlsx, .xls) 또는 CSV 파일을 지원합니다",
      placeholder: "교육 데이터를 복사하여 붙여넣기하세요...",
    },
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const parsedData = await processEducationFile(file);
      setPreviewData(parsedData);
      setShowPreview(true);

      toast({
        title: "파일 파싱 완료",
        description: `${parsedData.length}개의 교육 데이터가 파싱되었습니다. 미리보기를 확인하고 업로드하세요.`,
      });
    } catch (error) {
      toast({
        title: "파일 처리 오류",
        description: "파일을 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (previewData.length === 0) return;

    // 각각 독립적으로 저장 (다른 데이터 건드리지 않음)
    if (isBasic) {
      setBasicEducationData(previewData);
      console.log(`✅ Basic education data uploaded: ${previewData.length} records`);
    } else {
      setAdvancedEducationData(previewData);
      console.log(`✅ Advanced education data uploaded: ${previewData.length} records`);
    }

    setShowPreview(false);
    setPreviewData([]);

    toast({
      title: "업로드 완료",
      description: `${previewData.length}개의 교육 데이터가 업로드되었습니다.`,
    });
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setPreviewData([]);
  };

  const handleTextSave = () => {
    if (!textInput.trim()) {
      toast({
        title: "입력 오류",
        description: "텍스트 데이터를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Process text input (simplified parsing)
      const lines = textInput.trim().split('\n');
      const headers = lines[0].split('\t');
      const rows = lines.slice(1).map(line => line.split('\t'));
      
      // Convert to education data format (simplified)
      const parsedData = rows.map((row, index) => ({
        id: `${type}-${index}`,
        name: row[0] || '',
        institution: row[1] || '',
        course: row[2] || '',
        courseType: isBasic ? '기본' as const : '심화' as const,
        status: (row[3] as '수료' | '미수료' | '진행중') || '미수료',
        completionDate: row[4] ? new Date(row[4]) : undefined,
      }));

      if (isBasic) {
        setBasicEducationData(parsedData);
      } else {
        setAdvancedEducationData(parsedData);
      }

      setTextInput("");
      toast({
        title: "데이터 저장 성공",
        description: `${parsedData.length}개의 교육 데이터가 저장되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "데이터 처리 오류",
        description: "텍스트 데이터를 처리하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    if (isBasic) {
      setBasicEducationData([]);
    } else {
      setAdvancedEducationData([]);
    }
    setTextInput("");
    
    toast({
      title: "데이터 초기화",
      description: "교육 데이터가 초기화되었습니다.",
    });
  };

  if (showPreview) {
    return (
      <Card data-testid={`education-preview-${type}`}>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {config[type].title} - 미리보기
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                파싱된 데이터를 확인하고 업로드하세요 ({previewData.length}개 항목)
              </p>
            </div>
            <Badge className="status-warning">
              <Eye className="w-3 h-3 mr-1.5" />
              미리보기
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="max-h-96 overflow-auto border rounded-md">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  <TableHead>연번</TableHead>
                  <TableHead>수강생명</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>기관코드</TableHead>
                  <TableHead>수행기관명</TableHead>
                  <TableHead>과정명</TableHead>
                  <TableHead>직군</TableHead>
                  <TableHead>교육신청일자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>시도</TableHead>
                  <TableHead>시군구</TableHead>
                  <TableHead>교육시간</TableHead>
                  <TableHead>진도율</TableHead>
                  <TableHead>점수</TableHead>
                  <TableHead>수료여부</TableHead>
                  <TableHead>수료일</TableHead>
                  <TableHead>교육분류</TableHead>
                  <TableHead>복합키</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.slice(0, 10).map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.id}</TableCell>
                    <TableCell>{item.institutionCode || '-'}</TableCell>
                    <TableCell>{item.institution}</TableCell>
                    <TableCell>{item.course}</TableCell>
                    <TableCell>{item.jobType || '-'}</TableCell>
                    <TableCell>{item.applicationDate ? (
                      item.applicationDate instanceof Date 
                        ? item.applicationDate.toLocaleDateString('ko-KR')
                        : new Date(item.applicationDate).toLocaleDateString('ko-KR')
                    ) : '-'}</TableCell>
                    <TableCell>{item.institutionType || '-'}</TableCell>
                    <TableCell>{item.region || '-'}</TableCell>
                    <TableCell>{item.district || '-'}</TableCell>
                    <TableCell>{item.educationHours || 0}</TableCell>
                    <TableCell>{item.progress || 0}%</TableCell>
                    <TableCell>{item.score || 0}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === '수료' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.completionDate ? (
                        item.completionDate instanceof Date 
                          ? item.completionDate.toLocaleDateString('ko-KR')
                          : new Date(item.completionDate).toLocaleDateString('ko-KR')
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.courseType}</Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-32 truncate" title={item.concatenatedKey}>
                      {item.concatenatedKey || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {previewData.length > 10 && (
              <div className="p-4 text-center text-sm text-muted-foreground border-t">
                {previewData.length - 10}개 항목이 더 있습니다.
              </div>
            )}
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button 
              variant="outline" 
              onClick={handleCancelPreview}
            >
              취소
            </Button>
            <Button 
              onClick={handleConfirmUpload}
            >
              <Upload className="h-4 w-4 mr-2" />
              업로드 확정
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`education-upload-${type}`}>
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {config[type].title}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {config[type].description}
            </p>
          </div>
          <Badge className={hasData ? "status-completed" : "status-waiting"}>
            <span className={`w-2 h-2 rounded-full mr-1.5 ${hasData ? 'bg-green-500' : 'bg-slate-400'}`} />
            {hasData ? "완료" : "대기중"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <FileUpload
          onFileUpload={handleFileUpload}
          title="파일을 드래그하거나 클릭하여 업로드"
          description={config[type].uploadDescription}
          icon={config[type].icon}
          isLoading={isLoading}
          isCompleted={hasData}
          data-testid={`file-upload-${type}`}
        />
        
        <div className="mt-6">
          <Label htmlFor={`text-input-${type}`} className="block text-sm font-medium text-slate-700 mb-2">
            또는 직접 입력
          </Label>
          <Textarea
            id={`text-input-${type}`}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={config[type].placeholder}
            className="h-32 resize-none"
            data-testid={`text-input-${type}`}
          />
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            data-testid={`button-reset-${type}`}
          >
            초기화
          </Button>
          <Button 
            onClick={handleTextSave}
            disabled={!textInput.trim()}
            data-testid={`button-save-${type}`}
          >
            데이터 저장
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
