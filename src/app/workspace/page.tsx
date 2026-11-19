import type { Metadata } from "next";
import WorkspacePage from "@/views/WorkspacePage";

export const metadata: Metadata = { title: "Workspace — CodeLens AI" };

export default function Page() {
  return <WorkspacePage />;
}
