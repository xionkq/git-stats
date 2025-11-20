import { promises as fs } from 'fs';
import { join } from 'path';
import { app } from 'electron';
import { CacheData, RepositoryAnalysis } from '../../types';

export class CacheManager {
  private cacheDir: string;

  constructor() {
    this.cacheDir = join(app.getPath('userData'), 'cache');
  }

  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(this.cacheDir);
    } catch {
      await fs.mkdir(this.cacheDir, { recursive: true });
    }
  }

  private getCacheFilePath(repoPath: string): string {
    // 使用base64编码路径作为文件名，避免路径问题
    const encodedPath = Buffer.from(repoPath).toString('base64').replace(/[+/=]/g, '_');
    return join(this.cacheDir, `${encodedPath}.json`);
  }

  async getCache(repoPath: string): Promise<CacheData | null> {
    try {
      const cacheFile = this.getCacheFilePath(repoPath);
      const data = await fs.readFile(cacheFile, 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async setCache(repoPath: string, analysis: RepositoryAnalysis): Promise<void> {
    try {
      await this.ensureCacheDir();
      const cacheFile = this.getCacheFilePath(repoPath);

      const cacheData: CacheData = {
        repoPath,
        lastHash: analysis.repository.latestCommitHash,
        lastUpdated: analysis.lastUpdated,
        stats: analysis
      };

      await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving cache:', error);
    }
  }

  async isCacheValid(repoPath: string, currentHash: string): Promise<boolean> {
    const cache = await this.getCache(repoPath);
    return cache !== null && cache.lastHash === currentHash;
  }

  async clearCache(repoPath?: string): Promise<void> {
    try {
      if (repoPath) {
        const cacheFile = this.getCacheFilePath(repoPath);
        await fs.unlink(cacheFile);
      } else {
        // 清除所有缓存
        await this.ensureCacheDir();
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            await fs.unlink(join(this.cacheDir, file));
          }
        }
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}
