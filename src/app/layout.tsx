import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { buildMetadata, organizationJsonLd, siteUrl } from "@/lib/seo";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  return {
    metadataBase: new URL(siteUrl()),
    ...buildMetadata({ path: "/" }, settings),
    icons: { icon: "/favicon.ico" },
    verification: {
      yandex: settings.yandexVerification || undefined,
      google: settings.googleVerification || undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#3a9447",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getSettings();
  return (
    <html lang="ru" className={`${manrope.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd(settings)),
          }}
        />
        {settings.yandexMetrikaId ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window,document,'script','https://mc.yandex.ru/metrika/tag.js','ym');ym(${settings.yandexMetrikaId},'init',{clickmap:true,trackLinks:true,accurateTrackBounce:true});`,
            }}
          />
        ) : null}
      </head>
      <body className="min-h-full bg-surface text-ink flex flex-col">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { borderRadius: "16px" } }}
        />
      </body>
    </html>
  );
}
