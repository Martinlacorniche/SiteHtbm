import type { Metadata } from "next";
import { pageCorniche } from "../../reserver-corniche/vue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book Best Western Plus La Corniche — Toulon, facing the sea",
  description: "Book direct at Best Western Plus La Corniche, Toulon Mourillon: €10 off per night on the public rate, breakfast available.",
};

export default async function Page() {
  return pageCorniche("en");
}
