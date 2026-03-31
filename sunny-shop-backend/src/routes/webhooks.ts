import { Router, Request, Response } from 'express'

const router = Router()

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

async function sendTelegram(text: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) return
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })
}

function checkSecret(req: Request, res: Response): boolean {
  const secret = req.query['secret']
  if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

// POST /api/webhooks/vercel
router.post('/vercel', async (req: Request, res: Response): Promise<void> => {
  if (!checkSecret(req, res)) return

  const body = req.body as {
    type?: string
    payload?: {
      deployment?: {
        name?: string
        url?: string
        meta?: {
          githubCommitMessage?: string
          githubCommitAuthorName?: string
          githubCommitRef?: string
          githubCommitSha?: string
        }
      }
    }
  }

  const type = body.type
  if (!type) { res.json({ ok: true }); return }

  // Only notify on terminal events
  if (!['deployment.succeeded', 'deployment.error', 'deployment.canceled'].includes(type)) {
    res.json({ ok: true })
    return
  }

  const dep = body.payload?.deployment
  const name = dep?.name ?? 'unknown'
  const branch = dep?.meta?.githubCommitRef ?? 'main'
  const commitMsg = dep?.meta?.githubCommitMessage ?? ''
  const author = dep?.meta?.githubCommitAuthorName ?? ''
  const sha = dep?.meta?.githubCommitSha?.slice(0, 7) ?? ''

  let message = ''
  if (type === 'deployment.succeeded') {
    message = `✅ <b>Vercel deployed</b>\n📦 ${name} · ${branch}`
    if (sha) message += ` · <code>${sha}</code>`
    if (commitMsg) message += `\n💬 ${commitMsg}`
    if (author) message += ` <i>(${author})</i>`
  } else if (type === 'deployment.error') {
    message = `🔴 <b>Vercel build FAILED</b>\n📦 ${name} · ${branch}`
    if (sha) message += ` · <code>${sha}</code>`
    if (commitMsg) message += `\n💬 ${commitMsg}`
    if (author) message += ` <i>(${author})</i>`
  } else {
    message = `⚠️ <b>Vercel deployment canceled</b>\n📦 ${name} · ${branch}`
  }

  await sendTelegram(message)
  res.json({ ok: true })
})

// POST /api/webhooks/railway
router.post('/railway', async (req: Request, res: Response): Promise<void> => {
  if (!checkSecret(req, res)) return

  const body = req.body as {
    type?: string
    project?: { name?: string }
    service?: { name?: string }
    environment?: { name?: string }
    deployment?: {
      status?: string
      meta?: {
        commitMessage?: string
        commitAuthor?: string
      }
    }
  }

  const status = body.deployment?.status
  if (!status) { res.json({ ok: true }); return }

  // Only notify on terminal states
  if (!['SUCCESS', 'FAILED', 'CRASHED'].includes(status)) {
    res.json({ ok: true })
    return
  }

  const projectName = body.project?.name ?? 'unknown'
  const serviceName = body.service?.name ?? ''
  const envName = body.environment?.name ?? 'production'
  const commitMsg = body.deployment?.meta?.commitMessage ?? ''
  const commitAuthor = body.deployment?.meta?.commitAuthor ?? ''

  const nameStr = serviceName ? `${projectName} / ${serviceName}` : projectName

  let message = ''
  if (status === 'SUCCESS') {
    message =
      `✅ <b>Railway deployed</b>\n` +
      `📦 ${nameStr} · ${envName}`
    if (commitMsg) message += `\n💬 ${commitMsg}`
    if (commitAuthor) message += ` <i>(${commitAuthor})</i>`
  } else {
    const icon = status === 'CRASHED' ? '💥' : '🔴'
    message =
      `${icon} <b>Railway ${status}</b>\n` +
      `📦 ${nameStr} · ${envName}`
    if (commitMsg) message += `\n💬 ${commitMsg}`
    if (commitAuthor) message += ` <i>(${commitAuthor})</i>`
  }

  await sendTelegram(message)
  res.json({ ok: true })
})

export default router
