import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export const ParticipantUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const { toast } = useToast();

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

  const handleUpload = async () => {
    if (!uploadedFile) {
      toast({
        title: "파일을 선택해주세요",
        description: "업로드할 교육 수강자 파일을 선택해주세요.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);

      // 파일 파싱 및 업로드
      const uploadResponse = await fetch('/api/participants/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('파일 업로드에 실패했습니다.');
      }

      const result = await uploadResponse.json();
      
      setUploadProgress(100);
      setIsUploading(false);
      
      toast({
        title: "업로드 완료",
        description: `${result.count}명의 교육 수강자 데이터가 성공적으로 업로드되었습니다.`,
      });
      
      // 파일 선택 초기화
      setUploadedFile(null);
      const fileInput = document.getElementById('participant-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "파일 업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            교육 수강자 데이터 업로드
          </CardTitle>
          <CardDescription>
            Excel 파일을 통해 교육 수강자 정보를 일괄 업로드합니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              업로드 파일은 다음 헤더를 포함해야 합니다: 번호, 소속, 기관코드, 유형, 회원명, 성별, 생년월일, ID, 휴대전화, 이메일, 수강건수, 접속일, 가입일, 직군, 입사일, 퇴사일, 특화, 중간관리자, 최고관리자, 경력, 시법사업참여여부, 이메일수신동의여부, SMS수신동의여부, 상태, 최종수료, 기초직무, 심화교육
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
              <FileText className="h-4 w-4" />
              <span className="text-sm">{uploadedFile.name}</span>
            </div>
          )}

          <Button 
            onClick={handleUpload} 
            disabled={!uploadedFile || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? `업로드 중... ${uploadProgress}%` : '업로드'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};