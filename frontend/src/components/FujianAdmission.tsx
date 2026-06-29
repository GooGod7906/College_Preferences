import React, { useState, useEffect, useMemo } from 'react';
import PdfViewer from './PdfViewer';

interface FujianAdmissionProps {
  collegeName: string;
}

interface PageMapping {
  [pdfName: string]: {
    [collegeName: string]: number[];
  };
}

const FujianAdmission: React.FC<FujianAdmissionProps> = ({ collegeName }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'physics' | 'plan-history' | 'plan-physics'>('history');
  const [pageMapping, setPageMapping] = useState<PageMapping | null>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    {
      id: 'history' as const,
      label: '历史组分数线',
      file: '2023-2025福建分数线（历史组）.pdf',
      color: 'blue',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'physics' as const,
      label: '物理组分数线',
      file: '2023-2025福建分数线（物理组）.pdf',
      color: 'teal',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
    {
      id: 'plan-history' as const,
      label: '历史组招生计划',
      file: '2026招生计划（历史组）.pdf',
      color: 'amber',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      id: 'plan-physics' as const,
      label: '物理组招生计划',
      file: '2026招生计划（物理组）.pdf',
      color: 'violet',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ];

  // 加载页码映射数据
  useEffect(() => {
    const loadPageMapping = async () => {
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

    loadPageMapping();
  }, []);

  const currentTab = tabs.find(t => t.id === activeTab);

  // 查找当前大学在 PDF 中的页码
  const initialPage = useMemo(() => {
    if (!pageMapping || !currentTab) return 1;

    const pdfMapping = pageMapping[currentTab.file];
    if (!pdfMapping) return 1;

    // 精确匹配
    if (pdfMapping[collegeName]) {
      return pdfMapping[collegeName][0];
    }

    // 模糊匹配：查找包含大学名称的条目
    // 例如："闽江大学" 应该匹配 "闽江大学（中外合作）"
    const normalizedName = collegeName.replace(/[（(].*[)）]/, '').trim();

    for (const [key, pages] of Object.entries(pdfMapping)) {
      const normalizedKey = key.replace(/[（(].*[)）]/, '').trim();
      if (normalizedKey === normalizedName || key.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
        return pages[0];
      }
    }

    return 1;
  }, [pageMapping, currentTab, collegeName]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
      <div className="p-4">
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

        {/* 标签页 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const colorClasses: Record<string, { active: string; inactive: string }> = {
              blue: { active: 'bg-blue-600 text-white shadow-md shadow-blue-200', inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' },
              teal: { active: 'bg-teal-600 text-white shadow-md shadow-teal-200', inactive: 'bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200' },
              amber: { active: 'bg-amber-600 text-white shadow-md shadow-amber-200', inactive: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
              violet: { active: 'bg-violet-600 text-white shadow-md shadow-violet-200', inactive: 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200' },
            };
            const colors = colorClasses[tab.color] || colorClasses.blue;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? colors.active : colors.inactive
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* PDF 查看器 */}
        {loading ? (
          <div className="bg-gray-100 rounded-xl p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">加载中...</p>
          </div>
        ) : (
          <PdfViewer
            url={`/fujian-pdfs/${currentTab?.file}`}
            initialPage={initialPage}
            className="h-[70vh] min-h-[500px]"
          />
        )}

        {/* 底部信息栏 */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">
            {currentTab?.file}
          </p>
          <a
            href={`/fujian-pdfs/${currentTab?.file}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            在新标签页打开 ↗
          </a>
        </div>
      </div>
    </div>
  );
};

export default FujianAdmission;
