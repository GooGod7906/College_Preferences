import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TextLayer } from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

interface PdfViewerProps {
  url: string;
  initialPage?: number;
  className?: string;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ url, initialPage = 1, className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);

  // 加载 PDF 文档
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);
        const doc = await pdfjsLib.getDocument({
          url,
          cMapUrl: '/pdf-cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdf-standard-fonts/',
        }).promise;
        setPdf(doc);
        setTotalPages(doc.numPages);
      } catch (err) {
        setError('无法加载 PDF 文件');
        console.error('PDF 加载错误:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPdf();
  }, [url]);

  // 渲染当前页面
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdf || !canvasRef.current || !textLayerRef.current) return;

    try {
      const page: PDFPageProxy = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d')!;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // 渲染页面
      await page.render({
        canvasContext: context,
        canvas,
        viewport,
      }).promise;

      // 渲染文本层（用于搜索和选择）
      const textContent = await page.getTextContent();
      const textLayer = textLayerRef.current;
      textLayer.innerHTML = '';
      textLayer.style.width = `${viewport.width}px`;
      textLayer.style.height = `${viewport.height}px`;

      // 使用 PDF.js 的文本层渲染
      const textLayerObj = new TextLayer({
        textContentSource: textContent,
        container: textLayer,
        viewport,
      });
      textLayerObj.render();
    } catch (err) {
      console.error('页面渲染错误:', err);
    }
  }, [pdf, scale]);

  // 页面变化时重新渲染
  useEffect(() => {
    if (pdf) {
      renderPage(currentPage);
    }
  }, [pdf, currentPage, renderPage]);

  // 跳转到指定页码
  const goToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    }
  };

  // 搜索功能
  const handleSearch = async () => {
    if (!pdf || !searchText.trim()) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    const searchLower = searchText.toLowerCase();

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const text = textContent.items.map((item: any) => item.str).join(' ').toLowerCase();

      if (text.includes(searchLower)) {
        results.push(i);
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);

    if (results.length > 0) {
      goToPage(results[0]);
    }
  };

  // 跳转到下一个/上一个搜索结果
  const goToNextSearchResult = () => {
    if (searchResults.length > 0) {
      const nextIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(nextIndex);
      goToPage(searchResults[nextIndex]);
    }
  };

  const goToPrevSearchResult = () => {
    if (searchResults.length > 0) {
      const prevIndex = (currentSearchIndex - 1 + searchResults.length) % searchResults.length;
      setCurrentSearchIndex(prevIndex);
      goToPage(searchResults[prevIndex]);
    }
  };

  // 缩放控制
  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载 PDF 中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-xl ${className}`}>
        <div className="text-center text-red-600">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-gray-100 rounded-xl overflow-hidden ${className}`}>
      {/* 工具栏 */}
      <div className="bg-white border-b border-gray-200 p-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* 页码控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
            >
              ‹
            </button>
            <span className="text-sm text-gray-700">
              <input
                type="number"
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 text-center border border-gray-300 rounded px-1 py-0.5"
                min={1}
                max={totalPages}
              />
              <span className="mx-1">/</span>
              <span>{totalPages}</span>
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
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
              className="px-3 py-1.5 border border-gray-300 rounded text-sm w-48"
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
                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  ‹
                </button>
                <span className="text-xs text-gray-600">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button
                  onClick={goToNextSearchResult}
                  className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {/* 缩放控制 */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              −
            </button>
            <span className="text-sm text-gray-700 w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* PDF 渲染区域 */}
      <div ref={containerRef} className="flex-1 overflow-auto p-4">
        <div className="inline-block relative mx-auto">
          <canvas ref={canvasRef} className="block shadow-lg" />
          <div
            ref={textLayerRef}
            className="absolute top-0 left-0 text-transparent"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default PdfViewer;
