import { OAuth2Client } from 'google-auth-library'
import { config } from '../config'

const client = new OAuth2Client(config.google.clientId)

export interface GooglePayload {
  sub: string
  email?: string
  name?: string
  picture?: string
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: config.google.clientId,
  })
  const payload = ticket.getPayload()
  if (!payload) throw new Error('Invalid Google token: no payload')
  return {
    sub: payload.sub,
    email: payload.email ?? undefined,
    name: payload.name ?? undefined,
    picture: payload.picture ?? undefined,
  }
}
