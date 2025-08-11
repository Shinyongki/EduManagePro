import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { useEducationStore } from "@/store/education-store";
import { processEducationFile } from "@/lib/file-processor";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Award } from "lucide-react";

interface EducationUploadProps {
  type: "basic" | "advanced";
}

export default function EducationUpload({ type }: EducationUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const { toast } = useToast();
  
  const { 
    basicEducationData, 
    advancedEducationData, 
    setBasicEducationData, 
    setAdvancedEducationData 
  } = useEducationStore();

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
      
      if (isBasic) {
        setBasicEducationData(parsedData);
      } else {
        setAdvancedEducationData(parsedData);
      }

      toast({
        title: "파일 업로드 성공",
        description: `${parsedData.length}개의 교육 데이터가 처리되었습니다.`,
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
