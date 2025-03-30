/**
 * 柱状图示例数据
 * 包含多个类别和对应的数值字段
 */

const sampleBarData = [
  {
    category: '北京',
    population: 21.54,
    gdp: 3.86,
    area: 16410
  },
  {
    category: '上海',
    population: 24.87,
    gdp: 4.32,
    area: 6340
  },
  {
    category: '广州',
    population: 18.67,
    gdp: 2.82,
    area: 7434
  },
  {
    category: '深圳',
    population: 17.56,
    gdp: 3.24,
    area: 1997
  },
  {
    category: '成都',
    population: 16.33,
    gdp: 2.02,
    area: 14335
  },
  {
    category: '重庆',
    population: 32.05,
    gdp: 2.78,
    area: 82400
  },
  {
    category: '杭州',
    population: 12.47,
    gdp: 2.02,
    area: 16853
  },
  {
    category: '武汉',
    population: 13.59,
    gdp: 1.89,
    area: 8494
  }
];

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleBarData = sampleBarData;

export default sampleBarData;