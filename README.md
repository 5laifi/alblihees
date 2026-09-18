This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Invoices & Quotations (admin)

An Arabic-first builder for invoices and quotations lives at `/ar/admin/invoices`
(sidebar: "Invoices & Quotes"). It offers a three-step wizard with a live A4
preview, three branded templates, saved invoices and quotations, payment
tracking, quotation-to-invoice conversion, and PDF export or printing.

**Storage**

- Production uses the Supabase tables created by `supabase-invoices.sql`. They
  have Row Level Security enabled with no public policies, so the server needs
  `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`).
- In development, when that key or the tables are missing, data is kept in
  `.data/invoices.json` (gitignored) so the feature can be previewed locally.
  The admin page shows which storage is active.

**Numbering**

Document numbers cannot be typed or edited. The server assigns the next number
in one shared sequence when a document is saved, and that same number appears on
the printed document and in the admin list. Converting a quotation to an invoice
keeps the quotation's number. The "numbering start" setting only sets a floor.

**Settings**

Bank details, the cheque payee, the liaison officer, the QR link and the payment
terms are entered in the Settings tab and stored in the database. They are
deliberately not hardcoded, because this repository is public.
