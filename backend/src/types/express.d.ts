import type { AuthContext } from './auth-context';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
      auth?: AuthContext;
    }
  }
}

export {};
