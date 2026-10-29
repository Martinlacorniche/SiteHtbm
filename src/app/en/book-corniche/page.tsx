import type { Metadata } from "next";
import { pageCorniche } from "../../reserver-corniche/vue";
import { alternatesFor } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book Best Western Plus La Corniche — Toulon, facing the sea",
  description: "Book direct at Best Western Plus La Corniche, Toulon Mourillon: €10 off per night on the public rate, breakfast available.",
  alternates: alternatesFor("/en/book-corniche"),
};

export default async function Page() {
  return pageCorniche("en");
}
