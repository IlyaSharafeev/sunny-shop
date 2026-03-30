declare module 'apple-signin-auth' {
  interface AppleIdTokenClaims {
    sub: string
    email?: string
    aud: string | string[]
    iat: number
    exp: number
    [key: string]: unknown
  }

  interface VerifyAppleIdTokenOptions {
    audience?: string | string[]
    ignoreExpiration?: boolean
  }

  const appleSignin: {
    verifyIdToken(
      idToken: string,
      options?: VerifyAppleIdTokenOptions
    ): Promise<AppleIdTokenClaims>
  }

  export = appleSignin
}
