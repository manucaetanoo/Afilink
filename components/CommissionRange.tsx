"use client";

import React, { useState } from "react";

type CommissionType = "PERCENT";

interface CommissionRangeProps {
  type?: CommissionType;
  min?: number;
  max?: number;
  step?: number;
  initialValue?: number;
  onChange?: (value: number, type: CommissionType) => void;
}

export const CommissionRange: React.FC<CommissionRangeProps> = ({
  type = "PERCENT",
  min = 5,
  max = 100,
  step = 25,
  initialValue = 25,
  onChange,
}) => {
  const [value, setValue] = useState(initialValue);
  const progress = max > min ? ((value - min) / (max - min)) * 100 : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    onChange?.(newValue, type);
  };

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Porcentaje de comision
          </label>
          <p className="mt-1 text-sm leading-5 text-slate-500">
            Mientras mas comision, mas atractivo queda para afiliados.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-orange-50 px-4 py-2 text-left ring-1 ring-orange-100 sm:text-right">
          <p className="text-2xl font-bold text-orange-600">{value}%</p>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">
            seleccionado
          </p>
        </div>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={step}
        onChange={handleChange}
        style={{
          background: `linear-gradient(to right, #f97316 0%, #f97316 ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)`,
        }}
        className="h-2 w-full cursor-pointer appearance-none rounded-full accent-orange-600 outline-none transition"
        aria-label="commission-percent"
      />

      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{min}%</span>
        <span>{Math.round((min + max) / 2)}%</span>
        <span>{max}%</span>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        El afiliado recibe{" "}
        <span className="font-semibold text-slate-950">{value}%</span> del precio
        del producto por cada venta confirmada.
      </div>
    </div>
  );
};
