import fs from 'fs/promises';
import path from 'path';
import type { EducationData, EmployeeData, InstitutionData, AnalysisResult, EducationParticipant, EducationEnrollment, IntegratedAnalysisData } from "@shared/schema";
import type { IStorage, SessionData, InstitutionStats, SystemStats } from './storage';

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

  async clearAllParticipants(): Promise<void> {
    await this.writeJsonFile('education-participants', []);
  }

  // Session management methods
  async createSession(sessionId: string): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    const now = new Date();
    sessions[sessionId] = {
      sessionId,
      basicEducationData: [],
      advancedEducationData: [],
      participantData: [],
      integratedAnalysisData: [],
      createdAt: now,
      lastAccessed: now,
    };
    await this.writeJsonFile('sessions', sessions);
  }

  async getSessionData(sessionId: string): Promise<SessionData | null> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    const session = sessions[sessionId];
    if (session) {
      session.lastAccessed = new Date();
      await this.writeJsonFile('sessions', sessions);
      return session;
    }
    return null;
  }

  async updateSessionData(sessionId: string, data: Partial<Omit<SessionData, 'sessionId' | 'createdAt'>>): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    if (sessions[sessionId]) {
      Object.assign(sessions[sessionId], data);
      sessions[sessionId].lastAccessed = new Date();
      await this.writeJsonFile('sessions', sessions);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    delete sessions[sessionId];
    await this.writeJsonFile('sessions', sessions);
  }

  async cleanupExpiredSessions(maxAge: number): Promise<number> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    const now = new Date();
    let deletedCount = 0;
    
    for (const [sessionId, session] of Object.entries(sessions)) {
      const lastAccessed = new Date(session.lastAccessed);
      const age = now.getTime() - lastAccessed.getTime();
      if (age > maxAge) {
        delete sessions[sessionId];
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      await this.writeJsonFile('sessions', sessions);
    }
    
    return deletedCount;
  }

  // Session education data methods
  async getSessionEducationData(sessionId: string, type: 'basic' | 'advanced'): Promise<EducationData[]> {
    const session = await this.getSessionData(sessionId);
    if (!session) return [];
    return type === 'basic' ? session.basicEducationData : session.advancedEducationData;
  }

  async saveSessionEducationData(sessionId: string, type: 'basic' | 'advanced', data: EducationData[]): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    if (!sessions[sessionId]) {
      await this.createSession(sessionId);
      const updatedSessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
      sessions[sessionId] = updatedSessions[sessionId];
    }
    
    if (type === 'basic') {
      sessions[sessionId].basicEducationData = data;
    } else {
      sessions[sessionId].advancedEducationData = data;
    }
    sessions[sessionId].lastAccessed = new Date();
    await this.writeJsonFile('sessions', sessions);
  }

  // Session participant methods
  async getSessionParticipants(sessionId: string): Promise<EducationParticipant[]> {
    const session = await this.getSessionData(sessionId);
    if (!session) return [];
    return session.participantData;
  }

  async saveSessionParticipants(sessionId: string, data: EducationParticipant[]): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    if (!sessions[sessionId]) {
      await this.createSession(sessionId);
      const updatedSessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
      sessions[sessionId] = updatedSessions[sessionId];
    }
    
    sessions[sessionId].participantData = data;
    sessions[sessionId].lastAccessed = new Date();
    await this.writeJsonFile('sessions', sessions);
  }

  // Session integrated analysis methods
  async getSessionIntegratedAnalysis(sessionId: string): Promise<IntegratedAnalysisData[]> {
    const session = await this.getSessionData(sessionId);
    if (!session) return [];
    return session.integratedAnalysisData;
  }

  async saveSessionIntegratedAnalysis(sessionId: string, data: IntegratedAnalysisData[]): Promise<void> {
    const sessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
    if (!sessions[sessionId]) {
      await this.createSession(sessionId);
      const updatedSessions = await this.readJsonFile<Record<string, SessionData>>('sessions', {});
      sessions[sessionId] = updatedSessions[sessionId];
    }
    
    sessions[sessionId].integratedAnalysisData = data;
    sessions[sessionId].lastAccessed = new Date();
    await this.writeJsonFile('sessions', sessions);
  }

  // Permanent statistics methods
  async saveInstitutionStats(stats: InstitutionStats): Promise<void> {
    const allStats = await this.readJsonFile<InstitutionStats[]>('institution-stats', []);
    const existingIndex = allStats.findIndex(s => s.institutionCode === stats.institutionCode);
    if (existingIndex >= 0) {
      allStats[existingIndex] = stats;
    } else {
      allStats.push(stats);
    }
    await this.writeJsonFile('institution-stats', allStats);
  }

  async getInstitutionStats(institutionCode?: string): Promise<InstitutionStats[]> {
    const allStats = await this.readJsonFile<InstitutionStats[]>('institution-stats', []);
    if (institutionCode) {
      return allStats.filter(s => s.institutionCode === institutionCode);
    }
    return allStats;
  }

  async saveSystemStats(stats: SystemStats): Promise<void> {
    const allStats = await this.readJsonFile<SystemStats[]>('system-stats', []);
    allStats.push(stats);
    
    // Keep only the last 100 system stats records
    if (allStats.length > 100) {
      const recentStats = allStats.slice(-100);
      await this.writeJsonFile('system-stats', recentStats);
    } else {
      await this.writeJsonFile('system-stats', allStats);
    }
  }

  async getSystemStats(limit?: number): Promise<SystemStats[]> {
    const allStats = await this.readJsonFile<SystemStats[]>('system-stats', []);
    const sorted = allStats.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
    return limit ? sorted.slice(0, limit) : sorted;
  }
}