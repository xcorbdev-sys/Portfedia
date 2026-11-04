import Link from "next/link";
import { Bell, ClipboardCheck, LogIn, LogOut, Menu, Plus, Search, Settings, ShieldCheck, User } from "lucide-react";
import { unreadCount } from "@/lib/notifications";
import { inboxCountForPage } from "@/lib/feedback";
import { Inbox } from "lucide-react";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { countPendingApplications, getPersonPageOf } from "@/lib/pages";
import { logoutAction } from "@/lib/actions/auth";
import { Thumb } from "./ui";
import { MenuCloser } from "./client";
import { ResendVerificationButton } from "./forms/AuthForms";

// #60: the mobile menu also lists pages that only appear in the desktop footer
const MOBILE_EXTRA = [
  { href: "/jobs", label: "Jobs" },
  { href: "/events", label: "Events" },
  { href: "/investors", label: "Investors" },
  { href: "/help", label: "Help" },
];

const NAV = [
  { href: "/people", label: "People" },
  { href: "/companies", label: "Companies" },
  { href: "/sectors", label: "Sectors" },
  { href: "/collections", label: "Collections" },
];

/** The Portfedia mark: a serif P with a turning page, on a blue tile. */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="brand__mark" width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="pf-mark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e5bf0" />
          <stop offset="1" stopColor="#0a3fd2" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="10" fill="url(#pf-mark)" />
      <g transform="translate(2.4 1.9) scale(0.88)">
        <path fill="#fff" fillRule="evenodd" d="M9 8.6H22.4C28.3 8.6 31.4 11.7 31.4 16.1C31.4 20.6 28.3 23.7 22.4 23.7H18.6V31.4H9V29.6L11.6 29V11L9 10.4Z M18.6 10.9V21.4H21.5C24 21.4 25.1 19.6 25.1 16.1C25.1 12.7 24 10.9 21.5 10.9Z" />
        <path fill="#a9c6ff" d="M18.6 31.4C22.2 27 26.4 24.4 31.4 22.8V29C31.4 30.4 30.4 31.4 29 31.4Z" />
        <path fill="#e8efff" d="M18.6 31.4C21.6 26.2 26 22.6 31.4 20.4V21.9C26.2 24 22 27.4 18.6 31.4Z" />
        <path fill="none" stroke="#2f6df5" strokeWidth="0.9" d="M18.8 31.2C22.2 27.2 26.3 24.2 31.4 22.4" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Portfedia home">
      <BrandMark />
      <span className="brand__word">Portfedia</span>
    </Link>
  );
}

export async function Header({ showSearch = true }: { showSearch?: boolean }) {
  const user = await getCurrentUser();
  // #38: everything the header needs, in parallel (one round trip instead of five sequential ones)
  const [myPage, pending, unread] = user
    ? await Promise.all([getPersonPageOf(user.id), isModerator(user) ? countPendingApplications() : Promise.resolve(0), unreadCount(user.id)])
    : [null, 0, 0];
  const inbox = myPage ? await inboxCountForPage(myPage._id) : 0;
  return (
    <header className="site-header">
      <MenuCloser />
      <div className="container site-header__inner">
        <Brand />
        <nav className="main-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
        </nav>
        <div className="header-right">
          {showSearch && (
            <form action="/search" className="header-search" role="search">
              <Search className="icon" aria-hidden="true" />
              <label htmlFor="hq" className="visually-hidden">Search Portfedia</label>
              <input id="hq" name="q" type="search" placeholder="Search Portfedia..." autoComplete="off" />
              <input type="hidden" name="go" value="1" />
            </form>
          )}
          {user && isModerator(user) && (
            <Link href="/admin" className="btn btn--sm admin-btn" aria-label={pending ? `Admin panel (${pending} applications waiting)` : "Admin panel"}>
              <ShieldCheck size={16} aria-hidden="true" />
              <span className="admin-btn__label">Admin</span>
              {pending > 0 && <span className="admin-btn__count">{pending > 99 ? "99+" : pending}</span>}
            </Link>
          )}
          {user && (
            <Link href="/notifications" className="bell" aria-label={unread ? `Notifications (${unread} unread)` : "Notifications"}>
              <Bell size={19} />
              {unread > 0 && <span className="bell__count">{unread > 99 ? "99+" : unread}</span>}
            </Link>
          )}
          {user ? (
            <details className="menu">
              <summary className="avatar-btn" aria-label="Account menu">
                <Thumb image={myPage?.image ?? null} name={user.name} variant="round" className="avatar-inner" />
              </summary>
              <div className="menu__panel">
                <div className="menu__head">
                  <b>{user.name}</b>
                  <div className="muted small">{user.email}</div>
                </div>
                {isModerator(user) && (
                  <Link href="/admin">
                    <ClipboardCheck size={16} /> Admin panel
                    {pending > 0 && <span className="menu__badge">{pending}</span>}
                  </Link>
                )}
                {myPage ? (
                  <Link href={`/${myPage.slug}`}>
                    <User size={16} /> My profile
                    {myPage.status === "pending" && <span className="status-pill status-pill--pending" style={{ marginLeft: "auto" }}>In review</span>}
                    {myPage.status === "rejected" && <span className="status-pill status-pill--rejected" style={{ marginLeft: "auto" }}>Action needed</span>}
                  </Link>
                ) : (
                  <Link href="/create"><User size={16} /> Create my profile</Link>
                )}
                {myPage && (
                  <Link href="/inbox">
                    <Inbox size={16} /> Inbox
                    {inbox > 0 && <span className="menu__badge">{inbox}</span>}
                  </Link>
                )}
                <Link href="/create"><Plus size={16} /> New profile</Link>
                <Link href="/account"><Settings size={16} /> Account</Link>
                <form action={logoutAction}>
                  <button type="submit"><LogOut size={16} /> Log out</button>
                </form>
              </div>
            </details>
          ) : (
            <>
              <Link href="/login" className="btn btn--sm header-login">Log in</Link>
              <Link href="/signup" className="btn btn--sm btn--primary">Sign up</Link>
            </>
          )}
          <details className="menu menu-toggle">
            <summary className="btn btn--icon btn--ghost" aria-label="Menu" style={{ listStyle: "none" }}>
              <Menu size={20} />
            </summary>
            <div className="menu__panel">
              {!user && <Link href="/login" className="menu-login"><LogIn size={16} /> Log in</Link>}
              <Link href="/search"><Search size={16} /> Search</Link>
              {user && isModerator(user) && (
                <Link href="/admin">
                  <ShieldCheck size={16} /> Admin panel
                  {pending > 0 && <span className="menu__badge">{pending}</span>}
                </Link>
              )}
              {[...NAV, ...MOBILE_EXTRA].map((n) => (
                <Link key={n.href} href={n.href}>{n.label}</Link>
              ))}
            </div>
          </details>
        </div>
      </div>
      {user && !user.emailVerified && (
        <div className="verify-bar" role="status">
          <div className="container">
            <span>
              <b>Confirm your email address.</b> We sent a link to {user.email}. You need it to submit your profile or edit pages.
            </span>
            <ResendVerificationButton />
          </div>
        </div>
      )}
    </header>
  );
}
