import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { listEvents } from "@/lib/pages";
import { formatDate } from "@/lib/site";
import { Breadcrumbs, Thumb } from "@/components/ui";
import { ListFilters } from "@/components/ListFilters";
import { Pagination, paginate } from "@/components/Pagination";
import { requireFeature } from "@/lib/features";

const norm = (s: string) => s.toLocaleLowerCase("en-US").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");


export const metadata: Metadata = { title: "Events", description: "Conferences, summits and meetups on Portfedia, with their speakers and sponsors." };

type EventRow = Awaited<ReturnType<typeof listEvents>>["upcoming"][number];

function EventList({ items }: { items: EventRow[] }) {
  return (
    <ul className="result-list card" style={{ marginTop: 12 }}>
      {items.map((e) => (
        <li key={e.card.slug}>
          <Link href={`/org/${e.card.slug}`} className="result">
            <Thumb image={e.card.image} name={e.card.title} variant="logo" />
            <span style={{ minWidth: 0 }}>
              <span className="result__name">{e.card.title}</span>
              <span className="result__sub">
                {[e.start ? formatDate(e.start) + (e.end && e.end.getTime() !== e.start.getTime() ? ` – ${formatDate(e.end)}` : "") : "Date to be announced", e.city].filter(Boolean).join(" · ")}
              </span>
              {e.card.summary && <span className="result__desc">{e.card.summary}</span>}
            </span>
            <span className="pill">Event</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ q?: string; city?: string; page?: string }> }) {
  await requireFeature("events"); // the section can be switched off in Admin → Sections
  await connection();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const city = (sp.city ?? "").trim().slice(0, 80);
  const all = await listEvents();
  const cities = [...new Set([...all.upcoming, ...all.past].map((e) => e.city).filter(Boolean))].sort();
  const keep = (e: EventRow) => (!q || norm(e.card.title).includes(norm(q))) && (!city || e.city === city);
  const upcoming = all.upcoming.filter(keep);
  // Upcoming events are few and all shown; past events are paged
  const { items: past, page, pages } = paginate(all.past.filter(keep), parseInt(sp.page ?? "1", 10) || 1);
  const params = new URLSearchParams(Object.entries({ q, city }).filter(([, v]) => v));
  const base = params.size ? `/events?${params}` : "/events";
  return (
    <div className="container" style={{ paddingBottom: 56, maxWidth: 980 }}>
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Events" }]} />
      <h1 className="section__title" style={{ marginTop: 10 }}>Events</h1>
      <p className="muted">Conferences, summits and meetups. Speakers link their talks from their own profiles.</p>
      <ListFilters action="/events" q={q} placeholder="Search events" selects={[{ name: "city", label: "All cities", value: city, options: cities.map((c) => ({ value: c, label: c })) }]} />
      <h2 className="card__title" style={{ marginTop: 24 }}>Upcoming</h2>
      {upcoming.length ? <EventList items={upcoming} /> : <div className="empty">No upcoming events yet.</div>}
      {past.length > 0 && (
        <>
          <h2 className="card__title" style={{ marginTop: 28 }}>Past events</h2>
          <EventList items={past} />
          <Pagination page={page} pages={pages} baseHref={base} />
        </>
      )}
      <p className="small muted" style={{ marginTop: 20 }}>
        Organizing an event? <Link href="/create">Create its page</Link> and choose “Event” as the category.
      </p>
    </div>
  );
}
