import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  GitRepository,
  RepositoryAnalysis,
  ScanResult,
  ProgressInfo,
  ContributorStats
} from '../types'

// Git Stats API for renderer
const gitStatsAPI = {
  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('git-stats:select-directory')
  },

  scanRepositories: (rootPath: string): Promise<ScanResult> => {
    return ipcRenderer.invoke('git-stats:scan-repositories', rootPath)
  },

  analyzeRepository: (repository: GitRepository): Promise<RepositoryAnalysis> => {
    return ipcRenderer.invoke(
      'git-stats:analyze-repository',
      JSON.parse(JSON.stringify(repository))
    )
  },

  analyzeRepositories: (repositories: GitRepository[]): Promise<RepositoryAnalysis[]> => {
    return ipcRenderer.invoke(
      'git-stats:analyze-repositories',
      JSON.parse(JSON.stringify(repositories))
    )
  },

  analyzeContributor: (
    account: string,
    repositories: GitRepository[],
    year1?: number,
    year2?: number
  ): Promise<ContributorStats> => {
    return ipcRenderer.invoke(
      'git-stats:analyze-contributor',
      account,
      JSON.parse(JSON.stringify(repositories)),
      year1,
      year2
    )
  },

  clearCache: (repoPath?: string): Promise<void> => {
    return ipcRenderer.invoke('git-stats:clear-cache', repoPath)
  },

  onProgress: (callback: (progress: ProgressInfo) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, progress: ProgressInfo): void =>
      callback(progress)
    ipcRenderer.on('git-stats:progress', handler)
    return () => ipcRenderer.off('git-stats:progress', handler)
  }
}

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('gitStats', gitStatsAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
  // @ts-ignore (define in dts)
  window.gitStats = gitStatsAPI
}
