/**
 * 饼图示例数据
 * 包含分类和对应的数值
 */

const samplePieData = [
  {
    category: '北京',
    value: 21.54
  },
  {
    category: '上海',
    value: 24.87
  },
  {
    category: '广州',
    value: 18.67
  },
  {
    category: '深圳',
    value: 17.56
  },
  {
    category: '成都',
    value: 16.33
  },
  {
    category: '重庆',
    value: 32.05
  },
  {
    category: '杭州',
    value: 12.47
  },
  {
    category: '武汉',
    value: 13.59
  }
];

// 将示例数据添加到全局window对象，以便在main.js中访问
window.samplePieData = samplePieData;

export default samplePieData;
