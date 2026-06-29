import React, { useState, useEffect, useMemo } from 'react';
import type { College, FilterState } from '../types/college';
import { CITY_LEVELS, LEVELS, NATURES } from '../types/college';
import { getProvinces, getCitiesByProvinces } from '../utils/filters';

interface FilterPanelProps {
  colleges: College[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ colleges, filters, onFilterChange }) => {
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(filters.省份);
  const [selectedCities, setSelectedCities] = useState<string[]>(filters.城市);
  const [selectedCityLevels, setSelectedCityLevels] = useState<string[]>(filters.城市类);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(filters.层次);
  const [selectedNatures, setSelectedNatures] = useState<string[]>(filters.性质);
  const [searchTerm, setSearchTerm] = useState(filters.搜索词);
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState({
    search: true,
    cityLevel: true,
    province: false,
    city: false,
    level: true,
    nature: true,
  });

  const provinces = useMemo(() => getProvinces(colleges), [colleges]);
  const cities = useMemo(() => getCitiesByProvinces(colleges, selectedProvinces), [colleges, selectedProvinces]);

  useEffect(() => {
    onFilterChange({
      省份: selectedProvinces,
      城市: selectedCities,
      城市类: selectedCityLevels,
      层次: selectedLevels,
      性质: selectedNatures,
      搜索词: searchTerm,
    });
  }, [selectedProvinces, selectedCities, selectedCityLevels, selectedLevels, selectedNatures, searchTerm, onFilterChange]);

  const toggleSelection = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, value: string) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  const clearFilters = () => {
    setSelectedProvinces([]);
    setSelectedCities([]);
    setSelectedCityLevels([]);
    setSelectedLevels([]);
    setSelectedNatures([]);
    setSearchTerm('');
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters = selectedProvinces.length > 0 || selectedCities.length > 0 ||
    selectedCityLevels.length > 0 || selectedLevels.length > 0 || selectedNatures.length > 0 || searchTerm !== '';

  /** 横向标签选择器 - 通用组件 */
  const TagSelector: React.FC<{
    items: string[];
    selected: string[];
    onToggle: (value: string) => void;
    colorFn?: (item: string) => string;
    maxHeight?: string;
  }> = ({ items, selected, onToggle, colorFn, maxHeight = 'max-h-40' }) => (
    <div className={`mt-2 ${maxHeight} overflow-y-auto`}>
      <div className="flex flex-wrap gap-1.5">
        {items.map(item => {
          const isActive = selected.includes(item);
          const activeColor = colorFn ? colorFn(item) : 'bg-blue-600 shadow-blue-200';
          return (
            <button
              key={item}
              onClick={() => onToggle(item)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? `${activeColor} text-white shadow-sm`
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
      {items.length === 0 && (
        <p className="text-xs text-gray-400 py-2 text-center">暂无选项</p>
      )}
    </div>
  );

  /** 省份颜色映射 */
  const getProvinceColor = (province: string): string => {
    const colorPool = [
      'bg-blue-600 shadow-blue-200',
      'bg-indigo-600 shadow-indigo-200',
      'bg-violet-600 shadow-violet-200',
      'bg-purple-600 shadow-purple-200',
      'bg-sky-600 shadow-sky-200',
      'bg-cyan-600 shadow-cyan-200',
      'bg-teal-600 shadow-teal-200',
    ];
    // 简单哈希分配颜色
    let hash = 0;
    for (let i = 0; i < province.length; i++) {
      hash = province.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colorPool[Math.abs(hash) % colorPool.length];
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 sm:p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            筛选条件
          </h2>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs px-3 py-1 bg-white/20 text-white rounded-full hover:bg-white/30 transition-colors"
              >
                清除
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className={`transition-all duration-300 ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
          {/* 搜索框 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('search')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索大学
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.search ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.search && (
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="输入大学名称、城市或省份..."
                className="w-full mt-2 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            )}
          </div>

          {/* 城市等级 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('cityLevel')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">城市等级</span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.cityLevel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.cityLevel && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {CITY_LEVELS.map(level => {
                  const colorMap: Record<string, string> = {
                    '一线': 'bg-rose-600 shadow-rose-200',
                    '新一线': 'bg-orange-600 shadow-orange-200',
                    '二线': 'bg-amber-600 shadow-amber-200',
                    '三线': 'bg-emerald-600 shadow-emerald-200',
                    '四线': 'bg-cyan-600 shadow-cyan-200',
                    '五线': 'bg-slate-600 shadow-slate-200',
                  };
                  return (
                    <button
                      key={level}
                      onClick={() => toggleSelection(selectedCityLevels, setSelectedCityLevels, level)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                        selectedCityLevels.includes(level)
                          ? `${colorMap[level] || 'bg-blue-600 shadow-blue-200'} text-white shadow-sm`
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 省份 - 横向标签布局 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('province')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                省份
                {selectedProvinces.length > 0 && (
                  <span className="ml-1 text-blue-600">({selectedProvinces.length})</span>
                )}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.province ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.province && (
              <TagSelector
                items={provinces}
                selected={selectedProvinces}
                onToggle={(v) => toggleSelection(selectedProvinces, setSelectedProvinces, v)}
                colorFn={getProvinceColor}
                maxHeight="max-h-44"
              />
            )}
          </div>

          {/* 城市 - 横向标签布局 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('city')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">
                城市
                {selectedCities.length > 0 && (
                  <span className="ml-1 text-blue-600">({selectedCities.length})</span>
                )}
                {selectedProvinces.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">已按省份筛选</span>
                )}
              </span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.city ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.city && (
              <TagSelector
                items={cities}
                selected={selectedCities}
                onToggle={(v) => toggleSelection(selectedCities, setSelectedCities, v)}
                maxHeight="max-h-44"
              />
            )}
          </div>

          {/* 层次 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('level')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">层次</span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.level ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.level && (
              <div className="flex gap-2 mt-2">
                {LEVELS.map(level => {
                  const isActive = selectedLevels.includes(level);
                  const isBenke = level === '本科';
                  return (
                    <button
                      key={level}
                      onClick={() => toggleSelection(selectedLevels, setSelectedLevels, level)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? isBenke
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : 'bg-orange-600 text-white shadow-md shadow-orange-200'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 性质 */}
          <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
            <button
              onClick={() => toggleSection('nature')}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-gray-700">性质</span>
              <svg className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.nature ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSections.nature && (
              <div className="flex gap-2 mt-2">
                {NATURES.map(nature => {
                  const isActive = selectedNatures.includes(nature);
                  const isPublic = nature === '公办';
                  return (
                    <button
                      key={nature}
                      onClick={() => toggleSelection(selectedNatures, setSelectedNatures, nature)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? isPublic
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'bg-violet-600 text-white shadow-md shadow-violet-200'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {nature}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;
