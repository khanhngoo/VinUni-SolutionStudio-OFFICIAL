import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { authenticatedPresentation } from "@/auth/authenticated-presentation";
import { Chrome } from "@/components/layout/chrome";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Solutions Studio — VinUniversity",
  description:
    "Find and win real challenges posted by companies, labs and faculty.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const resolution = await getAuthenticatedActor();
  const identity =
    resolution.status === "RESOLVED"
      ? authenticatedPresentation(resolution.actor)
      : null;

  return (
    <html lang="en" className={`h-full ${poppins.variable}`}>
      <body className="min-h-full flex flex-col">
        <Chrome identity={identity}>{children}</Chrome>
      </body>
    </html>
  );
}
