import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import FileUpload from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { useEmployeeStore } from "@/store/employee-store";
import { processEmployeeFile, processInstitutionFile } from "@/lib/file-processor";
import { useToast } from "@/hooks/use-toast";
import { Users, Building } from "lucide-react";

interface EmployeeUploadProps {
  type: "employee" | "institution";
}

export default function EmployeeUpload({ type }: EmployeeUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const { toast } = useToast();
  
  const { 
    employeeData, 
    institutionData, 
    setEmployeeData, 
    setInstitutionData 
  } = useEmployeeStore();

  const isEmployee = type === "employee";
  const data = isEmployee ? employeeData : institutionData;
  const hasData = data.length > 0;

  const config = {
    employee: {
      title: "종사자 현황",
      description: "종사자 현황 데이터를 업로드하세요",
      icon: <Users className="h-12 w-12 text-slate-400" />,
      uploadDescription: "Excel 또는 CSV 형식의 종사자 데이터",
      placeholder: "종사자 데이터를 입력하세요...",
    },
    institution: {
      title: "기관 현황",
      description: "기관별 배정 현황 데이터를 업로드하세요",
      icon: <Building className="h-12 w-12 text-slate-400" />,
      uploadDescription: "기관별 배정 및 채용 현황 데이터",
      placeholder: "기관 현황 데이터를 입력하세요...",
    },
  };

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      if (isEmployee) {
        const parsedData = await processEmployeeFile(file);
        setEmployeeData(parsedData);
      } else {
        const parsedData = await processInstitutionFile(file);
        setInstitutionData(parsedData);
      }

      toast({
        title: "파일 업로드 성공",
        description: `${type === 'employee' ? '종사자' : '기관'} 데이터가 성공적으로 처리되었습니다.`,
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
      const lines = textInput.trim().split('\n');
      const rows = lines.slice(1).map(line => line.split('\t'));
      
      if (isEmployee) {
        const parsedData = rows.map((row, index) => ({
          id: `emp-${index}`,
          name: row[0] || '',
          institution: row[1] || '',
          jobType: (row[2] as '전담사회복지사' | '생활지원사' | '기타') || '기타',
          careerType: (row[3] as '신규' | '경력') || '신규',
          hireDate: row[4] ? new Date(row[4]) : new Date(),
          resignDate: row[5] ? new Date(row[5]) : undefined,
          isActive: !row[5], // Active if no resign date
        }));
        setEmployeeData(parsedData);
      } else {
        const parsedData = rows.map((row, index) => ({
          code: `inst-${index}`,
          name: row[0] || '',
          region: row[1] || '',
          allocatedSocialWorkers: parseInt(row[2]) || 0,
          allocatedLifeSupport: parseInt(row[3]) || 0,
          budgetSocialWorkers: parseInt(row[4]) || 0,
          budgetLifeSupport: parseInt(row[5]) || 0,
          actualSocialWorkers: parseInt(row[6]) || 0,
          actualLifeSupport: parseInt(row[7]) || 0,
        }));
        setInstitutionData(parsedData);
      }

      setTextInput("");
      toast({
        title: "데이터 저장 성공",
        description: `${type === 'employee' ? '종사자' : '기관'} 데이터가 저장되었습니다.`,
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
    if (isEmployee) {
      setEmployeeData([]);
    } else {
      setInstitutionData([]);
    }
    setTextInput("");
    
    toast({
      title: "데이터 초기화",
      description: `${type === 'employee' ? '종사자' : '기관'} 데이터가 초기화되었습니다.`,
    });
  };

  return (
    <Card data-testid={`employee-upload-${type}`}>
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
          title={`${config[type].title} 파일 업로드`}
          description={config[type].uploadDescription}
          icon={config[type].icon}
          isLoading={isLoading}
          isCompleted={hasData}
        />
        
        <div className="mt-6">
          <Label htmlFor={`text-input-${type}`} className="block text-sm font-medium text-slate-700 mb-2">
            수동 입력
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
