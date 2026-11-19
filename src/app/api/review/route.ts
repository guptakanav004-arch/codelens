import { handleApi } from "@/lib/server/http";
import { runReview } from "@/lib/server/reviewService";

export const dynamic = "force-dynamic";
export const maxDuration = 150;

export async function POST(req: Request) {
  return handleApi(req, "/api/review", runReview);
}
