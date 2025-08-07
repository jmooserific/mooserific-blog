// Utility functions for extracting post metadata for filtering UI

import fs from "fs";
import path from "path";

export interface PostMetadata {
  availableYears: number[];
  monthsWithPosts: { [year: number]: number[] };
  postCounts: { [yearMonth: string]: number };
}

export function getPostMetadata(): PostMetadata {
  const postsDir = path.join(process.cwd(), "posts");
  
  // Handle case where posts directory doesn't exist
  if (!fs.existsSync(postsDir)) {
    return {
      availableYears: [],
      monthsWithPosts: {},
      postCounts: {}
    };
  }

  const postFolders = fs.readdirSync(postsDir);
  const availableYears = new Set<number>();
  const monthsWithPosts: { [year: number]: Set<number> } = {};
  const postCounts: { [yearMonth: string]: number } = {};

  postFolders.forEach((folder) => {
    // Extract date from folder name (format: YYYY-MM-DDTHH-MM)
    const match = folder.match(/^(\d{4})-(\d{2})-\d{2}T\d{2}-\d{2}$/);
    if (match) {
      const year = parseInt(match[1]);
      const month = parseInt(match[2]);
      
      availableYears.add(year);
      
      if (!monthsWithPosts[year]) {
        monthsWithPosts[year] = new Set();
      }
      monthsWithPosts[year].add(month);
      
      // Count posts per year-month
      const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;
      postCounts[yearMonth] = (postCounts[yearMonth] || 0) + 1;
      
      // Count posts per year
      const yearKey = year.toString();
      postCounts[yearKey] = (postCounts[yearKey] || 0) + 1;
    }
  });

  return {
    availableYears: Array.from(availableYears).sort((a, b) => b - a), // Descending order
    monthsWithPosts: Object.fromEntries(
      Object.entries(monthsWithPosts).map(([year, months]) => [
        parseInt(year),
        Array.from(months).sort((a, b) => a - b) // Ascending order for months
      ])
    ),
    postCounts
  };
}
