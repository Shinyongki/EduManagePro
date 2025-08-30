import { Button } from "@/components/ui/button";
import { GraduationCap, Home, Users, Building, BookOpen, ChevronDown } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [location] = useLocation();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <GraduationCap className="text-white h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900" data-testid="app-title">
                  교육관리 시스템
                </h1>
                <p className="text-sm text-slate-500">Education Management System v2.0</p>
              </div>
            </div>
            <nav className="flex items-center space-x-4">
              {location !== '/' && (
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <Home className="h-4 w-4 mr-2" />
                    대시보드
                  </Button>
                </Link>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Building className="h-4 w-4 mr-2" />
                    데이터 관리
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/institution-data" className="flex items-center w-full">
                      <Building className="h-4 w-4 mr-2" />
                      기관 현황 데이터
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/employee-data" className="flex items-center w-full">
                      <Users className="h-4 w-4 mr-2" />
                      종사자 데이터
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/basic-education" className="flex items-center w-full">
                      <BookOpen className="h-4 w-4 mr-2" />
                      기초 교육 데이터
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/advanced-education" className="flex items-center w-full">
                      <GraduationCap className="h-4 w-4 mr-2" />
                      심화 교육 데이터
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
