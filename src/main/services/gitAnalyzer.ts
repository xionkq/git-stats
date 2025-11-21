import { execSync } from 'child_process'
import { CommitStats, AuthorStats, RepositoryAnalysis, GitRepository } from '../../types'

export class GitAnalyzer {
  private parseGitLogOutput(output: string): CommitStats[] {
    const commits: CommitStats[] = []
    const lines = output.trim().split('\n')

    for (const line of lines) {
      if (!line.trim()) continue

      // 格式: hash|author|date|message
      const parts = line.split('|')
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0],
          author: parts[1],
          date: parts[2],
          message: parts.slice(3).join('|')
        })
      }
    }

    return commits
  }

  private calculateAuthorStats(commits: CommitStats[]): AuthorStats[] {
    const authorMap = new Map<string, number>()

    // 统计每个作者的提交次数
    commits.forEach((commit) => {
      const count = authorMap.get(commit.author) || 0
      authorMap.set(commit.author, count + 1)
    })

    const totalCommits = commits.length
    const authorStats: AuthorStats[] = []

    // 转换为AuthorStats数组并计算百分比
    authorMap.forEach((commits, author) => {
      authorStats.push({
        author,
        commits,
        percentage: totalCommits > 0 ? (commits / totalCommits) * 100 : 0
      })
    })

    // 按提交次数降序排序
    return authorStats.sort((a, b) => b.commits - a.commits)
  }

  private calculateDailyStats(commits: CommitStats[]): { date: string; commits: number }[] {
    const dailyMap = new Map<string, number>()

    commits.forEach((commit) => {
      const count = dailyMap.get(commit.date) || 0
      dailyMap.set(commit.date, count + 1)
    })

    return Array.from(dailyMap.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  async analyzeRepository(repository: GitRepository): Promise<RepositoryAnalysis> {
    try {
      console.log(`开始分析仓库: ${repository.path}`)
      console.log(`仓库分支: ${repository.currentBranch}`)

      // 先检查git是否可用
      try {
        execSync('git --version', { stdio: 'pipe' })
      } catch {
        throw new Error('Git is not installed or not available in PATH')
      }

      // 获取提交历史 - 包含message，并且不限制时间范围
      // 在Windows上需要使用双引号来避免%被当作环境变量
      const gitLogCommand = `git log --pretty=format:"%H|%an|%ad|%s" --date=short`
      console.log(`执行Git命令: ${gitLogCommand}`)

      const logOutput = execSync(gitLogCommand, {
        cwd: repository.path,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        shell: process.platform === 'win32' ? 'cmd.exe' : undefined
      })

      console.log(`Git命令输出长度: ${logOutput.length}`)
      console.log(`Git命令输出前200字符: ${logOutput.substring(0, 200)}`)

      const commits = this.parseGitLogOutput(logOutput)
      console.log(`解析出 ${commits.length} 个提交`)

      const authorStats = this.calculateAuthorStats(commits)
      const dailyStats = this.calculateDailyStats(commits)

      console.log(
        `分析完成: ${commits.length} 提交, ${authorStats.length} 作者, ${dailyStats.length} 天`
      )

      return {
        repository,
        commits,
        authorStats,
        dailyStats,
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error(`Error analyzing repository ${repository.path}:`, error)

      // 返回空的分析结果
      return {
        repository,
        commits: [],
        authorStats: [],
        dailyStats: [],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  async analyzeMultipleRepositories(
    repositories: GitRepository[],
    progressCallback?: (current: number, total: number) => void
  ): Promise<RepositoryAnalysis[]> {
    const results: RepositoryAnalysis[] = []

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i]

      if (progressCallback) {
        progressCallback(i + 1, repositories.length)
      }

      const analysis = await this.analyzeRepository(repo)
      results.push(analysis)
    }

    return results
  }
}
