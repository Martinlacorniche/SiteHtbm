import HtmlLang from "@/components/HtmlLang";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HtmlLang lang="en" />
      {children}
    </>
  );
}
