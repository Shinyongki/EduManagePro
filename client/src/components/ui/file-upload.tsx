import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { CloudUpload, FileText, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
  title: string;
  description: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export default function FileUpload({
  onFileUpload,
  accept = {
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
    'text/csv': ['.csv'],
  },
  maxSize = 10 * 1024 * 1024, // 10MB
  title,
  description,
  icon,
  isLoading = false,
  isCompleted = false,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const getIcon = () => {
    if (isLoading) return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
    if (isCompleted) return <CheckCircle className="h-12 w-12 text-green-500" />;
    if (icon) return icon;
    return <CloudUpload className="h-12 w-12 text-slate-400" />;
  };

  const getTitle = () => {
    if (isLoading) return "파일 처리중...";
    if (isCompleted) return "업로드 완료";
    return title;
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        "upload-area",
        isDragActive && "border-primary bg-blue-50",
        isCompleted && "border-green-300 bg-green-50",
        className
      )}
      data-testid="file-upload-area"
    >
      <input {...getInputProps()} data-testid="file-upload-input" />
      
      <div className="flex flex-col items-center">
        {getIcon()}
        <h4 className="text-lg font-medium text-slate-900 mb-2 mt-4">
          {getTitle()}
        </h4>
        {!isLoading && !isCompleted && (
          <>
            <p className="text-sm text-slate-500 mb-4">{description}</p>
            <Button type="button" data-testid="file-upload-button">
              <FileText className="mr-2 h-4 w-4" />
              파일 선택
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
