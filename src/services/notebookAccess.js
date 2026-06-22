import { ElMessage, ElMessageBox } from 'element-plus'
import { listNotebooks, verifyNotebookPassword } from '@/services/notebooks'

const UNLOCKED_KEY = 'tn-unlocked-books'
const PASSWORDS_KEY = 'tn-book-passwords'

function readUnlockedSet() {
  try {
    const raw = sessionStorage.getItem(UNLOCKED_KEY)
    const list = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(list) ? list.map(String) : [])
  } catch {
    return new Set()
  }
}

function writeUnlockedSet(set) {
  sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify([...set]))
}

function readPasswordMap() {
  try {
    const raw = sessionStorage.getItem(PASSWORDS_KEY)
    const map = raw ? JSON.parse(raw) : {}
    return map && typeof map === 'object' ? map : {}
  } catch {
    return {}
  }
}

function writePasswordMap(map) {
  sessionStorage.setItem(PASSWORDS_KEY, JSON.stringify(map))
}

export function isNotebookUnlocked(bookId) {
  return readUnlockedSet().has(String(bookId))
}

export function getStoredBookPassword(bookId) {
  const password = readPasswordMap()[String(bookId)]
  return password || ''
}

export function storeBookAccess(bookId, password) {
  const id = String(bookId)
  const unlocked = readUnlockedSet()
  unlocked.add(id)
  writeUnlockedSet(unlocked)

  const passwords = readPasswordMap()
  passwords[id] = password
  writePasswordMap(passwords)
}

export function clearBookAccess() {
  sessionStorage.removeItem(UNLOCKED_KEY)
  sessionStorage.removeItem(PASSWORDS_KEY)
}

async function resolveNotebookMeta(bookId) {
  const id = String(bookId)
  const list = await listNotebooks()
  return list.find((b) => b.id === id) || null
}

/**
 * 加密日记本须先验证密码；同一会话内验证通过后不再重复询问。
 * @returns {{ ok: boolean, notebook: object | null }}
 */
export async function ensureNotebookAccess(bookId, { notebook } = {}) {
  const id = String(bookId)
  const nb = notebook ?? (await resolveNotebookMeta(id))

  if (!nb) return { ok: false, notebook: null }
  if (!nb.encrypted || isNotebookUnlocked(id)) {
    return { ok: true, notebook: nb }
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入日记本密码', '输入密码', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputType: 'password',
    })
    const password = value || ''
    const ok = await verifyNotebookPassword(id, password)
    if (!ok) {
      ElMessage.error('密码错误')
      return { ok: false, notebook: nb }
    }
    storeBookAccess(id, password)
    return { ok: true, notebook: nb }
  } catch {
    return { ok: false, notebook: nb }
  }
}
