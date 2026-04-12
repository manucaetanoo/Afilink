"use client";

type Props = {
  targetId: string;
  label: string;
  classname?: string;
};

export default function ButtonScroll({ targetId, label, classname }: Props) {
  const handleClick = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <button
      onClick={handleClick}
      className={classname || "rounded-2xl bg-orange-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-orange-600"}
    >
      {label}
    </button>
  );
}
