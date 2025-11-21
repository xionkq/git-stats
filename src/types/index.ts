// Git仓库信息
export interface GitRepository {
  name: string
  path: string
  currentBranch: string
  latestCommitHash: string
  latestCommitDate: string
  totalCommits: number
  authors: string[]
  isValid: boolean
  error?: string
}

// 提交统计信息
export interface CommitStats {
  hash: string
  author: string
  date: string
  message: string
}

// 作者贡献统计
export interface AuthorStats {
  author: string
  commits: number
  percentage: number
}

// 仓库分析结果
export interface RepositoryAnalysis {
  repository: GitRepository
  commits: CommitStats[]
  authorStats: AuthorStats[]
  dailyStats: { date: string; commits: number }[]
  lastUpdated: string
}

// 扫描结果
export interface ScanResult {
  rootPath: string
  repositories: GitRepository[]
  totalScanned: number
  totalValid: number
  scanTime: number
}

// 缓存数据
export interface CacheData {
  repoPath: string
  lastHash: string
  lastUpdated: string
  stats: RepositoryAnalysis
}

// IPC通信消息类型
export interface IpcMessage {
  type: string
  payload?: any
}

// 进度信息
export interface ProgressInfo {
  current: number
  total: number
  message: string
}
