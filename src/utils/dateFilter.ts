// Utility for matching post dates to a date_filter param

export function matchesDateFilter(postDate: string, filter: string): boolean {
  if (!filter) return true;
  // Normalize postDate to ISO string (YYYY-MM-DDTHH:MM:SS)
  const iso = postDate.replace(/:/g, "-").replace(/ /g, "T");
  // Acceptable filters: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH-MM
  if (/^\d{4}$/.test(filter)) {
    return iso.startsWith(filter);
  }
  if (/^\d{4}-\d{2}$/.test(filter)) {
    return iso.startsWith(filter);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(filter)) {
    return iso.startsWith(filter);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}$/.test(filter)) {
    // Match up to minute
    return iso.startsWith(filter.replace(/:/g, "-"));
  }
  return false;
}
