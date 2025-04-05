/**
 * 散点图示例数据
 * 包含多个数据点，每个数据点有多个数值字段用于3D坐标映射
 */

const sampleScatterData = [
  {
    name: '北京',
    gdp: 3.86,
    population: 21.54,
    area: 16410,
    density: 1312,
    income: 67.8
  },
  {
    name: '上海',
    gdp: 4.32,
    population: 24.87,
    area: 6340,
    density: 3923,
    income: 76.1
  },
  {
    name: '广州',
    gdp: 2.82,
    population: 18.67,
    area: 7434,
    density: 2511,
    income: 63.4
  },
  {
    name: '深圳',
    gdp: 3.24,
    population: 17.56,
    area: 1997,
    density: 8793,
    income: 72.5
  },
  {
    name: '成都',
    gdp: 2.02,
    population: 16.33,
    area: 14335,
    density: 1139,
    income: 58.2
  },
  {
    name: '重庆',
    gdp: 2.78,
    population: 32.05,
    area: 82400,
    density: 389,
    income: 52.7
  },
  {
    name: '杭州',
    gdp: 2.02,
    population: 12.47,
    area: 16853,
    density: 740,
    income: 68.3
  },
  {
    name: '武汉',
    gdp: 1.89,
    population: 13.59,
    area: 8494,
    density: 1600,
    income: 54.9
  },
  {
    name: '西安',
    gdp: 1.38,
    population: 12.95,
    area: 10752,
    density: 1204,
    income: 51.2
  },
  {
    name: '南京',
    gdp: 1.82,
    population: 9.31,
    area: 6587,
    density: 1413,
    income: 64.5
  },
  {
    name: '天津',
    gdp: 1.57,
    population: 13.86,
    area: 11760,
    density: 1178,
    income: 59.3
  },
  {
    name: '苏州',
    gdp: 2.27,
    population: 10.75,
    area: 8488,
    density: 1266,
    income: 71.2
  },
  {
    name: '郑州',
    gdp: 1.35,
    population: 12.60,
    area: 7446,
    density: 1692,
    income: 53.8
  },
  {
    name: '长沙',
    gdp: 1.42,
    population: 8.39,
    area: 11819,
    density: 710,
    income: 56.7
  },
  {
    name: '青岛',
    gdp: 1.48,
    population: 9.39,
    area: 11282,
    density: 832,
    income: 60.4
  }
];

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleScatterData = sampleScatterData;

export default sampleScatterData;