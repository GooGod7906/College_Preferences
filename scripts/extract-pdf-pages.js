/**
 * PDF 页码提取脚本
 * 扫描所有 PDF 文件，提取每页的大学名称和结构化表格数据
 *
 * 使用方法：node scripts/extract-pdf-pages.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

// Node.js 环境 polyfill
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() {}
  };
}
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    constructor() {}
  };
}
if (typeof globalThis.Path2D === 'undefined') {
  globalThis.Path2D = class Path2D {
    constructor() {}
  };
}

const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');

// 设置 worker 路径
const workerPath = join(import.meta.dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');
GlobalWorkerOptions.workerSrc = `file:///${workerPath.replace(/\\/g, '/')}`;

const PDF_DIR = join(import.meta.dirname, '..', 'frontend', 'public', 'fujian-pdfs');
const OUTPUT_DIR = join(import.meta.dirname, '..', 'frontend', 'public', 'data');
const CMAP_DIR = join(import.meta.dirname, 'node_modules', 'pdfjs-dist', 'cmaps') + '/';

/**
 * 根据文本项的位置拼接文本
 * 同一行的文本项（y坐标相近）拼接在一起，不同行用换行分隔
 */
function buildTextFromItems(items) {
  if (!items || items.length === 0) return '';

  // 按y坐标分组（同一行的文本y坐标相近）
  const lines = [];
  let currentLine = [];
  let lastY = null;
  const Y_THRESHOLD = 3; // y坐标差异阈值

  for (const item of items) {
    const y = item.transform[5]; // y坐标

    if (lastY === null || Math.abs(y - lastY) < Y_THRESHOLD) {
      // 同一行
      currentLine.push(item);
    } else {
      // 新的一行
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      currentLine = [item];
    }
    lastY = y;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 每行内的文本项按x坐标排序后拼接
  const textLines = lines.map(line => {
    // 按x坐标排序
    line.sort((a, b) => a.transform[4] - b.transform[4]);
    return line.map(item => item.str).join('');
  });

  return textLines.join('\n');
}

/**
 * 从文本中提取大学名称（仅用于招生计划PDF）
 * 招生计划格式：大学名称 + 招生人数 + 地区 + 性质
 * 例如：福州大学 2365 (福州市)(公办)
 */
function extractCollegeNamesFromPlan(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const colleges = [];

  for (const line of lines) {
    // 招生计划中的大学名称格式：大学/学院/学校名称 + 空格 + 数字 + (地区)(性质)
    // 排除：以数字开头的专业行（如 "002 商务经济学 四 7 5460 在福州大学城..."）
    // 排除：包含"在...校区"的行（这些是专业备注）
    if (
      line.match(/(?:大学|学院|学校)(?:\s|$)/) &&
      !line.match(/^\d{3}\s/) && // 排除以3位数字开头的专业行
      !line.includes('在') && // 排除包含"在...校区"的行
      !line.includes('校区') && // 排除校区相关行
      !line.includes('培养') && // 排除培养相关行
      !line.includes('招生计划') &&
      !line.includes('分数线') &&
      !line.includes('福建省') &&
      !line.includes('普通高校') &&
      !line.includes('本科批') &&
      !line.includes('专科批') &&
      line.length < 60 &&
      line.length > 2
    ) {
      colleges.push(line);
    }
  }

  return colleges;
}

/**
 * 从文本中提取大学名称（仅用于分数线PDF）
 * 分数线格式：大学名称单独一行，或 前缀代码 + 空格 + 大学名称
 * 例如：福州大学 或 509福州大学
 */
function extractCollegeNamesFromScore(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const colleges = [];

  for (const line of lines) {
    // 分数线中的大学名称格式：
    // 1. 纯大学名称：福州大学、厦门大学
    // 2. 前缀代码 + 大学名称：509福州大学、999福州大学(闽台合作)
    // 3. 大学名称 + 括号变体：福州大学(中外合作)
    const match = line.match(/^(?:\d{3}\s?)?((?:.+?(?:大学|学院|学校))(?:\([^)]+\))?)\s*$/);
    if (
      match &&
      line.length < 50 &&
      !line.includes('录取') &&
      !line.includes('分数') &&
      !line.includes('选考') &&
      !line.includes('最低') &&
      !line.includes('最高') &&
      !line.includes('平均') &&
      !line.includes('人数')
    ) {
      colleges.push(match[1].trim());
    }
  }

  return colleges;
}

