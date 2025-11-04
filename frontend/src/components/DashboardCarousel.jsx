import React from "react";

export default function DashboardCarousel({ options, onCardClick }) {
  const hasError = false;
  const errorMsg = "";

  // Defensive: validate options
  const safeOptions = Array.isArray(options) && options.length > 0
    ? options.filter(opt => opt && typeof opt === 'object' && opt.label && opt.icon && opt.description)
    : [];

  // Tailwind card styles: clean, modern, high contrast
  const cardClasses =
    "bg-[rgba(36,54,97,0.98)] border-[2.5px] border-blue-400 shadow-[0_8px_32px_#60a5fa33] text-slate-100 rounded-[22px] font-bold text-[21px] transition";

  if (hasError) {
    return (
      <div className="text-rose-600 bg-rose-50 border border-rose-600 p-6 rounded-xl m-5 text-center">
        <b>Dashboard Error</b>
        <div className="mt-2 text-sm">{errorMsg}</div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center items-center">
      <div className="grid grid-cols-2 grid-rows-2 gap-8 w-full max-w-[600px] p-6">
        {safeOptions.length > 0 ? safeOptions.slice(0, 4).map((opt, idx) => (
          <div
            key={opt.label || idx}
            onClick={() => onCardClick(opt)}
            className={`min-w-[180px] max-w-[260px] px-5 pt-[2.2rem] pb-6 cursor-pointer flex flex-col items-center font-sans select-none mx-auto ${cardClasses} hover:shadow-[0_10px_36px_#60a5fa55] hover:border-blue-300`}
          >
            <span className="text-[40px] mb-3.5">{opt.icon}</span>
            <span className="mb-2.5 text-center">{opt.label}</span>
            <span className="text-sm text-[#a3aed6] font-normal text-center">{opt.description}</span>
          </div>
        )) : (
          <div className="text-rose-600 font-medium text-lg p-8 text-center w-full">
            No dashboard options available
          </div>
        )}
      </div>
    </div>
  );
}
