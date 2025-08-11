import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
  };
  className?: string;
}

export default function DataTable({
  columns,
  data,
  emptyMessage = "데이터가 없습니다",
  emptyIcon,
  pagination,
  className,
}: DataTableProps) {
  const isEmpty = data.length === 0;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: string; className: string }> = {
      '완료': { variant: 'default', className: 'status-completed' },
      '수료': { variant: 'default', className: 'status-completed' },
      '미완료': { variant: 'destructive', className: 'status-incomplete' },
      '미수료': { variant: 'destructive', className: 'status-incomplete' },
      '진행중': { variant: 'secondary', className: 'status-in-progress' },
      '대기': { variant: 'outline', className: 'status-waiting' },
      '우수': { variant: 'default', className: 'status-completed' },
    };

    const config = statusMap[status] || { variant: 'outline', className: 'status-waiting' };
    
    return (
      <Badge 
        variant={config.variant as any} 
        className={cn("status-badge", config.className)}
      >
        {status}
      </Badge>
    );
  };

  const renderCellValue = (column: Column, value: any, row: any) => {
    if (column.render) {
      return column.render(value, row);
    }

    // Auto-detect status fields and render as badges
    if (column.key.includes('status') || column.key.includes('상태') || 
        ['완료', '미완료', '진행중', '수료', '미수료', '대기', '우수'].includes(value)) {
      return getStatusBadge(value);
    }

    return value;
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-slate-200", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              {columns.map((column) => (
                <TableHead key={column.key} className="font-medium text-slate-500 uppercase tracking-wider">
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center">
                    {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, index) => (
                <TableRow key={index} data-testid={`table-row-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className="whitespace-nowrap">
                      {renderCellValue(column, row[column.key], row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && !isEmpty && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
          <div className="text-sm text-slate-500">
            {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-
            {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems} results
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              data-testid="pagination-previous"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              이전
            </Button>
            
            {[...Array(Math.min(pagination.totalPages, 5))].map((_, index) => {
              const pageNumber = Math.max(1, pagination.currentPage - 2) + index;
              if (pageNumber > pagination.totalPages) return null;
              
              return (
                <Button
                  key={pageNumber}
                  variant={pageNumber === pagination.currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => pagination.onPageChange(pageNumber)}
                  data-testid={`pagination-page-${pageNumber}`}
                >
                  {pageNumber}
                </Button>
              );
            })}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              data-testid="pagination-next"
            >
              다음
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
