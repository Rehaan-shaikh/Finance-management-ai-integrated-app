import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'


// createRouteMatcher is a utility from @clerk/nextjs/server that takes an array of string patterns and returns a function.
// That returned function (in this case, isProtectedRoute) accepts a request object (or a pathname),
//  and returns true if the path matches any of the given patterns.

const isProtectedRoute = createRouteMatcher([
  //only this routes are protected
  //the (.*) at the end include any sub-paths after, e.g. /dashboard/settings
  "/dashboard(.*)",
  "/account(.*)",
  "/transaction(.*)",
]);


// Create base Clerk middleware
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  if (!userId && isProtectedRoute(req)) {
    const { redirectToSignIn } = await auth();
    return redirectToSignIn();
  }
});


export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}