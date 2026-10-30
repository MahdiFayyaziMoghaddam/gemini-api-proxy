import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const geistSans = Inter({
	variable: "--font-inter",
	subsets: ["latin"],
	display: "swap",
	preload: true
});

export const metadata: Metadata = {
	title: "Gemini API Proxy",
	description: "Created by @mhdifyyzi"
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html lang="en" className={`${geistSans.variable} h-full antialiased`}>
			<body className="min-h-dvh flex flex-col">{children}</body>
		</html>
	);
}
