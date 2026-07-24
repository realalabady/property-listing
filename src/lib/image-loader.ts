// Custom next/image loader.
//
// Firebase Hosting's `frameworksBackend` adapter does not wire this app's
// `images.remotePatterns` into the Next.js image optimizer. As a result the
// production `/_next/image` endpoint rejects EVERY remote URL — including
// allow-listed hosts — with a 400 "url parameter is not allowed", so listing
// photos never render in production (they work in local `next dev`, where the
// optimizer reads next.config directly).
//
// Instead of relying on the optimizer, we bypass it: return each image's origin
// URL unchanged. Firebase Storage already serves these files through Google's
// CDN with long-lived caching, so we lose Next's on-the-fly resizing but gain
// images that actually load. (If per-size thumbnails become important later,
// install the Firebase "Resize Images" extension and append its size suffix
// here using the `width` argument.)
export default function firebaseImageLoader({
  src,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return src;
}
