# Education Management System

## Overview

This is a modern, user-friendly education management system built with React + TypeScript + Shadcn/ui, upgraded from the original Vanilla JavaScript system. The application provides comprehensive functionality for managing education records, employee data, and conducting integrated analysis to track completion rates and compliance for welfare facility staff.

The system features a clean 4-tab interface (교육관리 → 종사자관리 → 연동분석 → 대시보드) with modern UI components, file upload capabilities, data processing, and Excel export functionality. It's designed to help welfare institutions efficiently manage their staff education requirements and generate detailed compliance reports.

## Recent Changes (August 11, 2025)
- Successfully upgraded entire system from Vanilla JavaScript to React + TypeScript
- Implemented modern UI with Shadcn/ui components and consistent design system
- Added comprehensive file processing (Excel/CSV) and text input capabilities
- Created 4-tab workflow with progress tracking and status indicators
- Integrated Zustand for state management and React Query for server state
- Built complete data matching and analysis functionality with Excel export
- All TypeScript errors resolved and system fully functional

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: Zustand for client-side state with persistence
- **Routing**: Wouter for lightweight client-side routing
- **Data Fetching**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **File Processing**: SheetJS (xlsx) and PapaParse for Excel/CSV handling

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database**: PostgreSQL with Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Development**: Vite for build tooling and HMR

### Data Storage Strategy
- **Primary Database**: PostgreSQL for structured data storage
- **Local Storage**: Browser localStorage for client-side state persistence
- **File Uploads**: Support for Excel (.xlsx, .xls) and CSV file formats
- **Cloud Storage**: Google Cloud Storage integration for file handling

### State Management Pattern
The application uses a modular store pattern with separate stores for:
- **Education Store**: Manages basic and advanced education data
- **Employee Store**: Handles employee and institution data
- **Analysis Store**: Manages analysis configuration and results

Each store uses Zustand with persistence middleware for automatic data preservation.

### File Processing Architecture
Multi-format file processing system supporting:
- Excel files (.xlsx, .xls) using SheetJS
- CSV files using PapaParse
- Drag-and-drop interface with validation
- Real-time data preview and validation

### Component Architecture
Modular component structure organized by feature:
- **Layout Components**: Header, footer, navigation, progress tracking
- **Feature Components**: Education upload/preview, employee management, analysis tools
- **UI Components**: Reusable Shadcn/ui components with custom styling
- **Dashboard Components**: Overview cards, charts, activity feeds

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting
- **Google Cloud Storage**: File storage and backup services
- **Replit**: Development environment and deployment platform

### Core Libraries
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **UI Framework**: Radix UI primitives, Lucide React icons
- **Styling**: Tailwind CSS, class-variance-authority, clsx
- **Data Processing**: SheetJS (xlsx), PapaParse, Zod validation
- **State Management**: Zustand, TanStack Query
- **File Handling**: React Dropzone, Uppy file uploader

### Development Tools
- **Build Tools**: Vite, esbuild, TypeScript
- **Database Tools**: Drizzle Kit for migrations and schema management
- **Development**: tsx for TypeScript execution, PostCSS for CSS processing

### Optional Integrations
- **AWS S3**: Alternative file storage via Uppy AWS S3 plugin
- **Chart Libraries**: Recharts integration prepared for data visualization
- **Authentication**: Framework prepared for user authentication systems