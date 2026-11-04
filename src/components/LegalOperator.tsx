import { operator } from "@/lib/legal";

/** Operator identity block used on the legal pages (labels in English or Turkish). */
export function LegalOperator({ lang = "en" }: { lang?: "en" | "tr" }) {
  const o = operator();
  const L = lang === "tr"
    ? { name: "Unvan", address: "Adres", email: "E-posta", phone: "Telefon", mersis: "MERSİS No", tax: "Vergi dairesi ve no", registry: "Ticaret sicili", kep: "KEP adresi" }
    : { name: "Operator", address: "Address", email: "Email", phone: "Phone", mersis: "MERSİS number", tax: "Tax office and number", registry: "Trade registry", kep: "Registered email (KEP)" };
  const rows: [string, React.ReactNode][] = [
    [L.name, o.name],
    [L.address, o.address],
    [L.email, <a key="e" href={`mailto:${o.email}`}>{o.email}</a>],
    [L.phone, o.phone],
    [L.mersis, o.mersis],
    [L.tax, o.tax],
    [L.registry, o.registry],
    [L.kep, o.kep],
  ];
  return (
    <table>
      <tbody>
        {rows.filter(([, v]) => v).map(([k, v]) => (
          <tr key={k}><th scope="row" style={{ textAlign: "left", width: "38%" }}>{k}</th><td>{v}</td></tr>
        ))}
      </tbody>
    </table>
  );
}
