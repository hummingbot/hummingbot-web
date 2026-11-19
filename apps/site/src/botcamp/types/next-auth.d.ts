import { DefaultSession, DefaultUser } from "next-auth"
import { DefaultJWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      isMember: boolean
    } & DefaultSession["user"]
  }

  interface User extends DefaultUser {
    role: string
    isMember: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string
    role: string
    isMember: boolean
  }
}
