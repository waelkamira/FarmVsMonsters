import "./globals.css";

export const metadata = {
  title: "Farm Vs Monsters",
  description: "A hand-drawn 2D farm defense game."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
