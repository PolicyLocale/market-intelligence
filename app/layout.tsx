import "./globals.css";

export const metadata = {
  title: "Anto Market Intelligence",
  description: "Momentum + Breakout + Relative Strength Tracker",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16a34a" />
      </head>
      <body>{children}</body>
    </html>
  );
}