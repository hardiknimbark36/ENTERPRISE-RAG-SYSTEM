import { clerkMiddleware } from "@clerk/nextjs/server";

// In the latest Clerk versions, ALL routes are public by default.
// This allows the tunnel to pass files through automatically without being blocked!
export default clerkMiddleware();

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};