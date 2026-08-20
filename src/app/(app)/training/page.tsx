import { redirect } from "next/navigation";

// Training's list moved onto the combined Handbuch & Training screen —
// this route stays only so old links/bookmarks land somewhere real.
export default function TrainingPage() {
  redirect("/handbuch");
}
