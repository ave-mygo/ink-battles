"use client";

interface NoticeBarProps {
  message: string;
  link?: string;
}

export const NoticeBar = ({ message, link }: NoticeBarProps) => {
  return (
    <div className="text-amber-900 px-4 py-3 border-b border-yellow-200 flex w-full shadow-sm items-center justify-center overflow-x-hidden from-yellow-50 to-amber-50 bg-linear-to-r dark:text-amber-100 dark:border-yellow-800 dark:from-yellow-900/30 dark:to-amber-900/30">
      <div className="flex min-w-0 max-w-full items-center justify-center">
        {link
          ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="font-medium text-center underline max-w-full wrap-break-word leading-relaxed transition-colors hover:text-amber-700 dark:hover:text-amber-200 sm:whitespace-nowrap">{message}</a>
            )
          : (
              <span className="font-medium text-center max-w-full wrap-break-word leading-relaxed sm:whitespace-nowrap">{message}</span>
            )}
      </div>
    </div>
  );
};

export default NoticeBar;
