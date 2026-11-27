export interface WeatherProvinceOption {
  code: string;
  label: string;
}

export const WEATHER_PROVINCES: WeatherProvinceOption[] = [
  { code: "BEIJING", label: "北京" },
  { code: "TIANJIN", label: "天津" },
  { code: "HEBEI", label: "河北" },
  { code: "SHANXI", label: "山西" },
  { code: "INNER_MONGOLIA", label: "内蒙古" },
  { code: "LIAONING", label: "辽宁" },
  { code: "JILIN", label: "吉林" },
  { code: "HEILONGJIANG", label: "黑龙江" },
  { code: "SHANGHAI", label: "上海" },
  { code: "JIANGSU", label: "江苏" },
  { code: "ZHEJIANG", label: "浙江" },
  { code: "ANHUI", label: "安徽" },
  { code: "FUJIAN", label: "福建" },
  { code: "JIANGXI", label: "江西" },
  { code: "SHANDONG", label: "山东" },
  { code: "HENAN", label: "河南" },
  { code: "HUBEI", label: "湖北" },
  { code: "HUNAN", label: "湖南" },
  { code: "GUANGDONG", label: "广东" },
  { code: "GUANGXI", label: "广西" },
  { code: "HAINAN", label: "海南" },
  { code: "CHONGQING", label: "重庆" },
  { code: "SICHUAN", label: "四川" },
  { code: "GUIZHOU", label: "贵州" },
  { code: "YUNNAN", label: "云南" },
  { code: "TIBET", label: "西藏" },
  { code: "SHAANXI", label: "陕西" },
  { code: "GANSU", label: "甘肃" },
  { code: "QINGHAI", label: "青海" },
  { code: "NINGXIA", label: "宁夏" },
  { code: "XINJIANG", label: "新疆" },
  { code: "TAIWAN", label: "台湾" },
  { code: "HONG_KONG", label: "香港" },
  { code: "MACAU", label: "澳门" },
];

export const DEFAULT_WEATHER_PROVINCE = "MACAU";

export function weatherProvinceLabel(code: string | null | undefined): string {
  return WEATHER_PROVINCES.find((item) => item.code === code)?.label ?? "澳门";
}
