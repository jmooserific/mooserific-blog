"use client";

interface ActiveFilterBadgeProps {
  value: string;
  onClear: () => void;
}

const formatDateFilter = (value: string): string => {
  // Handle different filter formats: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH-MM
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (/^\d{4}$/.test(value)) {
    // Year only: "2025"
    return value;
  }
  
  if (/^\d{4}-\d{2}$/.test(value)) {
    // Year-Month: "2025-08" -> "August 2025"
    const [year, month] = value.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${year}`;
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    // Year-Month-Day: "2025-08-07" -> "August 7, 2025"
    const [year, month, day] = value.split('-');
    const monthIndex = parseInt(month) - 1;
    return `${monthNames[monthIndex]} ${parseInt(day)}, ${year}`;
  }
  
  if (/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/.test(value)) {
    // Full timestamp: "2025-08-07T14-30" -> "August 7, 2025 2:30 PM"
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-');
    const [hour, minute] = timePart.split('-');
    const monthIndex = parseInt(month) - 1;
    const hourInt = parseInt(hour);
    const ampm = hourInt >= 12 ? 'PM' : 'AM';
    const hour12 = hourInt % 12 || 12;
    return `${monthNames[monthIndex]} ${parseInt(day)}, ${year} ${hour12}:${minute} ${ampm}`;
  }
  
  // Fallback to original value
  return value;
};

const ActiveFilterBadge: React.FC<ActiveFilterBadgeProps> = ({ value, onClear }) => (
  <div className="flex items-center gap-2 bg-[#845A2C]/10 text-[#845A2C] px-3 py-1 rounded-full text-sm font-medium">
    <span>Filter: {formatDateFilter(value)}</span>
    <button
      className="text-[#845A2C]/60 hover:text-[#845A2C] transition-colors focus:outline-none"
      onClick={onClear}
      aria-label="Clear date filter"
    >
      ×
    </button>
  </div>
);

export { ActiveFilterBadge };
