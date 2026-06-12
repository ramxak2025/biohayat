import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { getCustomerSession } from "@/lib/customer-auth";
import { ensureReferralCode, REFERRAL_BONUS_KOPECKS } from "@/lib/referral";
import { siteUrl } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { ReferralView } from "./referral-view";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Друзья — ХАЯТ",
  robots: { index: false, follow: false },
};

export default async function ReferralPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/account");

  const code = await ensureReferralCode(session.sub);

  const [me, referralsCount, earnedAgg] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: session.sub },
      select: { referredById: true },
    }),
    prisma.customer.count({ where: { referredById: session.sub } }),
    prisma.bonusTransaction.aggregate({
      where: { customerId: session.sub, reason: "referral", amountKopecks: { gt: 0 } },
      _sum: { amountKopecks: true },
    }),
  ]);

  const link = `${siteUrl()}/?ref=${encodeURIComponent(code)}`;
  const earnedKopecks = earnedAgg._sum.amountKopecks ?? 0;

  return (
    <AccountShell name={session.name}>
      <ReferralView
        code={code}
        link={link}
        referralsCount={referralsCount}
        earnedKopecks={earnedKopecks}
        bonusKopecks={REFERRAL_BONUS_KOPECKS}
        alreadyReferred={Boolean(me?.referredById)}
      />
    </AccountShell>
  );
}
