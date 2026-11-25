import type { Word, WordWithIndex } from '@/typings'

export type MuseExportResult = 'shared' | 'copied' | 'downloaded'

function sortChapterWords(words: (Word | WordWithIndex)[]): (Word | WordWithIndex)[] {
  return [...words].sort((a, b) => {
    const idxA = 'index' in a && typeof a.index === 'number' ? a.index : 0
    const idxB = 'index' in b && typeof b.index === 'number' ? b.index : 0
    return idxA - idxB
  })
}

/**
 * Format an entire chapter of words into a prompt-ready Markdown text for Meta Muse.
 */
export function formatChapterForMuse(dictName: string, chapterIndex: number, words: (Word | WordWithIndex)[], isReviewMode = false): string {
  const chapterLabel = isReviewMode ? '错题复习' : `第 ${chapterIndex + 1} 章`
  const orderedWords = sortChapterWords(words)

  const lines = orderedWords.map((word, i) => {
    const phonetic = word.usphone ? ` /${word.usphone}/` : word.ukphone ? ` /${word.ukphone}/` : ''
    const trans = word.trans?.length ? ` — ${word.trans.join('；')}` : ''
    return `${i + 1}. ${word.name}${phonetic}${trans}`
  })

  return [
    `请帮我复习以下英语单词（来自 Qwerty Learner）：`,
    `词库：${dictName} · ${chapterLabel}（共 ${orderedWords.length} 词）`,
    '',
    ...lines,
    '',
    '请帮我：',
    '1. 挑出高频考点或易混淆单词做重点对比；',
    '2. 为本章节单词编写贴近日常或考试场景的英文例句；',
    '3. 安排一个后续复习提醒计划。',
  ].join('\n')
}

export function downloadChapterMarkdown(dictName: string, chapterIndex: number, words: (Word | WordWithIndex)[], isReviewMode = false): void {
  const chapterLabel = isReviewMode ? '错题复习' : `第${chapterIndex + 1}章`
  const content = formatChapterForMuse(dictName, chapterIndex, words, isReviewMode)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${dictName}-${chapterLabel}-Muse.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Share the full chapter to Meta Muse (via Android/Web Share sheet),
 * falling back to clipboard copy or markdown download.
 */
export async function shareChapterToMuse(
  dictName: string,
  chapterIndex: number,
  words: (Word | WordWithIndex)[],
  isReviewMode = false,
): Promise<MuseExportResult> {
  const chapterLabel = isReviewMode ? '错题复习' : `第 ${chapterIndex + 1} 章`
  const title = `${dictName} ${chapterLabel} 单词本`
  const text = formatChapterForMuse(dictName, chapterIndex, words, isReviewMode)

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return 'shared'
    } catch (err) {
      // User cancelled share sheet or platform rejected; fall through to clipboard if not AbortError
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'shared'
      }
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return 'copied'
    } catch {
      // fall through to download
    }
  }

  downloadChapterMarkdown(dictName, chapterIndex, words, isReviewMode)
  return 'downloaded'
}
