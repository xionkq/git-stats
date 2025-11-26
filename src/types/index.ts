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
  addedLines?: number
  deletedLines?: number
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
  payload?: unknown
}

// 进度信息
export interface ProgressInfo {
  current: number
  total: number
  message: string
}

// 年份对比统计
export interface YearComparison {
  year: number
  commits: number
  addedLines: number
  deletedLines: number
  netLines: number // 净增行数
  maxAddedMonth?: { month: number; lines: number } // 新增代码最多月份
  minAddedMonth?: { month: number; lines: number } // 新增代码最少月份
  repositoryCount: number // 提交过的仓库数
  maxAddedRepository?: { name: string; path: string; lines: number } // 新增代码最多仓库
}

// 个人贡献统计
export interface ContributorStats {
  account: string
  totalCommits: number
  repositories: {
    repository: GitRepository
    commits: number
    percentage: number
    commitsList: CommitStats[]
  }[]
  dailyStats: { date: string; commits: number }[]
  yearComparison?: {
    year1: YearComparison
    year2: YearComparison
  }
  lastUpdated: string
}
