import type { EducationData, EmployeeData, InstitutionData, AnalysisResult, EducationParticipant, EducationEnrollment, IntegratedAnalysisData } from "@shared/schema";

// Statistics data types (anonymized, no personal info)
export interface InstitutionStats {
  id: string;
  institutionCode: string;
  institutionName: string;
  region: string;
  subRegion: string;
  totalEmployees: number;
  basicEducationRate: number;
  advancedEducationRate: number;
  overallCompletionRate: number;
  lastUpdated: Date;
}

export interface SystemStats {
  id: string;
  totalInstitutions: number;
  totalParticipants: number;
  overallBasicRate: number;
  overallAdvancedRate: number;
  overallCompletionRate: number;
  createdAt: Date;
}

// Session data interface
export interface SessionData {
  sessionId: string;
  basicEducationData: EducationData[];
  advancedEducationData: EducationData[];
  participantData: EducationParticipant[];
  integratedAnalysisData: IntegratedAnalysisData[];
  createdAt: Date;
  lastAccessed: Date;
}

// Simple in-memory storage implementation for education management system
export interface IStorage {
  // Session-based temporary data operations
  createSession(sessionId: string): Promise<void>;
  getSessionData(sessionId: string): Promise<SessionData | null>;
  updateSessionData(sessionId: string, data: Partial<Omit<SessionData, 'sessionId' | 'createdAt'>>): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  cleanupExpiredSessions(maxAge: number): Promise<number>;
  
  // Session education data operations
  getSessionEducationData(sessionId: string, type: 'basic' | 'advanced'): Promise<EducationData[]>;
  saveSessionEducationData(sessionId: string, type: 'basic' | 'advanced', data: EducationData[]): Promise<void>;
  
  // Session participant operations
  getSessionParticipants(sessionId: string): Promise<EducationParticipant[]>;
  saveSessionParticipants(sessionId: string, data: EducationParticipant[]): Promise<void>;
  
  // Session integrated analysis operations
  getSessionIntegratedAnalysis(sessionId: string): Promise<IntegratedAnalysisData[]>;
  saveSessionIntegratedAnalysis(sessionId: string, data: IntegratedAnalysisData[]): Promise<void>;
  
  // Permanent statistics operations (anonymized data only)
  saveInstitutionStats(stats: InstitutionStats): Promise<void>;
  getInstitutionStats(institutionCode?: string): Promise<InstitutionStats[]>;
  saveSystemStats(stats: SystemStats): Promise<void>;
  getSystemStats(limit?: number): Promise<SystemStats[]>;
  
  // Legacy operations (for backward compatibility)
  getEducationData(): Promise<EducationData[]>;
  saveEducationData(data: EducationData[]): Promise<void>;
  getEmployeeData(): Promise<EmployeeData[]>;
  saveEmployeeData(data: EmployeeData[]): Promise<void>;
  getInstitutionData(): Promise<InstitutionData[]>;
  saveInstitutionData(data: InstitutionData[]): Promise<void>;
  getAnalysisResults(): Promise<AnalysisResult[]>;
  saveAnalysisResults(results: AnalysisResult[]): Promise<void>;
  getEducationParticipants(): Promise<EducationParticipant[]>;
  saveEducationParticipant(participant: EducationParticipant): Promise<void>;
  updateEducationParticipant(id: string, participant: Partial<EducationParticipant>): Promise<void>;
  deleteEducationParticipant(id: string): Promise<void>;
  clearAllParticipants(): Promise<void>;
  getEducationEnrollments(): Promise<EducationEnrollment[]>;
  saveEducationEnrollment(enrollment: EducationEnrollment): Promise<void>;
  updateEducationEnrollment(id: string, enrollment: Partial<EducationEnrollment>): Promise<void>;
  deleteEducationEnrollment(id: string): Promise<void>;
  getEnrollmentsByParticipant(participantId: string): Promise<EducationEnrollment[]>;
  getIntegratedAnalysisData(): Promise<IntegratedAnalysisData[]>;
  saveIntegratedAnalysisData(data: IntegratedAnalysisData[]): Promise<void>;
}

export class MemStorage implements IStorage {
  // Session storage (temporary data)
  private sessions: Map<string, SessionData> = new Map();
  
  // Permanent statistics storage (anonymized data only)
  private institutionStats: InstitutionStats[] = [];
  private systemStats: SystemStats[] = [];
  
  // Legacy storage (for backward compatibility)
  private educationData: EducationData[] = [];
  private employeeData: EmployeeData[] = [];
  private institutionData: InstitutionData[] = [];
  private analysisResults: AnalysisResult[] = [];
  private educationParticipants: EducationParticipant[] = [];
  private educationEnrollments: EducationEnrollment[] = [];
  private integratedAnalysisData: IntegratedAnalysisData[] = [];

  // Session management methods
  async createSession(sessionId: string): Promise<void> {
    const now = new Date();
    this.sessions.set(sessionId, {
      sessionId,
      basicEducationData: [],
      advancedEducationData: [],
      participantData: [],
      integratedAnalysisData: [],
      createdAt: now,
      lastAccessed: now,
    });
  }

