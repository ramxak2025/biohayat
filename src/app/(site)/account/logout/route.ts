import { destroyCustomerSession } from "@/lib/customer-auth";
import { handleFormPost, redirectAfterPost } from "@/lib/http";

export async function POST() {
  return handleFormPost("account/logout", "/account", async () => {
    await destroyCustomerSession();
    // Относительный Location + 303: за обратным прокси req.url указывает на
    // localhost, а 307 по умолчанию заставил бы браузер повторить POST.
    return redirectAfterPost("/account");
  });
}
