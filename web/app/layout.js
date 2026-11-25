import "./globals.css";
import "./codex-theme.css";
import { LocaleProvider } from "./LocaleProvider";

export const metadata = {
  title: "Farm Vs Monsters",
  description: "A hand-drawn 2D farm defense game."
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <body><LocaleProvider>{children}</LocaleProvider></body>
    </html>
  );
}
