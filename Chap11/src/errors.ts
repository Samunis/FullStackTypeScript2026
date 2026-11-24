
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export type TokenErrorCode = 'INVALID_REFRESH_TOKEN' | 'TOKEN_REVOKED';


export class TokenError extends Error {
  constructor(public readonly code: TokenErrorCode) {
    super(code);
    this.name = 'TokenError';
  }
}
