import { destroyCustomerSession } from "@/lib/customer-auth";
import { handleFormPost, redirectAfterPost } from "@/lib/http";

export async function POST() {
  return handleFormPost("account/logout", "/account", async () => {
    await destroyCustomerSession();
    return redirectAfterPost("/account");
  });
}
