import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getAuthenticatedActor } from "@/auth/authenticated-actor";
import { authenticatedPresentation } from "@/auth/authenticated-presentation";
import { Chrome } from "@/components/layout/chrome";

const poppins = localFont({
  src: [
    { path: "./fonts/Poppins-400.woff2", weight: "400" },
    { path: "./fonts/Poppins-500.woff2", weight: "500" },
    { path: "./fonts/Poppins-600.woff2", weight: "600" },
    { path: "./fonts/Poppins-700.woff2", weight: "700" },
  ],
  variable: "--font-poppins",
  display: "swap",
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
