"use client";

type Props = {
  targetId: string;
  label: string;
};

export default function ButtonScroll({ targetId, label }: Props) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
    >
      {label}
    </button>
  );
}
