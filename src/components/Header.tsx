import Link from "next/link";
import { Bell, ClipboardCheck, LogOut, Menu, Plus, Search, Settings, User } from "lucide-react";
import { unreadCount } from "@/lib/notifications";
import { inboxCountForPage } from "@/lib/feedback";
import { Inbox } from "lucide-react";
import { getCurrentUser, isModerator } from "@/lib/auth";
import { countPendingApplications, getPersonPageOf } from "@/lib/pages";
import { logoutAction } from "@/lib/actions/auth";
import { Thumb } from "./ui";
import { MenuCloser } from "./client";
import { ResendVerificationButton } from "./forms/AuthForms";

const NAV = [
  { href: "/people", label: "People" },
  { href: "/companies", label: "Companies" },
  { href: "/sectors", label: "Sectors" },
  { href: "/collections", label: "Collections" },
];

export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Portfedia home">
      <span className="brand__mark" aria-hidden="true">P</span>
      Portfedia
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
                    <ClipboardCheck size={16} /> Review applications
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
              <Link href="/login" className="btn btn--sm">Log in</Link>
              <Link href="/signup" className="btn btn--sm btn--primary">Sign up</Link>
            </>
          )}
          <details className="menu menu-toggle">
            <summary className="btn btn--icon btn--ghost" aria-label="Menu" style={{ listStyle: "none" }}>
              <Menu size={20} />
            </summary>
            <div className="menu__panel">
              <Link href="/search"><Search size={16} /> Search</Link>
              {NAV.map((n) => (
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
