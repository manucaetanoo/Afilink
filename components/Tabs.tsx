"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "@heroicons/react/16/solid";

type SortValue = "commission" | "attractive" | "newest";

type Props = {
  currentSort?: SortValue;
};

const tabs: { name: string; value: SortValue }[] = [
  { name: "Alta comision", value: "commission" },
  { name: "Mas atractivas", value: "attractive" },
  { name: "Nuevas campañas", value: "newest" },
];

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

function getHref(value: SortValue) {
  return `/campaigns?sort=${value}`;
}

export default function Tabs({ currentSort = "commission" }: Props) {
  const router = useRouter();

  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={currentSort}
          onChange={(event) => router.push(getHref(event.target.value as SortValue), {scroll: false})}
          aria-label="Ordenar campañas"
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-orange-500"
        >
          {tabs.map((tab) => (
            <option key={tab.value} value={tab.value}>
              {tab.name}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500"
        />
      </div>

      <div className="hidden sm:block">
        <div className="border-b border-gray-200">
          <nav aria-label="Tabs" className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const current = tab.value === currentSort;

              return (
                <Link
                  key={tab.value}
                  href={getHref(tab.value)} 
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={classNames(
                    current
                      ? "border-orange-500 text-slate-950"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700",
                    "border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap"
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
