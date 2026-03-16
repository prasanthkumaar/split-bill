import { Inter, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { ConvexClerkProvider } from "@/providers/convex-clerk-provider";
import { QueryProvider } from "@/providers/query-provider";
import { cn } from "@workspace/ui/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata = {
  title: "Split Bill",
  description: "Split bills with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <ConvexClerkProvider>
            <QueryProvider>{children}</QueryProvider>
          </ConvexClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
