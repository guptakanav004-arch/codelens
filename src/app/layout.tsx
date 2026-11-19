import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeLens AI — AI-powered code review",
  description:
    "AI-powered code reviews that detect issues, explain your code, uncover vulnerabilities, and help you write cleaner software.",
};

const themeScript = `try{var t=localStorage.getItem('codelens-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-canvas text-fg antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
