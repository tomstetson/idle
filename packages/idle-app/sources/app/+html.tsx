import { ScrollViewStyleReset } from 'expo-router/html';
import '../unistyles';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />

        {/*
          Content-Security-Policy (A5-3 remediation).
          - 'unsafe-inline' scripts: Expo Router injects an inline hydration script during static export.
          - 'unsafe-inline' styles: React Native Web applies all styles inline on elements;
            Expo's ScrollViewStyleReset and our own background CSS also use dangerouslySetInnerHTML.
          - connect-src: API server (HTTPS + WSS for Socket.IO), Expo OTA updates, PostHog analytics.
          - worker-src blob: Skia's canvaskit WASM may spawn blob workers.
          If the app is ever served behind a reverse proxy (nginx/Cloudflare), prefer HTTP headers over this
          meta tag — headers support report-uri and are harder to strip via XSS.
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={[
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "connect-src 'self' https://idle-api.northglass.io wss://idle-api.northglass.io https://u.expo.dev https://us.i.posthog.com",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; ')}
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* PWA meta tags for iOS Add to Home Screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Idle" />
        <meta name="theme-color" content="#18171C" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
  /* Suppress default tap highlight on mobile WebKit browsers */
  -webkit-tap-highlight-color: transparent;
  /* Prevent text selection and callout menus on interactive elements */
  -webkit-touch-callout: none;
  /* Safe area padding for notch/Dynamic Island/home indicator */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}
/* Prevent user-select on non-text interactive elements */
button, [role="button"], [data-pressable] {
  -webkit-user-select: none;
  user-select: none;
}`;
