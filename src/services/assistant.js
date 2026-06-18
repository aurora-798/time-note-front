const SEARCH_PREFIX = /^\[Search:\s*(.*?)\]$/
const THINK_PREFIX = /^\[Think:\s*(.*?)\]$/
const CANVAS_PREFIX = /^\[Canvas:\s*(.*?)\]$/
const VOICE_PREFIX = /^\[Voice message - (\d+) seconds\]$/

function parseUserMessage(text) {
  let mode = 'normal'
  let content = text.trim()

  const searchMatch = content.match(SEARCH_PREFIX)
  if (searchMatch) {
    mode = 'search'
    content = searchMatch[1] || ''
  } else {
    const thinkMatch = content.match(THINK_PREFIX)
    if (thinkMatch) {
      mode = 'think'
      content = thinkMatch[1] || ''
    } else {
      const canvasMatch = content.match(CANVAS_PREFIX)
      if (canvasMatch) {
        mode = 'canvas'
        content = canvasMatch[1] || ''
      } else {
        const voiceMatch = content.match(VOICE_PREFIX)
        if (voiceMatch) {
          mode = 'voice'
          content = `语音消息（${voiceMatch[1]} 秒）`
        }
      }
    }
  }

  return { mode, content }
}

function buildMockReply({ mode, content, hasImages }) {
  const topic = content || '你的问题'
  const imageNote = hasImages
    ? '\n\n我已收到你附带的图片，从画面来看色调柔和、构图舒适，很适合作为日记插图或封面灵感。'
    : ''

  switch (mode) {
    case 'search':
      return (
        `🔍 联网检索摘要（模拟）\n\n` +
        `关于「${topic}」，我找到了以下参考信息：\n` +
        `1. 日记写作技巧：记录具体感受比罗列事件更能唤起回忆。\n` +
        `2. 情绪管理：把烦恼写下来，大脑会更容易放下它。\n` +
        `3. 时光笔录社区：许多用户喜欢在睡前花 5 分钟写一段今日小结。\n\n` +
        `以上内容为本地 mock，后端 Search 模式接入后将返回真实检索结果。` +
        imageNote
      )
    case 'think':
      return (
        `💭 深度思考（模拟）\n\n` +
        `让我仔细想一想「${topic}」……\n\n` +
        `从日记的角度来看，这件事值得记录的原因可能有三点：它触动了你的情绪、` +
        `它连接了你生活中的某个主题、或者它让你对未来有了新的期待。\n\n` +
        `如果写成日记，可以尝试：先描述场景，再写内心独白，最后留一句给未来的自己。` +
        imageNote
      )
    case 'canvas':
      return (
        `🎨 创作画布（模拟）\n\n` +
        `基于「${topic}」，这里有一份创作草稿：\n\n` +
        `> 标题建议：《${topic.slice(0, 12) || '今日碎片'}》\n` +
        `> 开篇：那天下午的光，落在书页上像一层薄薄的糖霜。\n` +
        `> 中段：我把${topic ? `「${topic}」` : '这件事'}写进本子里，字句之间藏着没说出口的话。\n` +
        `> 结尾：合上日记，世界安静了一格。\n\n` +
        `后端 Canvas 模式接入后，可在此生成更完整的可视化创作内容。` +
        imageNote
      )
    case 'voice':
      return (
        `🎙️ 语音消息（模拟）\n\n` +
        `我收到了你的 ${content}。虽然暂时无法转写语音内容，但你可以先用文字告诉我核心想法，` +
        `我会帮你整理成日记风格的文字。\n\n` +
        `提示：后端语音识别接口接入后，这里将显示转写文本与智能回复。` +
        imageNote
      )
    default:
      return (
        `你好！关于「${topic}」，这是我的建议：\n\n` +
        `写日记时不必追求完美，真实比华丽更重要。你可以从三个小问题开始：` +
        `今天最开心的一件事是什么？有没有让你犹豫的瞬间？如果给今天打一个标题，会是什么？\n\n` +
        `随时告诉我你想润色、扩写或总结的内容，我很乐意帮忙。` +
        imageNote
      )
  }
}

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    })
  })
}

/**
 * 模拟流式 AI 回复
 * @param {{ text: string, files?: File[] }} payload
 * @param {{ onChunk: (chunk: string) => void, signal?: AbortSignal }} options
 */
export async function mockAssistantStream({ text, files = [] }, { onChunk, signal } = {}) {
  const { mode, content } = parseUserMessage(text)
  const hasImages = files.length > 0
  const draft = buildMockReply({ mode, content, hasImages })

  const initialDelay = 300 + Math.floor(Math.random() * 300)
  await delay(initialDelay, signal)

  let i = 0
  const chunkSize = 2 + Math.floor(Math.random() * 2)

  while (i < draft.length) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

    const chunk = draft.slice(i, i + chunkSize)
    onChunk(chunk)
    i += chunkSize

    await delay(16 + Math.floor(Math.random() * 8), signal)
  }
}

export function detectMessageMode(text) {
  return parseUserMessage(text).mode
}
