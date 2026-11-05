/** "Deleted. Undo" (#44): restores a deleted item within a day. */
export function UndoNotice({ text, id, action, fields = {} }: { text: string; id: string; action: (fd: FormData) => Promise<void>; fields?: Record<string, string> }) {
  return (
    <form action={action} className="notice notice--ok undo-notice">
      <span>{text}</span>
      <input type="hidden" name="id" value={id} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="btn btn--sm">Undo</button>
    </form>
  );
}
