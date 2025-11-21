import { BrowserWindow, ipcMain } from 'electron'
import { GitScanner } from './gitScanner'
import { GitAnalyzer } from './gitAnalyzer'
import { CacheManager } from './cacheManager'
import { GitRepository, RepositoryAnalysis, ProgressInfo } from '../../types'

export class GitStatsService {
  private scanner: GitScanner
  private analyzer: GitAnalyzer
  private cacheManager: CacheManager
  private mainWindow: BrowserWindow

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.scanner = new GitScanner()
    this.analyzer = new GitAnalyzer()
    this.cacheManager = new CacheManager()
    this.setupIpcHandlers()
  }

  private setupIpcHandlers(): void {
    // 选择目录
    ipcMain.handle('git-stats:select-directory', async () => {
      return await this.scanner.selectDirectory()
    })

    // 扫描仓库
    ipcMain.handle('git-stats:scan-repositories', async (_, rootPath: string) => {
      this.sendProgress({ current: 0, total: 1, message: '正在扫描Git仓库...' })

      const scanResult = await this.scanner.scanRepositories(rootPath)

      this.sendProgress({ current: 1, total: 1, message: '扫描完成' })

      return scanResult
    })

    // 分析仓库
    ipcMain.handle('git-stats:analyze-repository', async (_, repository: GitRepository) => {
      try {
        // 确保输入的repository对象是可序列化的
        const serializableRepository = JSON.parse(JSON.stringify(repository))

        // 检查缓存
        // const isValid = await this.cacheManager.isCacheValid(
        //   serializableRepository.path,
        //   serializableRepository.latestCommitHash
        // )

        // if (isValid) {
        //   const cache = await this.cacheManager.getCache(serializableRepository.path)
        //   if (cache?.stats) {
        //     // 确保返回的对象是可序列化的
        //     return JSON.parse(JSON.stringify(cache.stats))
        //   }
        // }

        // 重新分析
        const analysis = await this.analyzer.analyzeRepository(serializableRepository)

        // 确保返回的对象是可序列化的
        const serializableAnalysis = JSON.parse(JSON.stringify(analysis))

        // 保存到缓存
        await this.cacheManager.setCache(serializableRepository.path, analysis)

        return serializableAnalysis
      } catch (error) {
        console.error('Error in analyze-repository handler:', error)
        throw error
      }
    })

    // 批量分析仓库
    ipcMain.handle('git-stats:analyze-repositories', async (_, repositories: GitRepository[]) => {
      const results: RepositoryAnalysis[] = []
      let completed = 0

      this.sendProgress({
        current: 0,
        total: repositories.length,
        message: '正在分析仓库...'
      })

      for (const repo of repositories) {
        try {
          // 检查缓存
          const isValid = await this.cacheManager.isCacheValid(repo.path, repo.latestCommitHash)

          if (isValid) {
            const cache = await this.cacheManager.getCache(repo.path)
            if (cache?.stats) {
              results.push(cache.stats)
            }
          } else {
            // 重新分析
            const analysis = await this.analyzer.analyzeRepository(repo)
            results.push(analysis)

            // 保存到缓存
            await this.cacheManager.setCache(repo.path, analysis)
          }

          completed++
          this.sendProgress({
            current: completed,
            total: repositories.length,
            message: `已分析 ${completed}/${repositories.length} 个仓库`
          })
        } catch (error) {
          console.error(`Error analyzing repository ${repo.path}:`, error)
          completed++
          this.sendProgress({
            current: completed,
            total: repositories.length,
            message: `已分析 ${completed}/${repositories.length} 个仓库`
          })
        }
      }

      return results
    })

    // 清除缓存
    ipcMain.handle('git-stats:clear-cache', async (_, repoPath?: string) => {
      await this.cacheManager.clearCache(repoPath)
    })
  }

  private sendProgress(progress: ProgressInfo): void {
    this.mainWindow.webContents.send('git-stats:progress', progress)
  }
}