  async getSessionData(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastAccessed = new Date();
      return session;
    }
    return null;
  }

  async updateSessionData(sessionId: string, data: Partial<Omit<SessionData, 'sessionId' | 'createdAt'>>): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      Object.assign(session, data);
      session.lastAccessed = new Date();
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanupExpiredSessions(maxAge: number): Promise<number> {
    const now = new Date();
    let deletedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now.getTime() - session.lastAccessed.getTime();
      if (age > maxAge) {
        this.sessions.delete(sessionId);
        deletedCount++;
      }
    }
    
    return deletedCount;
  }

  // Session education data methods
  async getSessionEducationData(sessionId: string, type: 'basic' | 'advanced'): Promise<EducationData[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    session.lastAccessed = new Date();
    return type === 'basic' ? session.basicEducationData : session.advancedEducationData;
  }

  async saveSessionEducationData(sessionId: string, type: 'basic' | 'advanced', data: EducationData[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.createSession(sessionId);
    }
    
    const updatedSession = this.sessions.get(sessionId)!;
    if (type === 'basic') {
      updatedSession.basicEducationData = data;
    } else {
      updatedSession.advancedEducationData = data;
    }
    updatedSession.lastAccessed = new Date();
  }

  // Session participant methods
  async getSessionParticipants(sessionId: string): Promise<EducationParticipant[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    session.lastAccessed = new Date();
    return session.participantData;
  }

  async saveSessionParticipants(sessionId: string, data: EducationParticipant[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.createSession(sessionId);
    }
    
    const updatedSession = this.sessions.get(sessionId)!;
    updatedSession.participantData = data;
    updatedSession.lastAccessed = new Date();
  }

  // Session integrated analysis methods
  async getSessionIntegratedAnalysis(sessionId: string): Promise<IntegratedAnalysisData[]> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    
    session.lastAccessed = new Date();
    return session.integratedAnalysisData;
  }

  async saveSessionIntegratedAnalysis(sessionId: string, data: IntegratedAnalysisData[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      await this.createSession(sessionId);
    }
    
    const updatedSession = this.sessions.get(sessionId)!;
    updatedSession.integratedAnalysisData = data;
    updatedSession.lastAccessed = new Date();
  }

  // Permanent statistics methods (anonymized data only)
  async saveInstitutionStats(stats: InstitutionStats): Promise<void> {
    const existingIndex = this.institutionStats.findIndex(s => s.institutionCode === stats.institutionCode);
    if (existingIndex >= 0) {
      this.institutionStats[existingIndex] = stats;
    } else {
      this.institutionStats.push(stats);
    }
  }

  async getInstitutionStats(institutionCode?: string): Promise<InstitutionStats[]> {
    if (institutionCode) {
      return this.institutionStats.filter(s => s.institutionCode === institutionCode);
    }
    return this.institutionStats;
  }

  async saveSystemStats(stats: SystemStats): Promise<void> {
    this.systemStats.push(stats);
    
    // Keep only the last 100 system stats records
    if (this.systemStats.length > 100) {
      this.systemStats = this.systemStats.slice(-100);
    }
  }

  async getSystemStats(limit?: number): Promise<SystemStats[]> {
    const sorted = this.systemStats.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

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

  async getEducationParticipants(): Promise<EducationParticipant[]> {
    return this.educationParticipants;
  }

  async saveEducationParticipant(participant: EducationParticipant): Promise<void> {
    const existingIndex = this.educationParticipants.findIndex(p => p.id === participant.id);
    if (existingIndex >= 0) {
      this.educationParticipants[existingIndex] = participant;
    } else {
      this.educationParticipants.push(participant);
    }
  }

  async updateEducationParticipant(id: string, participant: Partial<EducationParticipant>): Promise<void> {
    const index = this.educationParticipants.findIndex(p => p.id === id);
    if (index >= 0) {
      this.educationParticipants[index] = { 
        ...this.educationParticipants[index], 
        ...participant,
        updatedAt: new Date()
      };
    }
  }

  async deleteEducationParticipant(id: string): Promise<void> {
    this.educationParticipants = this.educationParticipants.filter(p => p.id !== id);
  }

  async clearAllParticipants(): Promise<void> {
    this.educationParticipants = [];
  }

  async getEducationEnrollments(): Promise<EducationEnrollment[]> {
    return this.educationEnrollments;
  }

  async saveEducationEnrollment(enrollment: EducationEnrollment): Promise<void> {
    const existingIndex = this.educationEnrollments.findIndex(e => e.id === enrollment.id);
    if (existingIndex >= 0) {
      this.educationEnrollments[existingIndex] = enrollment;
    } else {
      this.educationEnrollments.push(enrollment);
    }
  }

  async updateEducationEnrollment(id: string, enrollment: Partial<EducationEnrollment>): Promise<void> {
    const index = this.educationEnrollments.findIndex(e => e.id === id);
    if (index >= 0) {
      this.educationEnrollments[index] = { 
        ...this.educationEnrollments[index], 
        ...enrollment,
        updatedAt: new Date()
      };
    }
  }

  async deleteEducationEnrollment(id: string): Promise<void> {
    this.educationEnrollments = this.educationEnrollments.filter(e => e.id !== id);
  }

  async getEnrollmentsByParticipant(participantId: string): Promise<EducationEnrollment[]> {
    return this.educationEnrollments.filter(e => e.participantId === participantId);
  }

  async getIntegratedAnalysisData(): Promise<IntegratedAnalysisData[]> {
    return this.integratedAnalysisData;
  }

  async saveIntegratedAnalysisData(data: IntegratedAnalysisData[]): Promise<void> {
    this.integratedAnalysisData = data;
  }
}

// Auto-select storage based on environment
let storageInstance: IStorage;

// Check if running in Electron
const isElectron = typeof process !== 'undefined' && process.versions && process.versions.electron;

if (isElectron) {
  // In Electron, use file storage
  import('./file-storage').then(({ FileStorage }) => {
    storageInstance = new FileStorage();
  });
} else {
  // In web/development, use memory storage
  storageInstance = new MemStorage();
}

export const storage = storageInstance || new MemStorage();
