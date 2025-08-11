export interface CourseCategory {
  기본: string[];
  심화: string[];
  법정: string[];
  특별: string[];
}

export interface EducationUploadConfig {
  type: 'basic' | 'advanced';
  title: string;
  description: string;
  icon: React.ReactNode;
  uploadDescription: string;
  placeholder: string;
}

export interface EducationPreviewStats {
  basicCount: number;
  advancedCount: number;
  totalCompletionRate: number;
  courseBreakdown: Array<{
    course: string;
    type: string;
    completed: number;
    total: number;
    completionRate: number;
    status: string;
  }>;
}
