import type { College } from '../types/college';

let collegesCache: College[] | null = null;

export async function loadColleges(): Promise<College[]> {
  if (collegesCache) {
    return collegesCache;
  }

  try {
    const response = await fetch('/data/colleges.json');
    if (!response.ok) {
      throw new Error('Failed to load colleges data');
    }
    const data = await response.json();
    collegesCache = data;
    return data;
  } catch (error) {
    console.error('Error loading colleges:', error);
    return [];
  }
}

export function getCollegeById(colleges: College[], name: string): College | undefined {
  return colleges.find(c => c.院校名称 === name);
}
