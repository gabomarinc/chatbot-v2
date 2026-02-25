import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/register")
    const isPublicApiRoute = req.nextUrl.pathname.startsWith("/api/webhooks") || req.nextUrl.pathname.startsWith("/api/widget")
    const isWidgetPage = req.nextUrl.pathname.startsWith("/widget") || req.nextUrl.pathname.startsWith("/test-agent")

    // Allow public API and widget pages
    if (isPublicApiRoute || isWidgetPage) {
        return NextResponse.next()
    }

    // Redirect to dashboard if trying to access login/register while logged in
    if (isAuthPage && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }

    // Redirect to login if trying to access protected routes while logged out
    if (!isLoggedIn && !isAuthPage) {
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }

    return NextResponse.next()
})

export const config = {
    matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
