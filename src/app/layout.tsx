import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartContext";
import AnnouncementBar from "@/components/AnnouncementBar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WhatsAppButton from "@/components/WhatsAppButton";
import { getSessionInfo } from "@/lib/supabase/server";
import JsonLd from "@/components/JsonLd";
import { SITE_JSON_LD, SITE_URL } from "@/lib/seo";
import { STORE_NAME } from "@/lib/store";

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const DESCRIPTION =
  "Buy PS5 and PS4 games at the best prices in India: Primary or Secondary slot, or rent for 30 days. Pay with UPI, fast delivery on WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "PS GAMING HUB — Buy PS5 & PS4 Games in India at the Best Price", template: "%s · PS GAMING HUB" },
  description: DESCRIPTION,
  applicationName: STORE_NAME,
  keywords: [
    "PS5 games",
    "PS4 games",
    "buy PS5 games India",
    "cheap PS5 games",
    "PS5 digital games",
    "PS4 digital games",
    "PS5 primary account",
    "PS5 secondary account",
    "rent PS5 games",
    "PlayStation games UPI",
  ],
  openGraph: { type: "website", siteName: STORE_NAME, locale: "en_IN", url: "/", description: DESCRIPTION },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  // Paste the code from Google Search Console's "HTML tag" method into this env var on Vercel.
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

// Next.js also adds width=device-width by default; viewportFit lets env(safe-area-inset-*) work on notched phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#05060a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getSessionInfo();

  return (
    <html lang="en" className={`${chakra.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <JsonLd data={SITE_JSON_LD} />
        <CartProvider>
          <AnnouncementBar />
          <Header signedIn={Boolean(user)} isAdmin={isAdmin} />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <CartDrawer />
          <WhatsAppButton />
        </CartProvider>
      </body>
    </html>
  );
}