/**
 * 解析招生计划文本为表格数据
 */
function parseAdmissionPlan(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];
  let currentCollege = '';
  let currentGroup = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 识别大学名称
    if (
      (line.includes('大学') || line.includes('学院') || line.includes('学校')) &&
      line.length < 50 &&
      !line.includes('招生') &&
      !line.includes('专业')
    ) {
      currentCollege = line;
      continue;
    }

    // 识别专业组
    if (line.includes('专业组')) {
      currentGroup = line;
      continue;
    }

    // 尝试解析专业数据行
    // 格式：专业代号 专业名称 学制 计划人数 收费标准 [备注]
    const match = line.match(/^(\d+)\s+(.+?)\s+(四|三|五|二)\s+(\d+)\s+(\d+)/);
    if (match && currentCollege) {
      records.push({
        院校: currentCollege,
        专业组: currentGroup,
        专业代号: match[1],
        专业名称: match[2],
        学制: match[3],
        计划人数: match[4],
        收费标准: match[5],
        备注: line.substring(match[0].length).trim() || '',
      });
    }
  }

  return records;
}

/**
 * 解析分数线文本为表格数据
 */
function parseScoreLine(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const records = [];
  let currentCollege = '';
  let currentGroup = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 识别大学名称
    if (
      (line.includes('大学') || line.includes('学院') || line.includes('学校')) &&
      line.length < 50 &&
      !line.includes('录取') &&
      !line.includes('分数')
    ) {
      currentCollege = line;
      continue;
    }

    // 识别选考科目组
    if (line.includes('选考') || line.match(/^\d{3}\s+/)) {
      if (line.match(/^\d{3}\s+/)) {
        currentGroup = line;
      }
      continue;
    }

    // 尝试解析分数线数据行
    // 格式：专业名称 录取数 最高分 最低分 平均分 ...
    const parts = line.split(/\s+/);
    if (parts.length >= 5 && currentCollege) {
      // 检查是否包含数字（分数）
      const numbers = parts.filter(p => /^\d+$/.test(p));
      if (numbers.length >= 3) {
        const nameEnd = parts.findIndex(p => /^\d+$/.test(p));
        if (nameEnd > 0) {
          records.push({
            院校: currentCollege,
            选考科目: currentGroup,
            专业名称: parts.slice(0, nameEnd).join(' '),
            数据: parts.slice(nameEnd).join(' '),
          });
        }
      }
    }
  }

  return records;
}

/**
 * 处理单个 PDF 文件
 */
