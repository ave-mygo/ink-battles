"use client";
import React from "react";

interface NoticeBarProps {
	message: string;
	link?: string;
}

export default function NoticeBar({ message, link }: NoticeBarProps) {
	return (
		<div className="text-yellow-800 px-4 py-2 bg-yellow-100 flex w-full whitespace-nowrap items-center justify-center overflow-hidden">
			<div className="animate-marquee flex min-w-full items-center justify-center">
				{link
					? (
							<a href={link} target="_blank" rel="noopener noreferrer" className="text-center underline w-full block hover:text-yellow-600">{message}</a>
						)
					: (
							<span className="text-center w-full block">{message}</span>
						)}
			</div>
		</div>
	);
}
