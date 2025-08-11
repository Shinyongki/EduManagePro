import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalysisStore } from "@/store/analysis-store";
import { useToast } from "@/hooks/use-toast";
import { Play, RotateCcw } from "lucide-react";
import type { AnalysisConfig } from "@shared/schema";

export default function AnalysisControls() {
  const { analysisConfig, setAnalysisConfig, runAnalysis, isAnalyzing } = useAnalysisStore();
  const { toast } = useToast();
  
  const [config, setConfig] = useState<AnalysisConfig>(
    analysisConfig || {
      referenceDate: new Date(),
      analysisScope: "전체 기관",
      matchingCriteria: "ID 기반",
    }
  );

  const handleConfigChange = (field: keyof AnalysisConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleRunAnalysis = async () => {
    try {
      setAnalysisConfig(config);
      await runAnalysis();
      
      toast({
        title: "분석 완료",
        description: "교육 데이터와 종사자 데이터 연동 분석이 완료되었습니다.",
      });
    } catch (error) {
      toast({
        title: "분석 오류",
        description: "분석 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleReset = () => {
    const defaultConfig: AnalysisConfig = {
      referenceDate: new Date(),
      analysisScope: "전체 기관",
      matchingCriteria: "ID 기반",
    };
    setConfig(defaultConfig);
    setAnalysisConfig(defaultConfig);
    
    toast({
      title: "설정 초기화",
      description: "분석 설정이 초기화되었습니다.",
    });
  };

  return (
    <Card data-testid="analysis-controls">
      <CardHeader className="border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">연동 분석 설정</h3>
        <p className="text-sm text-slate-500 mt-1">교육 데이터와 종사자 데이터를 연동하여 분석합니다</p>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="reference-date" className="block text-sm font-medium text-slate-700 mb-2">
              기준 날짜
            </Label>
            <Input
              id="reference-date"
              type="date"
              value={config.referenceDate.toISOString().split('T')[0]}
              onChange={(e) => handleConfigChange('referenceDate', new Date(e.target.value))}
              data-testid="input-reference-date"
            />
          </div>
          
          <div>
            <Label htmlFor="analysis-scope" className="block text-sm font-medium text-slate-700 mb-2">
              분석 범위
            </Label>
            <Select
              value={config.analysisScope}
              onValueChange={(value) => handleConfigChange('analysisScope', value)}
            >
              <SelectTrigger data-testid="select-analysis-scope">
                <SelectValue placeholder="분석 범위 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="전체 기관">전체 기관</SelectItem>
                <SelectItem value="특정 기관">특정 기관</SelectItem>
                <SelectItem value="지역별">지역별</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="matching-criteria" className="block text-sm font-medium text-slate-700 mb-2">
              매칭 기준
            </Label>
            <Select
              value={config.matchingCriteria}
              onValueChange={(value) => handleConfigChange('matchingCriteria', value)}
            >
              <SelectTrigger data-testid="select-matching-criteria">
                <SelectValue placeholder="매칭 기준 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ID 기반">ID 기반</SelectItem>
                <SelectItem value="이름 기반">이름 기반</SelectItem>
                <SelectItem value="기관+이름">기관+이름</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isAnalyzing}
            data-testid="button-reset-analysis"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            설정 초기화
          </Button>
          <Button 
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-6"
            data-testid="button-run-analysis"
          >
            {isAnalyzing ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                분석 중...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                분석 실행
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
