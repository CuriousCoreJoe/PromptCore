Step 1: Install the SEO Library

Run this in your terminal to install the "Helmet" manager (it injects tags into the <head> of your page dynamically).

Bash
bun add react-helmet-async
Step 2: Setup the Provider (In main.tsx)

You need to wrap your entire app so the helmet works. Open your src/main.tsx (or src/index.tsx) and add the HelmetProvider.

TypeScript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async'; // <--- Import this

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider> {/* <--- Wrap App with this */}
      <App />
    </HelmetProvider>
  </React.StrictMode>,
)


Step 3: The App Metadata (src/pages/Dashboard.tsx)

For your App/Dashboard pages, you generally want it to look cleaner and less "marketing" heavy. You don't need a new component; just add the <Helmet> block inside your existing Dashboard (or Main App) component, just like you did above.

Add this to the top of your Dashboard component:

TypeScript
import { Helmet } from 'react-helmet-async';

export default function Dashboard() {
  return (
    <div className="...">
      {/* --- APP METADATA --- */}
      <Helmet>
        <title>Dashboard | Prompt Origin</title>
        <meta name="robots" content="noindex" /> {/* Optional: Hide private app pages from Google */}
      </Helmet>
      
      {/* Rest of your dashboard code... */}
    </div>
  )
}
Step 5: robots.txt

Create a new file in your public folder named robots.txt. This tells Google it can scan your Landing Page, but asks it nicely to ignore your private App/API routes.

File: public/robots.txt

Plaintext
User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/

Sitemap: https://usepromptorigin.com/sitemap.xml
Step 6: sitemap.xml

Create a new file in your public folder named sitemap.xml. Since you have a simple structure, we can hardcode this.

File: public/sitemap.xml

XML
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://usepromptorigin.com/</loc>
    <lastmod>2026-01-20</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://usepromptorigin.com/login</loc>
    <lastmod>2026-01-20</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://usepromptorigin.com/signup</loc>
    <lastmod>2026-01-20</lastmod>
    <priority>0.8</priority>
  </url>
</urlset>