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

// POST /api/webhooks/netlify
router.post('/netlify', async (req: Request, res: Response): Promise<void> => {
  if (!checkSecret(req, res)) return

  const body = req.body as {
    state?: string
    site_name?: string
    branch?: string
    deploy_time?: number
    error_message?: string
    commit_ref?: string
    title?: string
  }

  const { state, site_name, branch, deploy_time, error_message, commit_ref, title } = body
  const duration = deploy_time ? `${deploy_time}s` : '—'
  const shortSha = commit_ref ? commit_ref.slice(0, 7) : '—'

  let message = ''

  if (state === 'ready') {
    message =
      `✅ <b>Netlify deployed</b>\n` +
      `📦 ${site_name ?? 'unknown'} · ${branch ?? 'main'}\n` +
      `⏱ ${duration} · <code>${shortSha}</code>`
    if (title) message += `\n💬 ${title}`
  } else if (state === 'error') {
    message =
      `🔴 <b>Netlify build FAILED</b>\n` +
      `📦 ${site_name ?? 'unknown'} · ${branch ?? 'main'}\n` +
      `⏱ ${duration} · <code>${shortSha}</code>`
    if (error_message) message += `\n❗ ${error_message}`
  } else {
    // building / enqueued — ignore
    res.json({ ok: true })
    return
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
