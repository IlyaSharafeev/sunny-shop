import appleSignin from 'apple-signin-auth'
import { config } from '../config'

export interface ApplePayload {
  sub: string
  email?: string
}

export async function verifyAppleToken(identityToken: string): Promise<ApplePayload> {
  const claims = await appleSignin.verifyIdToken(identityToken, {
    audience: config.apple.clientId,
    ignoreExpiration: false,
  })
  return {
    sub: claims.sub,
    email: claims.email,
  }
}
