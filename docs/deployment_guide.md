# Nexa Vercel Deployment & Custom Domain Guide

This guide explains how to deploy the Nexa platform to Vercel and configure your custom domain with wildcard support for multi-tenancy.

## 1. Vercel Deployment

1.  **Push your code to GitHub/GitLab/Bitbucket.**
2.  **Import the project to Vercel**:
    *   Go to [vercel.com/new](https://vercel.com/new).
    *   Select your repository.
3.  **Configure Settings**:
    *   **Framework Preset**: Vercel should automatically detect `Vite` or `Other`.
    *   **Build Command**: `npm run build`
    *   **Output Directory**: `.output` (Nitro/TanStack Start default)
4.  **Environment Variables**:
    *   Copy all variables from your local `.env` file to the Vercel Project Settings -> Environment Variables.
    *   Key variables include:
        *   `VITE_FIREBASE_API_KEY`
        *   `VITE_FIREBASE_AUTH_DOMAIN`
        *   `VITE_FIREBASE_PROJECT_ID`
        *   `VITE_FIREBASE_STORAGE_BUCKET`
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
        *   `VITE_FIREBASE_APP_ID`
5.  **Deploy**: Click **Deploy**.

## 2. Custom Domain & Wildcards

To support subdomains like `store1.yourdomain.com`, you must configure a Wildcard Domain.

1.  **Add the Domain**:
    *   Go to **Project Settings -> Domains**.
    *   Add your apex domain (e.g., `yourdomain.com`).
    *   Also add a wildcard domain: `*.yourdomain.com`.
2.  **Configure DNS**:
    *   Vercel will provide the nameservers or A/CNAME records.
    *   Update your domain registrar (e.g., Namecheap, GoDaddy) with these records.
    *   Ensure the `*` (wildcard) CNAME points to `cname.vercel-dns.com`.
3.  **Verification**:
    *   Once DNS propagates, any subdomain you access will be routed to your Nexa app.
    *   The `useTenant` hook will automatically extract the subdomain (e.g., `store1`) and fetch the corresponding store data from Firestore.

## 3. Deployment Troubleshooting

*   **500 Errors**: Check the Vercel **Function Logs**.
*   **Tenant Not Loading**: Ensure the `slug` in your Firestore `stores` collection matches the subdomain you are testing with.
*   **Build Failures**: Ensure you are using Node.js 18+ in Vercel settings.