async function processPdf(filePath) {
  const fileName = basename(filePath);
  console.log(`处理文件: ${fileName}`);

  const data = new Uint8Array(readFileSync(filePath));
  const doc = await getDocument({
    data,
    useSystemFonts: true,
    cMapUrl: CMAP_DIR,
    cMapPacked: true,
  }).promise;

  const pageMap = {}; // { 大学名称: [页码数组] }
  const pageTexts = {}; // { 页码: 文本内容 }
  const isPlan = fileName.includes('招生计划');

  // 用于分数线PDF的状态跟踪
  let currentCollegeForScore = '';

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();

    // 使用位置信息正确拼接文本
    const text = buildTextFromItems(textContent.items);

    // 保存每页文本
    pageTexts[i] = text;

    if (isPlan) {
      // 招生计划：每页独立提取大学名称
      const colleges = extractCollegeNamesFromPlan(text);

      for (const college of colleges) {
        if (!pageMap[college]) {
          pageMap[college] = [];
        }
        if (!pageMap[college].includes(i)) {
          pageMap[college].push(i);
        }
      }
    } else {
      // 分数线：需要跟踪当前大学，因为数据可能跨多页
      const colleges = extractCollegeNamesFromScore(text);

      if (colleges.length > 0) {
        // 找到新的大学名称，更新当前大学
        // 取最后一个作为当前页的主大学（因为页面以最后一个大学的数据结束）
        currentCollegeForScore = colleges[colleges.length - 1];

        // 将所有找到的大学都添加到映射中
        for (const college of colleges) {
          if (!pageMap[college]) {
            pageMap[college] = [];
          }
          if (!pageMap[college].includes(i)) {
            pageMap[college].push(i);
          }
        }

        // 如果一页有多个变体（如"福州大学(地矿专业)"、"福州大学(闽台合作)"等），
        // 也将页面添加到基础大学名下
        const baseNames = new Set();
        for (const college of colleges) {
          // 提取基础大学名（去掉括号内容）
          const base = college.replace(/[（(].*[)）]/, '').trim();
          if (base !== college) {
            baseNames.add(base);
          }
        }
        for (const baseName of baseNames) {
          if (!pageMap[baseName]) {
            pageMap[baseName] = [];
          }
          if (!pageMap[baseName].includes(i)) {
            pageMap[baseName].push(i);
          }
        }
      } else if (currentCollegeForScore) {
        // 没有找到新的大学名称，但有当前大学
        // 检查这一页是否有实际数据（非空白页、非纯表头页）
        const hasData = text.split('\n').some(line => {
          const trimmed = line.trim();
          return trimmed && !trimmed.includes('院校/专业名称') && !trimmed.includes('福建省') && !trimmed.includes('普通高校') && !trimmed.includes('高考志愿');
        });

        if (hasData) {
          // 这是当前大学的延续页面
          if (!pageMap[currentCollegeForScore]) {
            pageMap[currentCollegeForScore] = [];
          }
          if (!pageMap[currentCollegeForScore].includes(i)) {
            pageMap[currentCollegeForScore].push(i);
          }
          // 同时添加到基础大学名下（去掉括号内容）
          const baseName = currentCollegeForScore.replace(/[（(].*[)）]/, '').trim();
          if (baseName !== currentCollegeForScore) {
            if (!pageMap[baseName]) {
              pageMap[baseName] = [];
            }
            if (!pageMap[baseName].includes(i)) {
              pageMap[baseName].push(i);
            }
          }
        } else {
          // 空白页或纯表头页，重置当前大学
          currentCollegeForScore = '';
        }
      }
    }

    if (i % 10 === 0) {
      console.log(`  已处理 ${i}/${doc.numPages} 页`);
    }
  }

  console.log(`  完成，共发现 ${Object.keys(pageMap).length} 个大学/分组`);
  return { fileName, pageMap, pageTexts };
}

/**
 * 主函数
 */
async function main() {
  console.log('PDF 页码提取脚本');
  console.log('================\n');

  const pdfFiles = readdirSync(PDF_DIR).filter(f => f.endsWith('.pdf'));
  console.log(`找到 ${pdfFiles.length} 个 PDF 文件\n`);

  const pageMapping = {}; // 页码映射
  const pageTextsAll = {}; // 所有页面文本

  for (const file of pdfFiles) {
    const filePath = join(PDF_DIR, file);
    const { fileName, pageMap, pageTexts } = await processPdf(filePath);
    pageMapping[fileName] = pageMap;
    pageTextsAll[fileName] = pageTexts;
    console.log('');
  }


  // 写入页码映射 JSON
  const mappingFile = join(OUTPUT_DIR, 'fujian-pdf-pages.json');
  writeFileSync(mappingFile, JSON.stringify(pageMapping, null, 2), 'utf-8');
  console.log(`页码映射已保存到: ${mappingFile}`);

  // 写入页面文本 JSON（按PDF分文件）
  for (const [fileName, texts] of Object.entries(pageTextsAll)) {
    const textFile = join(OUTPUT_DIR, `fujian-pdf-texts-${fileName.replace('.pdf', '')}.json`);
    writeFileSync(textFile, JSON.stringify(texts, null, 2), 'utf-8');
    console.log(`页面文本已保存到: ${textFile}`);
  }

  // 统计信息
  let totalPages = 0;
  let totalColleges = 0;
  for (const fileName of Object.keys(pageMapping)) {
    const colleges = Object.keys(pageMapping[fileName]);
    totalColleges += colleges.length;
    for (const pages of Object.values(pageMapping[fileName])) {
      totalPages += pages.length;
    }
  }
  console.log(`\n统计: ${totalColleges} 个大学/分组，共 ${totalPages} 个页面映射`);
}

main().catch(console.error);
