import { auth } from "@/lib/auth";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Public: sign-in, static files, and the app icon + manifest, which phones
  // fetch without a session when adding the app to the home screen.
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|login).*)",
  ],
};
