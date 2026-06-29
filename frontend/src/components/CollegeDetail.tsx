import React, { useState } from 'react';
import type { College } from '../types/college';
import AdmissionDataViewer from './AdmissionDataViewer';

interface CollegeDetailProps {
  college: College;
  onClose: () => void;
  onOpenFullPage?: () => void;
}

const InfoSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; iconColor?: string }> = ({ title, icon, children, defaultOpen = true, iconColor = 'text-blue-600' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

const InfoItem: React.FC<{ label: string; value: string | null }> = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 w-24 flex-shrink-0 text-sm">{label}</span>
      <span className="text-gray-800 text-sm flex-1">{value}</span>
    </div>
  );
};

const CollegeDetail: React.FC<CollegeDetailProps> = ({ college, onClose, onOpenFullPage }) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-4 sm:p-6 text-white relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1.5 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="pr-8">
          <h2 className="text-xl sm:text-2xl font-bold">{college.院校名称}</h2>
          <p className="text-blue-100 mt-1 text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {college.院校地址}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">{college.省份}</span>
          <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">{college.城市}</span>
          <span className="px-2.5 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm">{college.城市类}</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            college.层次 === '本科' ? 'bg-blue-500/50' : 'bg-orange-500/50'
          } backdrop-blur-sm`}>
            {college.层次}
          </span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            college.性质 === '公办' ? 'bg-green-500/50' : 'bg-purple-500/50'
          } backdrop-blur-sm`}>
            {college.性质}
          </span>
          {onOpenFullPage && (
            <button
              onClick={onOpenFullPage}
              className="ml-auto px-4 py-2 bg-white hover:bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            >
              查看详情
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4 max-h-[calc(100vh-300px)] overflow-y-auto">
        {/* 校区信息 */}
        {college['⭐存在多校区'] && (
          <InfoSection
            title="校区信息"
            iconColor="text-cyan-600"
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          >
            <InfoItem label="校区" value={college['⭐存在多校区']} />
          </InfoSection>
        )}

        {/* 宿舍条件 */}
        <InfoSection
          title="宿舍条件"
          iconColor="text-blue-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          }
        >
          <InfoItem label="上床下桌" value={college.上床下桌} />
          <InfoItem label="几人间" value={college.几人间} />
          <InfoItem label="宿舍空调" value={college.宿舍空调} />
          <InfoItem label="教室空调" value={college.教室空调} />
          <InfoItem label="独立卫浴" value={college.独立卫浴} />
          <InfoItem label="洗澡热水" value={college.洗澡热水时段} />
          <InfoItem label="洗衣机" value={college.洗衣机} />
          <InfoItem label="宿舍限电" value={college.宿舍限电瓦数} />
        </InfoSection>

        {/* 管理情况 */}
        <InfoSection
          title="管理情况"
          defaultOpen={false}
          iconColor="text-amber-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        >
          <InfoItem label="通宵自习室" value={college.通宵自习室} />
          <InfoItem label="夜间断电" value={college.夜间断电} />
          <InfoItem label="夜间断网" value={college.夜间断网} />
          <InfoItem label="查寝情况" value={college.查寝情况} />
          <InfoItem label="门禁时间" value={college.晚归门禁时间} />
          <InfoItem label="早晚自习" value={college.早晚自习} />
          <InfoItem label="晨跑要求" value={college.晨跑要求} />
          <InfoItem label="跑步打卡" value={college.跑步打卡要求} />
          <InfoItem label="大一带电脑" value={college.大一带电脑} />
        </InfoSection>

        {/* 网络设施 */}
        <InfoSection
          title="网络设施"
          defaultOpen={false}
          iconColor="text-teal-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.858 15.355-5.858 21.213 0" />
            </svg>
          }
        >
          <InfoItem label="校园网速度" value={college.校园网速度} />
          <InfoItem label="校园网价格" value={college.校园网价格} />
        </InfoSection>

        {/* 交通出行 */}
        <InfoSection
          title="交通出行"
          defaultOpen={false}
          iconColor="text-orange-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        >
          <InfoItem label="地铁" value={college.地铁} />
          <InfoItem label="市区距离" value={college['⭐市区距离']} />
          <InfoItem label="交通便利" value={college.学校交通便利} />
          <InfoItem label="共享单车" value={college.共享单车} />
        </InfoSection>

        {/* 生活服务 */}
        <InfoSection
          title="生活服务"
          defaultOpen={false}
          iconColor="text-rose-600"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
            </svg>
          }
        >
          <InfoItem label="点外卖" value={college.点外卖} />
          <InfoItem label="食堂价格" value={college.食堂价格感受} />
          <InfoItem label="超市价格" value={college.超市价格感受} />
          <InfoItem label="收发快递" value={college.收发快递} />
        </InfoSection>

        {/* 福建录取情况 */}
        <AdmissionDataViewer collegeName={college.院校名称} />
      </div>
    </div>
  );
};

export default CollegeDetail;
