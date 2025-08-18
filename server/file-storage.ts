import fs from 'fs/promises';
import path from 'path';
import type { EducationData, EmployeeData, InstitutionData, AnalysisResult, EducationParticipant, EducationEnrollment, IntegratedAnalysisData } from "@shared/schema";
import type { IStorage } from './storage';

// Electron app detection
function getElectronApp() {
  try {
    // Use require for CommonJS compatibility in packaged app
    const { app } = eval('require')('electron');
    return app;
  } catch (error) {
    // Electron is not available in this environment
    return null;
  }
}

export class FileStorage implements IStorage {
  private dataDir: string;

  constructor() {
    // Get user data directory
    const electronApp = getElectronApp();
    this.dataDir = electronApp ? electronApp.getPath('userData') : path.join(process.cwd(), 'data');
    this.ensureDataDir();
  }

  private async ensureDataDir(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  private getFilePath(filename: string): string {
    return path.join(this.dataDir, `${filename}.json`);
  }

  private async readJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
    try {
      const filePath = this.getFilePath(filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return defaultValue;
      }
      console.error(`Failed to read ${filename}:`, error);
      return defaultValue;
    }
  }

  private async writeJsonFile<T>(filename: string, data: T): Promise<void> {
    try {
      await this.ensureDataDir();
      const filePath = this.getFilePath(filename);
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error(`Failed to write ${filename}:`, error);
      throw error;
    }
  }

  async getEducationData(): Promise<EducationData[]> {
    return this.readJsonFile<EducationData[]>('education-data', []);
  }

  async saveEducationData(data: EducationData[]): Promise<void> {
    await this.writeJsonFile('education-data', data);
  }

  async getEmployeeData(): Promise<EmployeeData[]> {
    return this.readJsonFile<EmployeeData[]>('employee-data', []);
  }

  async saveEmployeeData(data: EmployeeData[]): Promise<void> {
    await this.writeJsonFile('employee-data', data);
  }

  async getInstitutionData(): Promise<InstitutionData[]> {
    return this.readJsonFile<InstitutionData[]>('institution-data', []);
  }

  async saveInstitutionData(data: InstitutionData[]): Promise<void> {
    await this.writeJsonFile('institution-data', data);
  }

  async getAnalysisResults(): Promise<AnalysisResult[]> {
    return this.readJsonFile<AnalysisResult[]>('analysis-results', []);
  }

  async saveAnalysisResults(results: AnalysisResult[]): Promise<void> {
    await this.writeJsonFile('analysis-results', results);
  }

  async getEducationParticipants(): Promise<EducationParticipant[]> {
    return this.readJsonFile<EducationParticipant[]>('education-participants', []);
  }

  async saveEducationParticipant(participant: EducationParticipant): Promise<void> {
    const participants = await this.getEducationParticipants();
    const existingIndex = participants.findIndex(p => p.id === participant.id);
    
    if (existingIndex >= 0) {
      participants[existingIndex] = participant;
    } else {
      participants.push(participant);
    }
    
    await this.writeJsonFile('education-participants', participants);
  }

  async updateEducationParticipant(id: string, participant: Partial<EducationParticipant>): Promise<void> {
    const participants = await this.getEducationParticipants();
    const index = participants.findIndex(p => p.id === id);
    
    if (index >= 0) {
      participants[index] = { 
        ...participants[index], 
        ...participant,
        updatedAt: new Date()
      };
      await this.writeJsonFile('education-participants', participants);
    }
  }

  async deleteEducationParticipant(id: string): Promise<void> {
    const participants = await this.getEducationParticipants();
    const filtered = participants.filter(p => p.id !== id);
    await this.writeJsonFile('education-participants', filtered);
  }

  async getEducationEnrollments(): Promise<EducationEnrollment[]> {
    return this.readJsonFile<EducationEnrollment[]>('education-enrollments', []);
  }

  async saveEducationEnrollment(enrollment: EducationEnrollment): Promise<void> {
    const enrollments = await this.getEducationEnrollments();
    const existingIndex = enrollments.findIndex(e => e.id === enrollment.id);
    
    if (existingIndex >= 0) {
      enrollments[existingIndex] = enrollment;
    } else {
      enrollments.push(enrollment);
    }
    
    await this.writeJsonFile('education-enrollments', enrollments);
  }

  async updateEducationEnrollment(id: string, enrollment: Partial<EducationEnrollment>): Promise<void> {
    const enrollments = await this.getEducationEnrollments();
    const index = enrollments.findIndex(e => e.id === id);
    
    if (index >= 0) {
      enrollments[index] = { 
        ...enrollments[index], 
        ...enrollment,
        updatedAt: new Date()
      };
      await this.writeJsonFile('education-enrollments', enrollments);
    }
  }

  async deleteEducationEnrollment(id: string): Promise<void> {
    const enrollments = await this.getEducationEnrollments();
    const filtered = enrollments.filter(e => e.id !== id);
    await this.writeJsonFile('education-enrollments', filtered);
  }

  async getEnrollmentsByParticipant(participantId: string): Promise<EducationEnrollment[]> {
    const enrollments = await this.getEducationEnrollments();
    return enrollments.filter(e => e.participantId === participantId);
  }

  async getIntegratedAnalysisData(): Promise<IntegratedAnalysisData[]> {
    return this.readJsonFile<IntegratedAnalysisData[]>('integrated-analysis-data', []);
  }

  async saveIntegratedAnalysisData(data: IntegratedAnalysisData[]): Promise<void> {
    await this.writeJsonFile('integrated-analysis-data', data);
  }
}