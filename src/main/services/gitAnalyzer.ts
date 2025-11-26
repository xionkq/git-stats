import { execSync } from 'child_process'
import {
  CommitStats,
  AuthorStats,
  RepositoryAnalysis,
  GitRepository,
  ContributorStats,
  YearComparison
} from '../../types'

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

  async analyzeContributor(
    account: string,
    repositories: GitRepository[],
    year1?: number,
    year2?: number
  ): Promise<ContributorStats> {
    const repoStats: ContributorStats['repositories'] = []
    const allCommits: CommitStats[] = []
    const dailyMap = new Map<string, number>()

    for (const repo of repositories) {
      if (!repo.isValid) continue

      try {
        // 先获取提交记录
        const gitLogCommand =
          process.platform === 'win32'
            ? `git log --pretty=format:"%H|%an|%ad|%s" --date=short --author="${account}"`
            : `git log --pretty=format:"%H|%an|%ad|%s" --date=short --author="${account}"`

        const logOutput = execSync(gitLogCommand, {
          cwd: repo.path,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024,
          shell: process.platform === 'win32' ? 'cmd.exe' : undefined
        })

        const commits = this.parseGitLogOutput(logOutput)
        const filteredCommits = commits.filter((commit) => commit.author === account)

        // 为每个提交获取代码修改行数
        const commitsWithStats: CommitStats[] = []
        for (const commit of filteredCommits) {
          try {
            // 获取单个提交的numstat统计
            const numstatCommand =
              process.platform === 'win32'
                ? `git show --numstat --format="" ${commit.hash}`
                : `git show --numstat --format="" ${commit.hash}`

            const numstatOutput = execSync(numstatCommand, {
              cwd: repo.path,
              encoding: 'utf8',
              maxBuffer: 1024 * 1024,
              shell: process.platform === 'win32' ? 'cmd.exe' : undefined
            })

            let addedLines = 0
            let deletedLines = 0
            const numstatLines = numstatOutput.trim().split('\n')
            for (const line of numstatLines) {
              if (!line.trim()) continue
              const match = line.match(/^(\d+)\s+(\d+)\s+/)
              if (match) {
                addedLines += parseInt(match[1]) || 0
                deletedLines += parseInt(match[2]) || 0
              }
            }

            commitsWithStats.push({
              ...commit,
              addedLines,
              deletedLines
            })
          } catch {
            // 如果获取numstat失败，使用0
            commitsWithStats.push({
              ...commit,
              addedLines: 0,
              deletedLines: 0
            })
          }
        }

        if (commitsWithStats.length > 0) {
          // 计算该仓库中的百分比
          const totalCommits = repo.totalCommits || commitsWithStats.length
          const percentage = totalCommits > 0 ? (commitsWithStats.length / totalCommits) * 100 : 0

          repoStats.push({
            repository: repo,
            commits: commitsWithStats.length,
            percentage,
            commitsList: commitsWithStats
          })

          // 收集所有提交用于统计
          allCommits.push(...commitsWithStats)

          // 统计每日提交
          commitsWithStats.forEach((commit) => {
            const count = dailyMap.get(commit.date) || 0
            dailyMap.set(commit.date, count + 1)
          })
        }
      } catch (error) {
        console.error(`Error analyzing contributor in repository ${repo.path}:`, error)
        // 如果git命令失败（例如账号不存在），继续处理下一个仓库
        continue
      }
    }

    // 计算每日统计
    const dailyStats = Array.from(dailyMap.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 计算年份对比
    let yearComparison: ContributorStats['yearComparison'] | undefined = undefined

    if (year1 !== undefined && year2 !== undefined) {
      const year1Start = new Date(year1, 0, 1)
      const year1End = new Date(year1, 11, 31, 23, 59, 59, 999)
      const year2Start = new Date(year2, 0, 1)
      const year2End = new Date(year2, 11, 31, 23, 59, 59, 999)

      const year1Commits = allCommits.filter((commit) => {
        const commitDate = new Date(commit.date)
        return commitDate >= year1Start && commitDate <= year1End
      })

      const year2Commits = allCommits.filter((commit) => {
        const commitDate = new Date(commit.date)
        return commitDate >= year2Start && commitDate <= year2End
      })

      const calculateYearStats = (
        commits: CommitStats[],
        year: number,
        repoStats: ContributorStats['repositories'],
        yearStart: Date,
        yearEnd: Date
      ): YearComparison => {
        const addedLines = commits.reduce((sum, commit) => sum + (commit.addedLines || 0), 0)
        const deletedLines = commits.reduce((sum, commit) => sum + (commit.deletedLines || 0), 0)

        // 按月份统计新增代码行数
        const monthStats = new Map<number, number>()
        commits.forEach((commit) => {
          const commitDate = new Date(commit.date)
          // 检查日期是否有效
          if (isNaN(commitDate.getTime())) {
            console.warn(`Invalid date for commit ${commit.hash}: ${commit.date}`)
            return
          }
          const month = commitDate.getMonth() + 1 // 月份从1开始
          const currentLines = monthStats.get(month) || 0
          monthStats.set(month, currentLines + (commit.addedLines || 0))
        })

        // 找出新增代码最多和最少的月份
        let maxAddedMonth: { month: number; lines: number } | undefined = undefined
        let minAddedMonth: { month: number; lines: number } | undefined = undefined

        if (monthStats.size > 0) {
          let maxLines: number | undefined = undefined
          let minLines: number | undefined = undefined

          monthStats.forEach((lines, month) => {
            // 初始化第一个月份的值
            if (maxLines === undefined) {
              maxLines = lines
              minLines = lines
              maxAddedMonth = { month, lines }
              minAddedMonth = { month, lines }
            } else {
              // 更新最多月份
              if (lines > maxLines) {
                maxLines = lines
                maxAddedMonth = { month, lines }
              }
              // 更新最少月份
              if (lines < minLines) {
                minLines = lines
                minAddedMonth = { month, lines }
              }
            }
          })

          // 调试日志：检查月份统计数据
          if (commits.length > 0 && (!maxAddedMonth || !minAddedMonth)) {
            console.warn(
              `Year ${year}: commits=${commits.length}, monthStats.size=${monthStats.size}, maxAddedMonth=${JSON.stringify(maxAddedMonth)}, minAddedMonth=${JSON.stringify(minAddedMonth)}`
            )
          }
        } else if (commits.length > 0) {
          // 如果有提交但没有月份统计，可能是日期解析问题
          console.warn(`Year ${year}: has ${commits.length} commits but monthStats is empty`)
        }

        // 按仓库统计：找出该年份有提交的仓库和新增代码最多的仓库
        const repoStatsMap = new Map<string, number>() // 仓库路径 -> 新增代码行数
        let repositoryCount = 0

        repoStats.forEach((repoStat) => {
          // 过滤该年份的提交
          const yearCommits = repoStat.commitsList.filter((commit) => {
            const commitDate = new Date(commit.date)
            return commitDate >= yearStart && commitDate <= yearEnd
          })

          if (yearCommits.length > 0) {
            repositoryCount++
            // 计算该仓库在该年份的新增代码行数
            const repoAddedLines = yearCommits.reduce(
              (sum, commit) => sum + (commit.addedLines || 0),
              0
            )
            repoStatsMap.set(repoStat.repository.path, repoAddedLines)
          }
        })

        // 找出新增代码最多的仓库
        let maxAddedRepository: { name: string; path: string; lines: number } | undefined =
          undefined
        let maxRepoLines = -1

        repoStatsMap.forEach((lines, path) => {
          if (lines > maxRepoLines) {
            maxRepoLines = lines
            const repoStat = repoStats.find((r) => r.repository.path === path)
            if (repoStat) {
              maxAddedRepository = {
                name: repoStat.repository.name,
                path: repoStat.repository.path,
                lines
              }
            }
          }
        })

        return {
          year,
          commits: commits.length,
          addedLines,
          deletedLines,
          netLines: addedLines - deletedLines,
          maxAddedMonth,
          minAddedMonth,
          repositoryCount,
          maxAddedRepository
        }
      }

      yearComparison = {
        year1: calculateYearStats(year1Commits, year1, repoStats, year1Start, year1End),
        year2: calculateYearStats(year2Commits, year2, repoStats, year2Start, year2End)
      }
    }

    return {
      account,
      totalCommits: allCommits.length,
      repositories: repoStats,
      dailyStats,
      yearComparison,
      lastUpdated: new Date().toISOString()
    }
  }
}
