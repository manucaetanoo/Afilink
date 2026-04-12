"use client";
import React, { useState } from "react";

type CommissionType = "PERCENT" | "FIXED";

interface CommissionRangeProps {
  type: CommissionType;
  min?: number;
  max?: number;
  step?: number;
  initialValue?: number;
  onChange?: (value: number, type: CommissionType) => void;
}

export const CommissionRange: React.FC<CommissionRangeProps> = ({
  type,
  min = 5,
  max = 100,
  step = 25,
  initialValue = 25,
  onChange,
}) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    setValue(newValue);
    if (onChange) onChange(newValue, type);
  };

  return (
    <div className="w-full mt-9">
      <label className="block text-sm font-medium text-gray-800 mb-2">
        {type === "PERCENT" ? "Comisión que deseas que tenga tu producto" : "Comisión fija ($)"}
      </label>
      <p className="text-xs text-gray-500 mb-3 mt-3"> Mientras más comisión más facil se vendera pero ganarás menos. </p>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        step={step}
        onChange={handleChange}
        className="range w-full accent-orange-600 hover:accent-orange-600"
        aria-label={`commission-${type}`}
      />
      

      <div className="w-full flex justify-between text-xs px-2 mt-1">
        {Array.from({ length: Math.floor(max / step) + 1 }).map((_, i) => (
          <span key={i}>|</span>
        ))}
      </div>

      <div className="mt-2 text-sm text-gray-600">
        Valor seleccionado:{" "}
        <span className="font-semibold">
          {type === "PERCENT" ? `${value}%` : `$${value}`}
        </span>
      </div>
    </div>
  );
};
