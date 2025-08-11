import { ArrowRight } from "lucide-react";

interface ProgressBarProps {
  currentStep: number;
  percentage: number;
}

export default function ProgressBar({ currentStep, percentage }: ProgressBarProps) {
  const steps = [
    { number: 1, title: "교육관리", subtitle: "기본/심화 교육 데이터" },
    { number: 2, title: "종사자관리", subtitle: "종사자/기관 현황" },
    { number: 3, title: "연동분석", subtitle: "통합 분석 결과" },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex items-center" data-testid={`progress-step-${step.number}`}>
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step.number <= currentStep
                        ? "bg-primary text-white"
                        : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="ml-3">
                    <p 
                      className={`text-sm font-medium transition-colors ${
                        step.number <= currentStep
                          ? "text-primary"
                          : "text-slate-600"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-slate-500">{step.subtitle}</p>
                  </div>
                </div>
                
                {index < steps.length - 1 && (
                  <ArrowRight className="text-slate-400 h-4 w-4 mx-4" />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900" data-testid="progress-percentage">
              {percentage}%
            </p>
            <p className="text-xs text-slate-500">완료</p>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500" 
              style={{ width: `${percentage}%` }}
              data-testid="progress-bar-fill"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
