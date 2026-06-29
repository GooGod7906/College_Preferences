import { useState, useEffect, useCallback } from 'react';
import type { College, FilterState } from './types/college';
import { loadColleges } from './data/colleges';
import { filterColleges } from './utils/filters';
import FilterPanel from './components/FilterPanel';
import CollegeList from './components/CollegeList';
import CollegeDetail from './components/CollegeDetail';
import CollegeDetailPage from './components/CollegeDetailPage';
import './App.css';

const defaultFilters: FilterState = {
  省份: [],
  城市: [],
  城市类: [],
  层次: ['本科'],
  性质: ['公办'],
  搜索词: '',
};

function App() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const [showFullPage, setShowFullPage] = useState(false);

  useEffect(() => {
    loadColleges().then(data => {
      setColleges(data);
      setLoading(false);
    });
  }, []);

  const filteredColleges = filterColleges(colleges, filters);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setSelectedCollege(null);
    setShowMobileDetail(false);
  }, []);

  const handleSelectCollege = useCallback((college: College) => {
    setSelectedCollege(college);
    setShowMobileDetail(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedCollege(null);
    setShowMobileDetail(false);
  }, []);

  const handleOpenFullPage = useCallback(() => {
    setShowFullPage(true);
  }, []);

  const handleCloseFullPage = useCallback(() => {
    setShowFullPage(false);
  }, []);

  // 全屏详情页面
  if (showFullPage && selectedCollege) {
    return (
      <CollegeDetailPage
        college={selectedCollege}
        onBack={handleCloseFullPage}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
          </div>
          <p className="text-gray-600 mt-4 font-medium">加载大学数据中...</p>
          <p className="text-gray-400 text-sm mt-1">请稍候</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                高考志愿填报辅助
              </h1>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 hidden sm:block">筛选大学 · 查看宿舍条件 · 参考录取数据</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                {colleges.length} 所大学
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* 左侧筛选面板 - 桌面端固定 */}
          <div className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-20">
              <FilterPanel
                colleges={colleges}
                filters={filters}
                onFilterChange={handleFilterChange}
              />
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            {/* 移动端：列表和详情切换显示 */}
            <div className="lg:hidden">
              {showMobileDetail && selectedCollege ? (
                <div>
                  <button
                    onClick={handleCloseDetail}
                    className="mb-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    返回列表
                  </button>
                  <CollegeDetail
                    college={selectedCollege}
                    onClose={handleCloseDetail}
                    onOpenFullPage={handleOpenFullPage}
                  />
                </div>
              ) : (
                <CollegeList
                  colleges={filteredColleges}
                  onSelect={handleSelectCollege}
                  selectedCollege={selectedCollege}
                />
              )}
            </div>

            {/* 桌面端：并排显示 */}
            <div className="hidden lg:block">
              <CollegeList
                colleges={filteredColleges}
                onSelect={handleSelectCollege}
                selectedCollege={selectedCollege}
              />
            </div>
          </div>

          {/* 桌幕端：详情面板 */}
          {selectedCollege && (
            <div className="hidden lg:block lg:w-96 flex-shrink-0">
              <div className="lg:sticky lg:top-20">
                <CollegeDetail
                  college={selectedCollege}
                  onClose={handleCloseDetail}
                  onOpenFullPage={handleOpenFullPage}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white/50 backdrop-blur-md mt-8 py-4 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-xs">
            数据来源：全国大学宿舍情况及管理情况 · 福建省教育考试院
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
