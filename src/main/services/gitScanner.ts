import { dialog } from 'electron'
import { promises as fs } from 'fs'
import { join, basename } from 'path'
import { execSync } from 'child_process'
import { GitRepository, ScanResult, ProgressInfo } from '../../types'

export class GitScanner {
  private async getRepositoryInfo(repoPath: string): Promise<GitRepository> {
    const name = basename(repoPath)

    try {
      // 先检查git是否可用
      try {
        execSync('git --version', { stdio: 'pipe' })
      } catch {
        throw new Error('Git is not installed or not available in PATH')
      }
      // 获取当前分支
      const branch = execSync('git rev-parse --abbrev-ref HEAD', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim()

      // 获取最新commit hash
      const latestCommitHash = execSync('git rev-parse HEAD', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim()

      // 获取最新commit日期
      const latestCommitDate = execSync('git log -1 --format=%cd --date=short', {
        cwd: repoPath,
        encoding: 'utf8'
      }).trim()

      // 获取总提交次数
      const totalCommits = parseInt(
        execSync('git rev-list --count HEAD', {
          cwd: repoPath,
          encoding: 'utf8'
        }).trim()
      )

      // 获取作者列表
      const authorsOutput = execSync('git log --format=%an', {
        cwd: repoPath,
        encoding: 'utf8'
      })
      const authors = [...new Set(authorsOutput.trim().split('\n').filter(Boolean))].map((author) =>
        String(author)
      )

      return {
        name,
        path: repoPath,
        currentBranch: branch,
        latestCommitHash,
        latestCommitDate,
        totalCommits,
        authors,
        isValid: true
      }
    } catch (error) {
      return {
        name,
        path: repoPath,
        currentBranch: '',
        latestCommitHash: '',
        latestCommitDate: '',
        totalCommits: 0,
        authors: [],
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private async scanDirectoryForGitRepos(
    dirPath: string,
    maxDepth: number = 3,
    progressCallback?: (progress: ProgressInfo) => void
  ): Promise<GitRepository[]> {
    const repos: GitRepository[] = []
    let directoriesScanned = 0
    const directoriesToScan: string[] = [dirPath]

    // 预先收集所有需要扫描的目录
    const collectDirectories = async (currentPath: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = join(currentPath, entry.name)

            // 跳过不需要扫描的目录
            if (['node_modules', 'dist', 'build', '.next', '.git'].includes(entry.name)) {
              continue
            }

            directoriesToScan.push(fullPath)
            await collectDirectories(fullPath, depth + 1)
          }
        }
      } catch (error) {
        // 忽略无法访问的目录
      }
    }

    // 先收集所有目录
    await collectDirectories(dirPath, 0)
    const totalDirectories = directoriesToScan.length

    progressCallback?.({
      current: 0,
      total: totalDirectories,
      message: `正在扫描目录 (0/${totalDirectories})...`
    })

    const scanRecursive = async (currentPath: string, depth: number): Promise<void> => {
      if (depth > maxDepth) return

      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true })

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = join(currentPath, entry.name)

            // 特殊处理 .git 目录
            if (entry.name === '.git') {
              // 找到了.git目录，说明当前目录是git仓库
              const repoPath = currentPath
              if (!repos.some((repo) => repo.path === repoPath)) {
                const repoInfo = await this.getRepositoryInfo(repoPath)
                repos.push(repoInfo)
              }
              // 不需要递归进入 .git 目录
              continue
            }

            // 跳过其他不需要扫描的目录
            if (['node_modules', 'dist', 'build', '.next'].includes(entry.name)) {
              continue
            }

            // 递归扫描子目录
            await scanRecursive(fullPath, depth + 1)
          }
        }

        // 更新进度
        directoriesScanned++
        progressCallback?.({
          current: directoriesScanned,
          total: totalDirectories,
          message: `正在扫描目录 (${directoriesScanned}/${totalDirectories})...`
        })
      } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error)
        // 即使出错也要更新进度
        directoriesScanned++
        progressCallback?.({
          current: directoriesScanned,
          total: totalDirectories,
          message: `正在扫描目录 (${directoriesScanned}/${totalDirectories})...`
        })
      }
    }

    await scanRecursive(dirPath, 0)
    return repos
  }

  async selectDirectory(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择包含Git仓库的根目录'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  async scanRepositories(
    rootPath: string,
    progressCallback?: (progress: ProgressInfo) => void
  ): Promise<ScanResult> {
    const startTime = Date.now()

    try {
      console.log('开始扫描目录:', rootPath)
      const repositories = await this.scanDirectoryForGitRepos(rootPath, 3, progressCallback)
      const scanTime = Date.now() - startTime

      console.log('扫描完成，找到仓库数量:', repositories.length)
      console.log(
        '仓库列表:',
        repositories.map((r) => ({ name: r.name, path: r.path, isValid: r.isValid }))
      )

      return {
        rootPath,
        repositories,
        totalScanned: repositories.length,
        totalValid: repositories.filter((repo) => repo.isValid).length,
        scanTime
      }
    } catch (error) {
      console.error('Error during repository scan:', error)
      return {
        rootPath,
        repositories: [],
        totalScanned: 0,
        totalValid: 0,
        scanTime: Date.now() - startTime
      }
    }
  }
}
