import NextAuth, { NextAuthConfig } from "next-auth"
import { SupabaseAdapter } from "@auth/supabase-adapter"
import Github from "next-auth/providers/github"
import Google from "next-auth/providers/google"

export const config: NextAuthConfig = {
    providers: [Github, Google],
    adapter: SupabaseAdapter({
        url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      }),
    basePath: "/api/auth",
    callbacks: {
        authorized({ request, auth}) {
            try {
                const { pathname } = request.nextUrl
                if (pathname.startsWith("/dashboard")) {
                    if (!auth) {
                        return Response.redirect(new URL("/login", request.nextUrl.origin));
                    }
                    return true;
                }
                if (pathname === "/login" || pathname === "/register") {
                    if (auth) {
                        return Response.redirect(new URL("/", request.nextUrl.origin));
                    }
                }
                return true
            } catch (error) {
                console.log(error)
                return false
            }
        },
        jwt({ token, trigger, session }) {
            if (trigger === "update") token.name = session.user.name;
            return token;
        }
    }
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)