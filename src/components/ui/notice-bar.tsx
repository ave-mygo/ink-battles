"use client";
import React from "react";

interface NoticeBarProps {
	message: string;
	link?: string;
}

export default function NoticeBar({ message, link }: NoticeBarProps) {
	return (
		<div className="text-amber-900 px-4 py-3 border-b border-yellow-200 flex w-full whitespace-nowrap shadow-sm items-center justify-center overflow-hidden from-yellow-50 to-amber-50 bg-gradient-to-r">
			<div className="animate-marquee flex min-w-full items-center justify-center">
				{link
					? (
							<a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-center underline w-full block transition-colors hover:text-amber-700">{message}</a>
						)
					: (
							<span className="font-medium text-center w-full block">{message}</span>
						)}
			</div>
		</div>
	);
}
