import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans3 = Source_Sans_3({
	variable: "--font-geist",
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
		<html
			lang="en"
			className={`${sourceSans3.variable} h-full antialiased selection:bg-[#38bdf8] selection:text-white`}
		>
			<body className={`min-h-dvh flex flex-col ${sourceSans3.className}`}>{children}</body>
		</html>
	);
}
