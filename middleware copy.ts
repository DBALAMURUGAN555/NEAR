import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: ["/", "/about", "/contact", "/sign-in", "/sign-up", "/api/public(.*)"],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: ["/api/webhook(.*)"],
  // Automatically redirect users to sign-in page if they are not signed in
  afterAuth(auth, req, evt) {
    // Handle users who aren't authenticated
    if (!auth.userId && !auth.isPublicRoute) {
      const signInUrl = new URL('/sign-in', req.url)
      return Response.redirect(signInUrl)
    }

    // Redirect logged in users to organization selection page if they are not active in an organization
    if (auth.userId && !auth.orgId && req.nextUrl.pathname !== "/org-selection" && !auth.isPublicRoute) {
      const orgSelection = new URL('/org-selection', req.url)
      return Response.redirect(orgSelection)
    }
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
