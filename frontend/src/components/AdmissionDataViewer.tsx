import React, { useState, useEffect, useMemo, useRef } from 'react';
import PdfViewer from './PdfViewer';

interface AdmissionDataViewerProps {
  collegeName: string;
  className?: string;
  fullWidth?: boolean;
}

// PDF 文件配置
const PDF_CONFIGS = [
  {
    id: 'plan-history' as const,
    label: '历史组招生计划',
    file: '2026招生计划（历史组）',
    color: 'amber',
    isPlan: true,
  },
  {
    id: 'plan-physics' as const,
    label: '物理组招生计划',
    file: '2026招生计划（物理组）',
    color: 'violet',
    isPlan: true,
  },
  {
    id: 'history' as const,
    label: '历史组分数线',
    file: '2023-2025福建分数线（历史组）',
    color: 'blue',
    isPlan: false,
  },
  {
    id: 'physics' as const,
    label: '物理组分数线',
    file: '2023-2025福建分数线（物理组）',
    color: 'teal',
    isPlan: false,
  },
];

type TabId = typeof PDF_CONFIGS[number]['id'];

interface PlanRecord {
  院校: string;
  专业组: string;
  专业代号: string;
  专业名称: string;
  学制: string;
  计划人数: string;
  收费标准: string;
  备注: string;
}

interface ScoreRecord {
  院校: string;
  选考科目: string;
  专业名称: string;
  '2025_录取数': string;
  '2025_最高分': string;
  '2025_最低分': string;
  '2025_平均分': string;
  '2024_录取数': string;
  '2024_最高分': string;
  '2024_最低分': string;
  '2024_平均分': string;
  '2023_录取数': string;
  '2023_最高分': string;
  '2023_最低分': string;
  '2023_平均分': string;
}

/**
 * 解析招生计划文本为表格数据
 */
function parseAdmissionPlan(text: string, collegeName: string, defaultCollege?: string, defaultGroup?: string): PlanRecord[] {
  if (!text) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records: PlanRecord[] = [];
  let currentCollege = defaultCollege || '';
  let currentGroup = defaultGroup || '';

  for (const line of lines) {
    // 识别大学名称
    if (
      (line.includes('大学') || line.includes('学院') || line.includes('学校')) &&
      line.length < 60 &&
      !line.includes('招生') &&
      !line.includes('专业组')
    ) {
      currentCollege = line.replace(/\s+\d+\s*$/, '').trim(); // 移除末尾的数字
      continue;
    }

    // 识别专业组
    if (line.includes('专业组')) {
      currentGroup = line;
      continue;
    }

    // 尝试解析专业数据行
    // 格式：专业代号 专业名称 学制 计划人数 收费标准 [备注]
    const match = line.match(/^(\d{3})\s+(.+?)\s+(四|三|五|二)\s+(\d+)\s+(\d+)(.*)/);
    if (match && currentCollege) {
      records.push({
        院校: currentCollege,
        专业组: currentGroup,
        专业代号: match[1],
        专业名称: match[2],
        学制: match[3],
        计划人数: match[4],
        收费标准: match[5],
        备注: match[6]?.trim() || '',
      });
    }
  }

  // 只返回与当前大学相关的记录
  const normalizedName = collegeName.replace(/[（(].*[)）]/, '').trim();
  return records.filter(r => {
    const normalizedRecord = r.院校.replace(/[（(].*[)）]/, '').trim();
    return (
      normalizedRecord === normalizedName ||
      r.院校.includes(normalizedName) ||
      normalizedName.includes(normalizedRecord)
    );
  });
}
// 特殊名称映射（学校改名等特殊情况）- 用于文本内容匹配
const SPECIAL_NAME_MAP_FOR_TEXT: Record<string, string[]> = {
  '闽江大学': ['闽江学院'],
};

/**
 * 检查记录名称是否匹配目标大学名称（包含特殊名称映射）
 */
