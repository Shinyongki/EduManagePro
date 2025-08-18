import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';
import type { EducationData, EducationParticipant, IntegratedAnalysisData } from '@shared/schema';
import type { InstitutionStats, SystemStats } from './storage';

export class SessionManager {
  private static instance: SessionManager;
  private cleanupInterval: NodeJS.Timeout;
  
  // Session expires after 2 hours of inactivity
  private readonly SESSION_MAX_AGE = 2 * 60 * 60 * 1000;
  
  // Cleanup expired sessions every 30 minutes
  private readonly CLEANUP_INTERVAL = 30 * 60 * 1000;

  private constructor() {
    // Start automatic cleanup of expired sessions
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async createSession(): Promise<string> {
    const sessionId = uuidv4();
    await storage.createSession(sessionId);
    console.log(`🆕 Session created: ${sessionId}`);
    return sessionId;
  }

  async getSession(sessionId: string) {
    const session = await storage.getSessionData(sessionId);
    if (!session) {
      throw new Error('Session not found or expired');
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await storage.deleteSession(sessionId);
    console.log(`🗑️ Session deleted: ${sessionId}`);
  }

  async saveSessionEducationData(
    sessionId: string, 
    type: 'basic' | 'advanced', 
    data: EducationData[]
  ): Promise<void> {
    await storage.saveSessionEducationData(sessionId, type, data);
    console.log(`💾 Session ${sessionId}: Saved ${data.length} ${type} education records`);
  }

  async getSessionEducationData(
    sessionId: string, 
    type: 'basic' | 'advanced'
  ): Promise<EducationData[]> {
    return await storage.getSessionEducationData(sessionId, type);
  }

  async saveSessionParticipants(
    sessionId: string, 
    data: EducationParticipant[]
  ): Promise<void> {
    await storage.saveSessionParticipants(sessionId, data);
    console.log(`👥 Session ${sessionId}: Saved ${data.length} participant records`);
  }

  async getSessionParticipants(sessionId: string): Promise<EducationParticipant[]> {
    return await storage.getSessionParticipants(sessionId);
  }

  async saveSessionIntegratedAnalysis(
    sessionId: string, 
    data: IntegratedAnalysisData[]
  ): Promise<void> {
    await storage.saveSessionIntegratedAnalysis(sessionId, data);
    console.log(`📊 Session ${sessionId}: Saved ${data.length} integrated analysis records`);
  }

  async getSessionIntegratedAnalysis(sessionId: string): Promise<IntegratedAnalysisData[]> {
    return await storage.getSessionIntegratedAnalysis(sessionId);
  }

  async generateAndSaveStatistics(sessionId: string): Promise<{
    institutionStats: InstitutionStats[],
    systemStats: SystemStats
  }> {
    const session = await this.getSession(sessionId);
    
    // Generate anonymized institution statistics
    const institutionStatsMap = new Map<string, {
      code: string,
      name: string,
      region: string,
      subRegion: string,
      totalEmployees: number,
      basicCompleted: number,
      advancedCompleted: number
    }>();

    // Process basic education data
    session.basicEducationData.forEach(record => {
      if (record.institutionCode) {
        const key = record.institutionCode;
        if (!institutionStatsMap.has(key)) {
          institutionStatsMap.set(key, {
            code: record.institutionCode,
            name: record.institutionName || '',
            region: record.region || '',
            subRegion: record.subRegion || '',
            totalEmployees: 0,
            basicCompleted: 0,
            advancedCompleted: 0
          });
        }
        
        const stats = institutionStatsMap.get(key)!;
        stats.totalEmployees++;
        if (record.status === '수료') {
          stats.basicCompleted++;
        }
      }
    });

    // Process advanced education data
    session.advancedEducationData.forEach(record => {
      if (record.institutionCode) {
        const key = record.institutionCode;
        if (!institutionStatsMap.has(key)) {
          institutionStatsMap.set(key, {
            code: record.institutionCode,
            name: record.institutionName || '',
            region: record.region || '',
            subRegion: record.subRegion || '',
            totalEmployees: 0,
            basicCompleted: 0,
            advancedCompleted: 0
          });
        }
        
        const stats = institutionStatsMap.get(key)!;
        // Don't double count employees, but count advanced completions
        if (record.status === '수료') {
          stats.advancedCompleted++;
        }
      }
    });

    // Convert to InstitutionStats and save
    const institutionStats: InstitutionStats[] = [];
    
    for (const [_, stats] of institutionStatsMap) {
      const institutionStat: InstitutionStats = {
        id: uuidv4(),
        institutionCode: stats.code,
        institutionName: stats.name,
        region: stats.region,
        subRegion: stats.subRegion,
        totalEmployees: stats.totalEmployees,
        basicEducationRate: stats.totalEmployees > 0 ? 
          Math.round((stats.basicCompleted / stats.totalEmployees) * 100) : 0,
        advancedEducationRate: stats.totalEmployees > 0 ? 
          Math.round((stats.advancedCompleted / stats.totalEmployees) * 100) : 0,
        overallCompletionRate: stats.totalEmployees > 0 ? 
          Math.round(((stats.basicCompleted + stats.advancedCompleted) / (stats.totalEmployees * 2)) * 100) : 0,
        lastUpdated: new Date()
      };
      
      institutionStats.push(institutionStat);
      await storage.saveInstitutionStats(institutionStat);
    }

    // Generate system-wide statistics
    const totalInstitutions = institutionStats.length;
    const totalParticipants = session.basicEducationData.length + session.advancedEducationData.length;
    const totalBasicCompleted = session.basicEducationData.filter(r => r.status === '수료').length;
    const totalAdvancedCompleted = session.advancedEducationData.filter(r => r.status === '수료').length;
    
    const systemStats: SystemStats = {
      id: uuidv4(),
      totalInstitutions,
      totalParticipants,
      overallBasicRate: session.basicEducationData.length > 0 ? 
        Math.round((totalBasicCompleted / session.basicEducationData.length) * 100) : 0,
      overallAdvancedRate: session.advancedEducationData.length > 0 ? 
        Math.round((totalAdvancedCompleted / session.advancedEducationData.length) * 100) : 0,
      overallCompletionRate: totalParticipants > 0 ? 
        Math.round(((totalBasicCompleted + totalAdvancedCompleted) / totalParticipants) * 100) : 0,
      createdAt: new Date()
    };

    await storage.saveSystemStats(systemStats);

    console.log(`📈 Statistics generated for session ${sessionId}:`);
    console.log(`  - Institutions: ${totalInstitutions}`);
    console.log(`  - Participants: ${totalParticipants}`);
    console.log(`  - Overall completion rate: ${systemStats.overallCompletionRate}%`);

    return { institutionStats, systemStats };
  }

  async finalizeAndCleanupSession(sessionId: string): Promise<void> {
    try {
      // Generate and save statistics before cleanup
      await this.generateAndSaveStatistics(sessionId);
      
      // Delete the session (removes all personal data)
      await this.deleteSession(sessionId);
      
      console.log(`✅ Session ${sessionId} finalized and cleaned up`);
    } catch (error) {
      console.error(`❌ Error finalizing session ${sessionId}:`, error);
      throw error;
    }
  }

  private async cleanupExpiredSessions(): Promise<void> {
    try {
      const deletedCount = await storage.cleanupExpiredSessions(this.SESSION_MAX_AGE);
      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} expired sessions`);
      }
    } catch (error) {
      console.error('Error during session cleanup:', error);
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

export const sessionManager = SessionManager.getInstance();