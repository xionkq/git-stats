import { ElectronAPI } from '@electron-toolkit/preload'
import { GitRepository, RepositoryAnalysis, ScanResult, ProgressInfo } from '../types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    gitStats: {
      selectDirectory: () => Promise<string | null>
      scanRepositories: (rootPath: string) => Promise<ScanResult>
      analyzeRepository: (repository: GitRepository) => Promise<RepositoryAnalysis>
      analyzeRepositories: (repositories: GitRepository[]) => Promise<RepositoryAnalysis[]>
      clearCache: (repoPath?: string) => Promise<void>
      onProgress: (callback: (progress: ProgressInfo) => void) => () => void
    }
  }
}