function matchesCollegeName(recordName: string, targetName: string): boolean {
  const normalizedRecord = recordName.replace(/[（(].*[)）]/, '').trim();
  const normalizedTarget = targetName.replace(/[（(].*[)）]/, '').trim();

  // 直接匹配
  if (
    normalizedRecord === normalizedTarget ||
    recordName.includes(normalizedTarget) ||
    normalizedTarget.includes(normalizedRecord)
  ) {
    return true;
  }

  // 检查特殊名称映射
  const altNames = SPECIAL_NAME_MAP_FOR_TEXT[targetName] || [];
  for (const altName of altNames) {
    const normalizedAlt = altName.replace(/[（(].*[)）]/, '').trim();
    if (
      normalizedRecord === normalizedAlt ||
      recordName.includes(normalizedAlt) ||
      normalizedAlt.includes(normalizedRecord)
    ) {
      return true;
    }
  }

  // 反向检查：目标名称是否在特殊映射的值中
  for (const [key, values] of Object.entries(SPECIAL_NAME_MAP_FOR_TEXT)) {
    if (values.some(v => {
      const nv = v.replace(/[（(].*[)）]/, '').trim();
      return nv === normalizedRecord || recordName.includes(nv) || nv.includes(recordName);
    })) {
      // 记录名称匹配了某个特殊映射的值，检查目标名称是否是该映射的键
      const normalizedKey = key.replace(/[（(].*[)）]/, '').trim();
      if (normalizedTarget === normalizedKey || targetName.includes(normalizedKey) || normalizedKey.includes(targetName)) {
        return true;
      }
    }
  }

  return false;
}


/**
 * 解析分数线文本为表格数据
 * @param text 页面文本
 * @param collegeName 要筛选的大学名称
 * @param defaultCollege 默认大学名称（用于延续页面没有大学标题的情况）
 * @param defaultGroup 默认选考科目（用于延续页面没有选考科目头的情况）
 */
function parseScoreLine(text: string, collegeName: string, defaultCollege?: string, defaultGroup?: string): ScoreRecord[] {
  if (!text) return [];

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records: ScoreRecord[] = [];
  let currentCollege = defaultCollege || '';
  let currentGroup = defaultGroup || '';

  for (const line of lines) {
    // 识别大学名称（格式：700大学名称 或 大学名称）
    const collegeMatch = line.match(/^(?:\d{3})?\s*(.+?(?:大学|学院|学校)(?:\([^)]+\))?)\s*$/);
    if (collegeMatch && line.length < 60 && !line.includes('录取') && !line.includes('分数')) {
      currentCollege = collegeMatch[1].trim();
      continue;
    }

    // 识别选考科目组
    if (line.match(/^\d{3}\s+/) || line.includes('选考')) {
      if (line.match(/^\d{3}\s+/)) {
        currentGroup = line;
      }
      continue;
    }

    // 尝试解析分数线数据行
    // 格式：专业名称 录取数 最高分 最低分 平均分 ... (可能有多组年份数据)
    const parts = line.split(/\s+/);
    if (parts.length >= 4 && currentCollege) {
      // 检查最后几个是否是数字（分数）
      const lastParts = parts.slice(-12); // 最多12个数字字段（3年 x 4个指标）
      const numbers = lastParts.filter(p => /^\d+$/.test(p));

      if (numbers.length >= 4) {
        // 找到专业名称的结束位置
        let nameEnd = 0;
        for (let i = 0; i < parts.length; i++) {
          if (/^\d+$/.test(parts[i]) && i > 0) {
            nameEnd = i;
            break;
          }
        }

        if (nameEnd > 0) {
          const name = parts.slice(0, nameEnd).join(' ');
          const nums = parts.slice(nameEnd);

          const record: ScoreRecord = {
            院校: currentCollege,
            选考科目: currentGroup,
            专业名称: name,
            '2025_录取数': nums[0] || '',
            '2025_最高分': nums[1] || '',
            '2025_最低分': nums[2] || '',
            '2025_平均分': nums[3] || '',
            '2024_录取数': nums[4] || '',
            '2024_最高分': nums[5] || '',
            '2024_最低分': nums[6] || '',
            '2024_平均分': nums[7] || '',
            '2023_录取数': nums[8] || '',
            '2023_最高分': nums[9] || '',
            '2023_最低分': nums[10] || '',
            '2023_平均分': nums[11] || '',
          };

          records.push(record);
        }
      }
    }
  }

  // 只返回与当前大学相关的记录（支持特殊名称映射）
  return records.filter(r => matchesCollegeName(r.院校, collegeName));
}

