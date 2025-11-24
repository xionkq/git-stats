import { ElectronAPI } from '@electron-toolkit/preload'
import {
  GitRepository,
  RepositoryAnalysis,
  ScanResult,
  ProgressInfo,
  ContributorStats
} from '../types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    gitStats: {
      selectDirectory: () => Promise<string | null>
      scanRepositories: (rootPath: string) => Promise<ScanResult>
      analyzeRepository: (repository: GitRepository) => Promise<RepositoryAnalysis>
      analyzeRepositories: (repositories: GitRepository[]) => Promise<RepositoryAnalysis[]>
      analyzeContributor: (
        account: string,
        repositories: GitRepository[],
        year1?: number,
        year2?: number
      ) => Promise<ContributorStats>
      clearCache: (repoPath?: string) => Promise<void>
      onProgress: (callback: (progress: ProgressInfo) => void) => () => void
    }
  }
}
