export interface College {
  省份: string;
  城市: string;
  城市类: string;
  层次: string;
  性质: string;
  院校名称: string;
  院校地址: string;
  '⭐存在多校区': string | null;
  上床下桌: string | null;
  几人间: string | null;
  宿舍空调: string | null;
  教室空调: string | null;
  独立卫浴: string | null;
  洗澡热水时段: string | null;
  洗衣机: string | null;
  通宵自习室: string | null;
  宿舍限电瓦数: string | null;
  夜间断电: string | null;
  夜间断网: string | null;
  校园网速度: string | null;
  校园网价格: string | null;
  大一带电脑: string | null;
  查寝情况: string | null;
  晚归门禁时间: string | null;
  早晚自习: string | null;
  晨跑要求: string | null;
  跑步打卡要求: string | null;
  地铁: string | null;
  '⭐市区距离': string | null;
  学校交通便利: string | null;
  点外卖: string | null;
  食堂价格感受: string | null;
  超市价格感受: string | null;
  收发快递: string | null;
  共享单车: string | null;
}

export interface FilterState {
  省份: string[];
  城市: string[];
  城市类: string[];
  层次: string[];
  性质: string[];
  搜索词: string;
}

export const CITY_LEVELS = ['一线', '新一线', '二线', '三线', '四线', '五线'] as const;
export const LEVELS = ['本科', '专科'] as const;
export const NATURES = ['公办', '民办'] as const;
