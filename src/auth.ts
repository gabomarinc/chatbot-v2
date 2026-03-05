import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import bcrypt from "bcryptjs"

const signInSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma) as any,
    session: { strategy: "jwt" },
    providers: [
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                const parsedCredentials = signInSchema.safeParse(credentials)

                if (parsedCredentials.success) {
                    const { email, password } = parsedCredentials.data
                    const user = await prisma.user.findUnique({ where: { email } })

                    if (!user) return null

                    // Verify password hash
                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
                    if (passwordsMatch) {
                        // Update lastLoginAt
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { lastLoginAt: new Date() }
                        })

                        return {
                            id: user.id,
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            role: user.role,
                        };
                    }
                }

                return null
            },
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id
                token.role = user.role
                token.name = user.name || null
                token.email = user.email || null
                token.image = user.image || null
            }

            // Handle profile updates from updateSession()
            if (trigger === "update" && session) {
                if (session.name) token.name = session.name
                if (session.image) token.image = session.image
            }

            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
                session.user.role = token.role as any
                session.user.name = token.name as string
                session.user.email = token.email as string
                session.user.image = token.image as string
            }
            return session
        },
    },
})
