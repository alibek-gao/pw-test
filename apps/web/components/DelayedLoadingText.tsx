import { useEffect, useState } from "react";

type DelayedLoadingTextProps = {
  isLoading: boolean;
  hasData: boolean;
  className?: string;
  delayMs?: number;
  text?: string;
};

export const DelayedLoadingText = ({
  isLoading,
  hasData,
  className = "",
  delayMs = 350,
  text = "Loading...",
}: DelayedLoadingTextProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoading || !hasData) {
      setShow(false);
      return;
    }

    const timer = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, hasData, isLoading]);

  if (!show) return null;

  return (
    <span
      aria-live="polite"
      className={`ml-2 text-[10px] font-normal normal-case text-gray-400 ${className}`}
    >
      {text}
    </span>
  );
};
