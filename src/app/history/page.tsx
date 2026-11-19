import type { Metadata } from "next";
import HistoryPage from "@/views/HistoryPage";

export const metadata: Metadata = { title: "Review history — CodeLens AI" };

export default function Page() {
  return <HistoryPage />;
}
