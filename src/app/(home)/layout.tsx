import { Header } from "@/components/Header";
import { termsGate } from "@/components/TermsGate";

export default async function HomeLayout({ children }: { children: React.ReactNode }) {
  await termsGate(); // #94: changed terms must be accepted first
  return (
    <>
      <Header showSearch={false} />
      <main>{children}</main>
    </>
  );
}
