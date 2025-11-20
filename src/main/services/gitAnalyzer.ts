import { execSync } from 'child_process';
import { CommitStats, AuthorStats, RepositoryAnalysis, GitRepository } from '../../types';

export class GitAnalyzer {
  private parseGitLogOutput(output: string): CommitStats[] {
    const commits: CommitStats[] = [];
    const lines = output.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // 格式: hash|author|date|message
      const parts = line.split('|');
      if (parts.length >= 4) {
        commits.push({
          hash: parts[0],
          author: parts[1],
          date: parts[2],
          message: parts.slice(3).join('|')
        });
      }
    }

    return commits;
  }

  private calculateAuthorStats(commits: CommitStats[]): AuthorStats[] {
    const authorMap = new Map<string, number>();

    // 统计每个作者的提交次数
    commits.forEach(commit => {
      const count = authorMap.get(commit.author) || 0;
      authorMap.set(commit.author, count + 1);
    });

    const totalCommits = commits.length;
    const authorStats: AuthorStats[] = [];

    // 转换为AuthorStats数组并计算百分比
    authorMap.forEach((commits, author) => {
      authorStats.push({
        author,
        commits,
        percentage: totalCommits > 0 ? (commits / totalCommits) * 100 : 0
      });
    });

    // 按提交次数降序排序
    return authorStats.sort((a, b) => b.commits - a.commits);
  }

  private calculateDailyStats(commits: CommitStats[]): { date: string; commits: number }[] {
    const dailyMap = new Map<string, number>();

    commits.forEach(commit => {
      const count = dailyMap.get(commit.date) || 0;
      dailyMap.set(commit.date, count + 1);
    });

    return Array.from(dailyMap.entries())
      .map(([date, commits]) => ({ date, commits }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async analyzeRepository(repository: GitRepository, since: string = '1 year ago'): Promise<RepositoryAnalysis> {
    try {
      // 获取提交历史
      const gitLogCommand = `git log --since="${since}" --pretty=format:%H|%an|%ad --date=short`;
      const logOutput = execSync(gitLogCommand, {
        cwd: repository.path,
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });

      const commits = this.parseGitLogOutput(logOutput);
      const authorStats = this.calculateAuthorStats(commits);
      const dailyStats = this.calculateDailyStats(commits);

      return {
        repository,
        commits,
        authorStats,
        dailyStats,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error analyzing repository ${repository.path}:`, error);

      // 返回空的分析结果
      return {
        repository,
        commits: [],
        authorStats: [],
        dailyStats: [],
        lastUpdated: new Date().toISOString()
      };
    }
  }

  async analyzeMultipleRepositories(repositories: GitRepository[], progressCallback?: (current: number, total: number) => void): Promise<RepositoryAnalysis[]> {
    const results: RepositoryAnalysis[] = [];

    for (let i = 0; i < repositories.length; i++) {
      const repo = repositories[i];

      if (progressCallback) {
        progressCallback(i + 1, repositories.length);
      }

      const analysis = await this.analyzeRepository(repo);
      results.push(analysis);
    }

    return results;
  }
}
