import { GraduationCap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <GraduationCap className="text-white h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">교육관리 시스템</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-slate-500">© 2025 Education Management System. All rights reserved.</p>
            <p className="text-xs text-slate-400 mt-1">TypeScript + React + Shadcn/ui</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
