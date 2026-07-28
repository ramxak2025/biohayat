import { destroyCustomerSession } from "@/lib/customer-auth";
import { redirectAfterPost } from "@/lib/http";

export async function POST() {
  await destroyCustomerSession();
  return redirectAfterPost("/account");
}
