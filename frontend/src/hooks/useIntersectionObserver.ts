import { useEffect } from "react";

interface UseIntersectionObserverProps {
	target: React.RefObject<Element | null>;
	onIntersect: (entries: IntersectionObserverEntry[]) => void;
	threshold?: number;
	rootMargin?: string;
}

export function useIntersectionObserver({
	target,
	onIntersect,
	threshold = 0.1,
	rootMargin = "0px",
}: UseIntersectionObserverProps) {
	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => onIntersect(entries),
			{
				rootMargin,
				threshold,
			},
		);

		const current = target.current;

		if (current) {
			observer.observe(current);
		}

		return () => {
			if (current) {
				observer.unobserve(current);
			}
		};
	}, [target, onIntersect, rootMargin, threshold]);
}
