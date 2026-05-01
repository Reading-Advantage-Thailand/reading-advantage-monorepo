"use client";

import * as React from "react";
import Datepicker from "react-tailwindcss-datepicker";
import { DateValueType } from "react-tailwindcss-datepicker/dist/types";

interface DateFieldProps {
  label: string;
  value: DateValueType;
  onChange: (value: DateValueType) => void;
  className?: string;
  placeholder?: string;
}

function DateField({ label, value, onChange, placeholder }: DateFieldProps) {
  const handleValueChange = (newValue: any) => {
    const { startDate, endDate } = newValue;
    if (typeof startDate === "string" && typeof endDate === "string") {
      const newStarDate = new Date(startDate);
      const newEndDate = new Date(endDate);
      onChange({ startDate: newStarDate, endDate: newEndDate });
    } else {
      onChange({ startDate: null, endDate: null });
    }
  };
  return (
    <>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div id="datepicker-wrapper">
        <Datepicker
          placeholder={placeholder}
          value={value}
          onChange={handleValueChange}
          readOnly={true}
          showFooter={true}
          showShortcuts={true}
          useRange={true}
          displayFormat={"DD/MM/YYYY"}
          inputClassName="relative mt-2 transition-all duration-300 py-2.5 pl-4 pr-10 w-full border-gray-300 dark:bg-slate-800 dark:text-white/80 dark:border-slate-600 rounded-lg tracking-wide font-light text-sm placeholder-gray-400 bg-white focus:ring disabled:opacity-40 disabled:cursor-not-allowed focus:border-blue-500 focus:ring-blue-500/20 date-field w-full py-[9px] appearance-none rounded transition-none border text-base-800 !text-lu4-regular focus:ring-0 focus:outline-none placeholder:text-base-400 placeholder:text-lu4-regular focus:outline-0 opacity-100 text-ellipsis"
        />
      </div>
    </>
  );
}

export { DateField };
