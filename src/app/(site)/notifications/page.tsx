import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Bell, Building2, FileText, UserPlus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications";
import { formatDateTime } from "@/lib/site";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

const ICONS: Record<string, React.ReactNode> = {
  application: <FileText size={18} />,
  position: <BadgeCheck size={18} />,
  follower: <UserPlus size={18} />,
  page_update: <Bell size={18} />,
  claimed: <Building2 size={18} />,
};

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await listNotifications(user.id);
  return (
    <div className="narrow">
      <h1>Notifications</h1>
      {items.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>No notifications yet. Follow people and companies to hear about their updates.</div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => (
            <li key={n.id} className={n.unread ? "is-unread" : undefined}>
              <Link href={n.href}>
                <span className="notif-icon">{ICONS[n.type] ?? <Bell size={18} />}</span>
                <span>
                  {n.text}
                  <small>{formatDateTime(n.createdAt)}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
