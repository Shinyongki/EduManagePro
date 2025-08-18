import React, { useState } from 'react';
import { Calendar, Upload, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DateUploadFormProps {
  onUpload: (date: string, description: string, file: File) => Promise<void>;
  isUploading: boolean;
  acceptedFileTypes?: string;
  title: string;
  description: string;
}

export function DateUploadForm({ 
  onUpload, 
  isUploading, 
  acceptedFileTypes = ".xlsx,.xls,.csv",
  title,
  description 
}: DateUploadFormProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    // 기본값을 오늘 날짜로 설정
    return new Date().toISOString().split('T')[0];
  });
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // 파일명에서 날짜 추출 시도 (예: "종사자_2025-08-18.xlsx")
      const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        setSelectedDate(dateMatch[1]);
      }
      
      // 설명 자동 생성
      if (!uploadDescription) {
        setUploadDescription(`${selectedDate} ${title} 업로드`);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedDate) return;
    
    try {
      await onUpload(selectedDate, uploadDescription, selectedFile);
      
      // 업로드 성공 후 폼 초기화
      setSelectedFile(null);
      setUploadDescription('');
      const fileInput = document.getElementById('upload-file') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error('업로드 실패:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="upload-date">기준 날짜</Label>
            <Input
              id="upload-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // 미래 날짜 제한
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="upload-file">파일 선택</Label>
            <Input
              id="upload-file"
              type="file"
              onChange={handleFileSelect}
              accept={acceptedFileTypes}
              disabled={isUploading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="upload-description">설명 (선택사항)</Label>
          <Textarea
            id="upload-description"
            placeholder="예: 8월 18일 정기 업데이트, 중간점검 데이터 등"
            value={uploadDescription}
            onChange={(e) => setUploadDescription(e.target.value)}
            rows={2}
          />
        </div>

        {selectedFile && (
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <strong>{selectedDate}</strong> 날짜로 <strong>{selectedFile.name}</strong> 파일이 업로드됩니다.
              {uploadDescription && (
                <><br />설명: {uploadDescription}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          onClick={handleUpload}
          disabled={!selectedFile || !selectedDate || isUploading}
          className="w-full"
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? '업로드 중...' : '업로드'}
        </Button>
      </CardContent>
    </Card>
  );
}