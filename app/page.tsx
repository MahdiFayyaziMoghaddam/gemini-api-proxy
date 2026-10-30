"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

function Home() {
	const [copied, setCopied] = useState(false);
	const link = "https://burh.vercel.app/v1";

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(link);
			setCopied(true);
			setTimeout(() => setCopied(false), 3000);
		} catch {
			setCopied(false);
		}
	};

	return (
		<div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center bg-slate-950 px-6 relative">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 opacity-60"
				style={{
					background:
						"radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56,189,248,0.22), transparent 60%), radial-gradient(ellipse 55% 50% at 25% 100%, rgba(59,130,246,0.20), transparent 60%), radial-gradient(ellipse 55% 50% at 75% 100%, rgba(236,72,153,0.18), transparent 60%)"
				}}
			/>

			<div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
				<Image src={"/icon.png"} alt="icon" width={210} height={210} className="select-none" draggable={false} />
				<h1
					className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 bg-clip-text text-transparent py-1 select-none"
					style={{
						backgroundImage: "linear-gradient(130deg, #38bdf8 0%, #3b82f6 30%, #ec4899 100%)"
					}}
				>
					Gemini API Proxy
				</h1>

				<p className="text-base sm:text-lg text-slate-300/90 leading-relaxed max-w-lg mb-8 select-none">
					You don't need to VPN anymore {":)"}
				</p>

				<button
					onClick={handleCopy}
					className="group flex items-center gap-3 rounded-full select-none cursor-pointer border border-slate-700/60 bg-slate-900/60 backdrop-blur px-5 py-3 transition-all hover:border-slate-500 hover:bg-slate-800/70"
				>
					<span className="font-mono text-sm text-slate-300 select-all">{link}</span>
					<span className="h-5 w-px bg-slate-700" />
					<span className="flex items-center gap-1.5 text-sm font-medium text-slate-300 transition-colors group-hover:text-white">
						{copied ? (
							<>
								<Check className="w-4 h-4 text-pink-400" />
								<span className="text-pink-400">Copied</span>
							</>
						) : (
							<>
								<Copy className="w-4 h-4" />
								<span>Copy</span>
							</>
						)}
					</span>
				</button>
			</div>

			<footer className="absolute bottom-4 left-0 right-0 text-center z-10">
				<p className="text-sm font-medium text-slate-400/70 transition-colors select-none">
					Created by{" "}
					<Link
						href="https://t.me/mhdifyyzi"
						target="_blank"
						rel="noopener noreferrer"
						className="text-pink-400 hover:text-slate-200 transition-colors"
					>
						@mhdifyyzi
					</Link>
				</p>
			</footer>
		</div>
	);
}

export default Home;
