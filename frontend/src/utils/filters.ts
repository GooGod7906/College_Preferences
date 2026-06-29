import type { College, FilterState } from '../types/college';

export function filterColleges(colleges: College[], filters: FilterState): College[] {
  return colleges.filter(college => {
    // 省份筛选
    if (filters.省份.length > 0 && !filters.省份.includes(college.省份)) {
      return false;
    }

    // 城市筛选
    if (filters.城市.length > 0 && !filters.城市.includes(college.城市)) {
      return false;
    }

    // 城市等级筛选
    if (filters.城市类.length > 0 && !filters.城市类.includes(college.城市类)) {
      return false;
    }

    // 层次筛选
    if (filters.层次.length > 0 && !filters.层次.includes(college.层次)) {
      return false;
    }

    // 性质筛选
    if (filters.性质.length > 0 && !filters.性质.includes(college.性质)) {
      return false;
    }

    // 搜索词筛选
    if (filters.搜索词) {
      const searchTerm = filters.搜索词.toLowerCase();
      const matchesName = college.院校名称.toLowerCase().includes(searchTerm);
      const matchesCity = college.城市.toLowerCase().includes(searchTerm);
      const matchesProvince = college.省份.toLowerCase().includes(searchTerm);
      if (!matchesName && !matchesCity && !matchesProvince) {
        return false;
      }
    }

    return true;
  });
}

export function getUniqueValues(colleges: College[], field: keyof College): string[] {
  const values = new Set<string>();
  colleges.forEach(college => {
    const value = college[field];
    if (value && typeof value === 'string') {
      values.add(value);
    }
  });
  return Array.from(values).sort();
}

export function getProvinces(colleges: College[]): string[] {
  return getUniqueValues(colleges, '省份');
}

export function getCitiesByProvinces(colleges: College[], provinces: string[]): string[] {
  if (provinces.length === 0) {
    return getUniqueValues(colleges, '城市');
  }
  const cities = new Set<string>();
  colleges.forEach(college => {
    if (provinces.includes(college.省份)) {
      cities.add(college.城市);
    }
  });
  return Array.from(cities).sort();
}
