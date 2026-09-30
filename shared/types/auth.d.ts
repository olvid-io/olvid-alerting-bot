// Module augmentation for nuxt-auth-utils. The module ships `User` as
// an intentionally empty interface — we point it at our shared `User`
// so `useUserSession().user` is fully typed on both client and server.
//
// Docs: https://github.com/atinux/nuxt-auth-utils#session-data

import type { User as AppUser } from "./user";

declare module "#auth-utils" {
  interface User extends AppUser {}
  interface UserSession {
    user: User;
  }
}

export {};
