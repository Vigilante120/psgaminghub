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

const chakra = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-chakra",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "PS GAMING HUB — PS5 & PS4 Games at the Best Price", template: "%s · PS GAMING HUB" },
  description:
    "Buy PS5 and PS4 games at the best prices in India, in Primary or Secondary slots. Pay by UPI, fast delivery.",
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
