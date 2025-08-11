import type { EducationData, EmployeeData, InstitutionData, AnalysisResult } from "@shared/schema";

// Simple in-memory storage implementation for education management system
export interface IStorage {
  // Education data operations
  getEducationData(): Promise<EducationData[]>;
  saveEducationData(data: EducationData[]): Promise<void>;
  
  // Employee data operations
  getEmployeeData(): Promise<EmployeeData[]>;
  saveEmployeeData(data: EmployeeData[]): Promise<void>;
  
  // Institution data operations
  getInstitutionData(): Promise<InstitutionData[]>;
  saveInstitutionData(data: InstitutionData[]): Promise<void>;
  
  // Analysis results operations
  getAnalysisResults(): Promise<AnalysisResult[]>;
  saveAnalysisResults(results: AnalysisResult[]): Promise<void>;
}

export class MemStorage implements IStorage {
  private educationData: EducationData[] = [];
  private employeeData: EmployeeData[] = [];
  private institutionData: InstitutionData[] = [];
  private analysisResults: AnalysisResult[] = [];

  async getEducationData(): Promise<EducationData[]> {
    return this.educationData;
  }

  async saveEducationData(data: EducationData[]): Promise<void> {
    this.educationData = data;
  }

  async getEmployeeData(): Promise<EmployeeData[]> {
    return this.employeeData;
  }

  async saveEmployeeData(data: EmployeeData[]): Promise<void> {
    this.employeeData = data;
  }

  async getInstitutionData(): Promise<InstitutionData[]> {
    return this.institutionData;
  }

  async saveInstitutionData(data: InstitutionData[]): Promise<void> {
    this.institutionData = data;
  }

  async getAnalysisResults(): Promise<AnalysisResult[]> {
    return this.analysisResults;
  }

  async saveAnalysisResults(results: AnalysisResult[]): Promise<void> {
    this.analysisResults = results;
  }
}

export const storage = new MemStorage();
