import Link from "next/link";
import { congratsAction, deleteWinAction } from "@/lib/actions/wins";
import { WIN_KINDS, type WinRow } from "@/lib/wins";
import { Thumb } from "./ui";
import { formatDate } from "@/lib/site";

/** Wins wall cards (#93), used on /wins and on profiles. */
export function WinsList({ items, back, signedIn, showPerson = true }: { items: WinRow[]; back: string; signedIn: boolean; showPerson?: boolean }) {
  return (
    <ul className="wins">
      {items.map((w) => (
        <li key={w.id} className="win" id={`win-${w.id}`}>
          <span className="win__emoji" aria-hidden="true">{WIN_KINDS[w.kind].emoji}</span>
          <div className="win__body">
            {showPerson && (
              <Link href={`/${w.person.slug}`} className="win__person">
                <Thumb image={w.person.image ? { key: "", url: w.person.image } : null} name={w.person.title} />
                <span>
                  <b>{w.person.title}</b>
                  {w.person.subtitle && <small>{w.person.subtitle}</small>}
                </span>
              </Link>
            )}
            <p className="win__kind">{WIN_KINDS[w.kind].label}</p>
            {w.text && <p className="win__text">{w.text}</p>}
            <div className="win__foot">
              <time>{formatDate(w.createdAt)}</time>
              {w.congrats > 0 && <span>🎉 {w.congrats} congrat{w.congrats === 1 ? "" : "s"}</span>}
              {!w.mine &&
                (signedIn ? (
                  <form action={congratsAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="back" value={`${back}#win-${w.id}`} />
                    <button className={`btn btn--sm${w.congratulated ? " btn--active" : ""}`} type="submit">{w.congratulated ? "✓ Congratulated" : "Congratulate"}</button>
                  </form>
                ) : (
                  <Link className="btn btn--sm" href={`/login?next=${encodeURIComponent(back)}`}>Congratulate</Link>
                ))}
              {w.mine && (
                <form action={deleteWinAction}>
                  <input type="hidden" name="id" value={w.id} />
                  <button className="btn btn--sm btn--ghost" type="submit">Delete</button>
                </form>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
