import { destroySession } from "@/lib/auth";
import { redirectAfterPost } from "@/lib/http";

export async function POST() {
  await destroySession();
  return redirectAfterPost("/admin/login");
}
