import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
    // A list of all locales that are supported
    locales: ['ar', 'en'],

    // Used when no locale matches
    defaultLocale: 'ar',

    // Sub-path routing is used by default, but we can configure it 
    // to be hidden for the default locale if desired, but 
    // for this RTL default site, explicit /ar and /en is clear.
    // We'll keep default Next-intl behavior which usually prefixes.
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
    createNavigation(routing);