const AdmissionDataViewer: React.FC<AdmissionDataViewerProps> = ({ collegeName, className = '', fullWidth = false }) => {
  const [activeTab, setActiveTab] = useState<TabId>('plan-history');
  const [pageMapping, setPageMapping] = useState<Record<string, Record<string, number[]>> | null>(null);
  const [pageTexts, setPageTexts] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  // PDF 内嵌查看器状态
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfViewerPage, setPdfViewerPage] = useState(1);
  const [pdfSearchText, setPdfSearchText] = useState('');
  const [pdfSearchResults, setPdfSearchResults] = useState<number[]>([]);
  const [pdfSearchIndex, setPdfSearchIndex] = useState(0);

  const currentConfig = PDF_CONFIGS.find(c => c.id === activeTab);

  // 加载页码映射
  useEffect(() => {
    const loadMapping = async () => {
      try {
        const response = await fetch('/data/fujian-pdf-pages.json');
        if (response.ok) {
          const data = await response.json();
          setPageMapping(data);
        }
      } catch (err) {
        console.error('加载页码映射失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMapping();
  }, []);

  // 加载当前 PDF 的文本数据
  useEffect(() => {
    if (!currentConfig) return;

    const loadTexts = async () => {
      const cacheKey = currentConfig.file;
      if (pageTexts[cacheKey]) return;

      try {
        const response = await fetch(`/data/fujian-pdf-texts-${cacheKey}.json`);
        if (response.ok) {
          const data = await response.json();
          setPageTexts(prev => ({ ...prev, [cacheKey]: data }));
        }
      } catch (err) {
        console.error('加载文本数据失败:', err);
      }
    };

    loadTexts();
  }, [currentConfig, pageTexts]);

  // 特殊名称映射（学校改名等特殊情况）
  const SPECIAL_NAME_MAP: Record<string, string[]> = {
    '闽江大学': ['闽江学院'],
  };

  // 查找当前大学的页码
  const collegePages = useMemo(() => {
    if (!pageMapping || !currentConfig) return [];

    const pdfMapping = pageMapping[`${currentConfig.file}.pdf`];
    if (!pdfMapping) return [];

    // 精确匹配
    if (pdfMapping[collegeName]) {
      return pdfMapping[collegeName];
    }

    // 检查特殊名称映射
    const altNames = SPECIAL_NAME_MAP[collegeName] || [];
    for (const altName of altNames) {
      if (pdfMapping[altName]) {
        return pdfMapping[altName];
      }
    }

    // 模糊匹配
    const normalizedName = collegeName.replace(/[（(].*[)）]/, '').trim();

    for (const [key, pages] of Object.entries(pdfMapping)) {
      const normalizedKey = key.replace(/[（(].*[)）]/, '').trim();
      if (
        normalizedKey === normalizedName ||
        key.includes(normalizedName) ||
        normalizedName.includes(normalizedKey)
      ) {
        return pages;
      }
    }

    // 模糊匹配特殊名称
    for (const altName of altNames) {
      const normalizedAlt = altName.replace(/[（(].*[)）]/, '').trim();
      for (const [key, pages] of Object.entries(pdfMapping)) {
        const normalizedKey = key.replace(/[（(].*[)）]/, '').trim();
        if (
          normalizedKey === normalizedAlt ||
          key.includes(normalizedAlt) ||
          normalizedAlt.includes(normalizedKey)
        ) {
          return pages;
        }
      }
    }

    return [];
  }, [pageMapping, currentConfig, collegeName]);

  // 解析当前页面的表格数据
  // 跨页延续逻辑：根据 collegePages 列表确定前一页是否属于当前院校，避免可变 ref 导致的导航顺序依赖问题
  const tableData = useMemo(() => {
    if (!currentConfig) return null;

    const texts = pageTexts[currentConfig.file];
    if (!texts) return null;

    const text = texts[String(currentPage)];
    if (!text) return null;

    // 确定性跨页延续：如果前一页也在当前院校的页码列表中，则延续院校名称
    const prevPageInList = collegePages.includes(currentPage - 1);

    if (currentConfig.isPlan) {
      let defaultCollege = '';
      let defaultGroup = '';

      if (prevPageInList) {
        defaultCollege = collegeName;
        // 从前一页文本中获取最后出现的专业组
        const prevText = texts[String(currentPage - 1)];
        if (prevText) {
          const prevLines = prevText.split('\n').map(l => l.trim()).filter(Boolean);
          for (const line of prevLines) {
            if (line.includes('专业组')) {
              defaultGroup = line;
            }
          }
        }
      }

      const data = parseAdmissionPlan(text, collegeName, defaultCollege, defaultGroup);
      return { type: 'plan' as const, data };
    } else {
      let defaultCollege = '';
      let defaultGroup = '';

      if (prevPageInList) {
        defaultCollege = collegeName;
        // 从前一页文本中获取最后出现的选考科目组
        const prevText = texts[String(currentPage - 1)];
        if (prevText) {
          const prevLines = prevText.split('\n').map(l => l.trim()).filter(Boolean);
          for (const line of prevLines) {
            if (line.match(/^\d{3}\s+/) || line.includes('选考')) {
              if (line.match(/^\d{3}\s+/)) {
                defaultGroup = line;
              }
            }
          }
        }
      }

      const data = parseScoreLine(text, collegeName, defaultCollege, defaultGroup);
      return { type: 'score' as const, data };
    }
  }, [pageTexts, currentConfig, currentPage, collegeName, collegePages]);

  // 搜索功能
  const handleSearch = () => {
    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    if (!pageMapping || !currentConfig) return;

    const pdfMapping = pageMapping[`${currentConfig.file}.pdf`];
    if (!pdfMapping) return;

    const results: number[] = [];
    const searchLower = searchText.toLowerCase();

    for (const [key, pages] of Object.entries(pdfMapping)) {
      if (key.toLowerCase().includes(searchLower)) {
        results.push(...pages);
      }
    }

    const uniqueResults = [...new Set(results)].sort((a, b) => a - b);
    setSearchResults(uniqueResults);
    setCurrentSearchIndex(0);

    if (uniqueResults.length > 0) {
      setCurrentPage(uniqueResults[0]);
    }
  };

  // 跳转到下一个/上一个搜索结果
  const goToNextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(nextIndex);
      setCurrentPage(searchResults[nextIndex]);
    }
  };

  const goToPrevSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(prevIndex);
      setCurrentPage(searchResults[prevIndex]);
    }
  };

  // 切换 Tab 或学校时重置页码
  useEffect(() => {
    if (collegePages.length > 0) {
      setCurrentPage(collegePages[0]);
    } else {
      setCurrentPage(1);
    }
    setSearchResults([]);
    setSearchText('');
  }, [activeTab, collegeName]); // Tab变化或学校变化时重置

  // 打开 PDF 查看器时跳转到当前学校页面
  useEffect(() => {
    if (showPdfViewer && currentConfig) {
      const firstPage = collegePages.length > 0 ? collegePages[0] : 1;
      setPdfViewerPage(firstPage);
      setPdfSearchText('');
      setPdfSearchResults([]);
      setPdfSearchIndex(0);
    }
  }, [showPdfViewer]);

  // PDF 查看器内搜索功能（按大学名称搜索页码映射）
  const handlePdfSearch = () => {
    if (!pdfSearchText.trim()) {
      setPdfSearchResults([]);
      return;
    }
    if (!pageMapping || !currentConfig) return;

    const pdfMapping = pageMapping[`${currentConfig.file}.pdf`];
    if (!pdfMapping) return;

    const results: number[] = [];
    const searchLower = pdfSearchText.toLowerCase();

    for (const [key, pages] of Object.entries(pdfMapping)) {
      if (key.toLowerCase().includes(searchLower)) {
        results.push(...pages);
      }
    }

    const uniqueResults = [...new Set(results)].sort((a, b) => a - b);
    setPdfSearchResults(uniqueResults);
    setPdfSearchIndex(0);

    if (uniqueResults.length > 0) {
      setPdfViewerPage(uniqueResults[0]);
    }
  };

  const goToNextPdfSearchResult = () => {
    if (pdfSearchResults.length > 0) {
      const nextIndex = (pdfSearchIndex + 1) % pdfSearchResults.length;
      setPdfSearchIndex(nextIndex);
      setPdfViewerPage(pdfSearchResults[nextIndex]);
    }
  };

  const goToPrevPdfSearchResult = () => {
    if (pdfSearchResults.length > 0) {
      const prevIndex = (pdfSearchIndex - 1 + pdfSearchResults.length) % pdfSearchResults.length;
      setPdfSearchIndex(prevIndex);
      setPdfViewerPage(pdfSearchResults[prevIndex]);
    }
  };

  // 检查当前页面是否有数据
  const hasData = useMemo(() => {
    if (!tableData) return false;
    if (tableData.type === 'plan') {
      return (tableData.data as PlanRecord[]).length > 0;
    } else {
      return (tableData.data as ScoreRecord[]).length > 0;
    }
  }, [tableData]);

  // 如果当前页面没有数据，自动跳转到下一个有数据的页面
  useEffect(() => {
    if (!hasData && collegePages.length > 0) {
      const currentIndex = collegePages.indexOf(currentPage);
      if (currentIndex >= 0 && currentIndex < collegePages.length - 1) {
        setCurrentPage(collegePages[currentIndex + 1]);
      } else if (currentIndex === -1) {
        setCurrentPage(collegePages[0]);
      }
    }
  }, [hasData, collegePages, currentPage]);

  const colorClasses: Record<string, { active: string; inactive: string }> = {
    blue: {
      active: 'bg-blue-600 text-white shadow-md shadow-blue-200',
      inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200',
    },
    teal: {
      active: 'bg-teal-600 text-white shadow-md shadow-teal-200',
      inactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200',
    },
    amber: {
      active: 'bg-amber-600 text-white shadow-md shadow-amber-200',
      inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200',
    },
    violet: {
      active: 'bg-violet-600 text-white shadow-md shadow-violet-200',
      inactive: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200',
    },
  };

  // 获取总页数
  const totalPages = useMemo(() => {
    if (!pageMapping || !currentConfig) return 0;
    const pdfMapping = pageMapping[`${currentConfig.file}.pdf`];
    if (!pdfMapping) return 0;
    return Math.max(...Object.values(pdfMapping).flat());
  }, [pageMapping, currentConfig]);

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-100 p-4 ${className}`}>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // 渲染招生计划表格
  const renderPlanTable = (data: PlanRecord[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p>当前页面未找到 {collegeName} 的招生计划数据</p>
          <p className="text-xs mt-2">尝试使用页码导航查看其他页面</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">专业组</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">专业代号</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">专业名称</th>
              <th className="px-3 py-2 text-center font-medium text-gray-700 whitespace-nowrap">学制</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">计划人数</th>
              <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">收费标准</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">备注</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap" title={record.专业组}>{record.专业组 || '-'}</td>
                <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{record.专业代号}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{record.专业名称}</td>
                <td className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">{record.学制}</td>
                <td className="px-3 py-2 text-right text-gray-800 whitespace-nowrap">{record.计划人数}</td>
                <td className="px-3 py-2 text-right text-gray-800 whitespace-nowrap">{record.收费标准}</td>
                <td className="px-3 py-2 text-gray-500 text-xs max-w-[200px] truncate" title={record.备注}>{record.备注}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 渲染分数线表格
  const renderScoreTable = (data: ScoreRecord[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center text-gray-500 py-8">
          <p>当前页面未找到 {collegeName} 的分数线数据</p>
          <p className="text-xs mt-2">尝试使用页码导航查看其他页面</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">院校</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">选考科目</th>
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">专业名称</th>
              <th className="px-2 py-2 text-center font-medium text-gray-700 whitespace-nowrap" colSpan={4}>2025年</th>
              <th className="px-2 py-2 text-center font-medium text-gray-700 whitespace-nowrap" colSpan={4}>2024年</th>
              <th className="px-2 py-2 text-center font-medium text-gray-700 whitespace-nowrap" colSpan={4}>2023年</th>
            </tr>
            <tr className="bg-gray-50">
              <th className="px-3 py-1 text-left font-medium text-gray-600 whitespace-nowrap"></th>
              <th className="px-3 py-1 text-left font-medium text-gray-600 whitespace-nowrap"></th>
              <th className="px-3 py-1 text-left font-medium text-gray-600 whitespace-nowrap"></th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">录取数</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最高分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最低分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">平均分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">录取数</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最高分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最低分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">平均分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">录取数</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最高分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">最低分</th>
              <th className="px-2 py-1 text-right font-medium text-gray-600 text-xs whitespace-nowrap">平均分</th>
            </tr>
          </thead>
          <tbody>
            {data.map((record, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{record.院校}</td>
                <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap" title={record.选考科目}>{record.选考科目 || '-'}</td>
                <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{record.专业名称}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2025_录取数']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2025_最高分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2025_最低分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2025_平均分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2024_录取数']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2024_最高分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2024_最低分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2024_平均分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2023_录取数']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2023_最高分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2023_最低分']}</td>
                <td className="px-2 py-2 text-right text-gray-700 whitespace-nowrap">{record['2023_平均分']}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
    <div className={`bg-white rounded-xl border border-gray-100 overflow-hidden mb-3 ${className}`}>
      <div className="p-4">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-orange-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-gray-800">福建录取情况</h3>
        </div>

        <p className="text-xs text-gray-500 mb-3">
          {collegeName} 在福建的录取数据
        </p>

        {/* AI 数据提示 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-xs text-amber-700 leading-relaxed">
            <span className="font-semibold">⚠ 以下数据由 AI 自动读取，可能存在偏差</span>，请务必点击下方「查看原PDF」对照原始文件核实。
          </p>
        </div>

        {/* 标签页 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PDF_CONFIGS.map(config => {
            const isActive = activeTab === config.id;
            const colors = colorClasses[config.color] || colorClasses.blue;
            return (
              <button
                key={config.id}
                onClick={() => setActiveTab(config.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* 工具栏 */}
        <div className="bg-gray-50 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            {/* 页码控制 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (collegePages.length > 0) {
                    const currentIndex = collegePages.indexOf(currentPage);
                    if (currentIndex > 0) {
                      setCurrentPage(collegePages[currentIndex - 1]);
                    } else {
                      setCurrentPage(collegePages[collegePages.length - 1]);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
              >
                ‹
              </button>
              <span className="text-sm text-gray-700">
                <span className="font-medium">{currentPage}</span>
                <span className="mx-1">/</span>
                <span>{collegePages.length > 0 ? collegePages[collegePages.length - 1] : totalPages}</span>
              </span>
              <button
                onClick={() => {
                  if (collegePages.length > 0) {
                    const currentIndex = collegePages.indexOf(currentPage);
                    if (currentIndex < collegePages.length - 1) {
                      setCurrentPage(collegePages[currentIndex + 1]);
                    } else {
                      setCurrentPage(collegePages[0]);
                    }
                  }
                }}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
              >
                ›
              </button>
            </div>

            {/* 搜索框 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜索大学名称..."
                className="px-3 py-1.5 border border-gray-300 rounded text-sm w-40"
              />
              <button
                onClick={handleSearch}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                搜索
              </button>
              {searchResults.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrevSearchResult}
                    className="px-2 py-1.5 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-gray-600">
                    {currentSearchIndex + 1}/{searchResults.length}
                  </span>
                  <button
                    onClick={goToNextSearchResult}
                    className="px-2 py-1.5 bg-white hover:bg-gray-100 rounded text-sm border border-gray-200"
                  >
                    ›
                  </button>
                </div>
              )}
            </div>

            {/* 页码快速跳转 */}
            {collegePages.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">相关:</span>
                {collegePages.slice(0, 5).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                {collegePages.length > 5 && (
                  <span className="text-xs text-gray-500">...</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 表格内容展示 */}
        <div ref={tableRef} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${fullWidth ? 'max-h-[70vh]' : 'max-h-[50vh]'} overflow-y-auto`}>
          {loading ? (
            <div className="text-center text-gray-500 py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>加载中...</p>
            </div>
          ) : tableData ? (
            tableData.type === 'plan' ? (
              renderPlanTable(tableData.data as PlanRecord[])
            ) : (
              renderScoreTable(tableData.data as ScoreRecord[])
            )
          ) : (
            <div className="text-center text-gray-500 py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>当前页面未找到 {collegeName} 的数据</p>
              <p className="text-xs mt-2">尝试使用页码导航查看其他页面</p>
            </div>
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {currentConfig?.file}.pdf - 第 {currentPage} 页
            {collegePages.length > 0 && (
              <span className="ml-2 text-blue-500">
                (相关页码: {collegePages[0]}-{collegePages[collegePages.length - 1]})
              </span>
            )}
          </p>
          <button
            onClick={() => setShowPdfViewer(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            title="嵌入式查看原始PDF，自动跳转到该校页面"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            查看原PDF
          </button>
        </div>
      </div>
    </div>

    {/* PDF 内嵌查看器弹窗 */}
    {showPdfViewer && currentConfig && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPdfViewer(false)}>
        <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-semibold text-gray-800">{currentConfig.file}.pdf</span>
              <span className="text-xs text-gray-500">— 已跳转至 {collegeName}</span>
            </div>

            {/* 搜索框 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pdfSearchText}
                onChange={(e) => setPdfSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePdfSearch()}
                placeholder="搜索大学名称..."
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-44 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handlePdfSearch}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
              {pdfSearchResults.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={goToPrevPdfSearchResult}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-gray-600 whitespace-nowrap">
                    {pdfSearchIndex + 1}/{pdfSearchResults.length}
                  </span>
                  <button
                    onClick={goToNextPdfSearchResult}
                    className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                  >
                    ›
                  </button>
                </div>
              )}
              <button
                onClick={() => setShowPdfViewer(false)}
                className="ml-2 px-2 py-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                title="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* PDF 渲染区域 */}
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              url={`/fujian-pdfs/${currentConfig.file}.pdf`}
              initialPage={collegePages.length > 0 ? collegePages[0] : 1}
              controlledPage={pdfViewerPage}
              onPageChange={setPdfViewerPage}
              className="h-full"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default AdmissionDataViewer;
