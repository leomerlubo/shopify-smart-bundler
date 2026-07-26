# Shopify Smart Bundler

A Vercel ready Shopify bundle application for creating bundle products from existing store SKUs.

## Included

• Shopify OAuth sign in foundation
• Manual product selection
• Automatic BNDL SKU generation
• Duplicate combination detection
• Bulk CSV draft import
• Downloadable CSV template
• Draft bundle workflow
• Shopify product image selection area
• Firebase client and Admin SDK configuration
• Encrypted Shopify access token storage in Firestore
• Responsive interface

## Deploy with Vercel

1. Import this repository into Vercel.
2. Keep the Root Directory at the repository root.
3. Add every variable from `.env.example` under Vercel Project Settings, Environment Variables.
4. Deploy the project.
5. Copy the final Vercel domain into `SHOPIFY_APP_URL`.

## Shopify Partner setup

Create an app in the Shopify Partner Dashboard and use these URLs:

Application URL

`https://YOUR-VERCEL-DOMAIN.vercel.app`

Allowed redirection URL

`https://YOUR-VERCEL-DOMAIN.vercel.app/api/auth/shopify/callback`

Use the Shopify Client ID for `SHOPIFY_API_KEY` and the Client secret for `SHOPIFY_API_SECRET`.

## Firebase

Create a Firebase project with Firestore enabled. Add the browser configuration values to the `NEXT_PUBLIC_FIREBASE_*` variables. Server credentials should only be stored in Vercel Environment Variables.

Firebase stores store installations, draft records, brand codes, import history, and image workflow status. Shopify access tokens are encrypted with AES 256 GCM before they are written to Firestore. Shopify remains the source of truth for product information and published bundle data.

## Current milestone

The interface, Shopify authentication routes, and encrypted Firebase installation storage are now in place. The product list currently uses sample products until the Shopify GraphQL product query is connected in the next backend milestone.

Never commit Shopify secrets, Firebase service credentials, access tokens, or private keys.
