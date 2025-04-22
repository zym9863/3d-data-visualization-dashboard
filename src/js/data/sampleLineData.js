/**
 * 折线图示例数据
 * 包含时间序列数据，适合用于3D折线图可视化
 */

const sampleLineData = {
  // 时间点（X轴）
  timePoints: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  
  // 多条折线数据
  series: [
    {
      name: '北京',
      values: [5, 7, 12, 18, 23, 28, 30, 29, 24, 18, 12, 6],
      color: 0x3498db // 蓝色
    },
    {
      name: '上海',
      values: [8, 9, 13, 19, 24, 28, 31, 31, 27, 21, 15, 9],
      color: 0x2ecc71 // 绿色
    },
    {
      name: '广州',
      values: [14, 15, 18, 22, 26, 29, 31, 31, 29, 25, 20, 16],
      color: 0xe74c3c // 红色
    },
    {
      name: '哈尔滨',
      values: [-18, -12, -2, 8, 16, 22, 25, 22, 15, 6, -5, -14],
      color: 0xf39c12 // 橙色
    },
    {
      name: '拉萨',
      values: [0, 3, 7, 11, 15, 19, 18, 17, 16, 11, 5, 1],
      color: 0x9b59b6 // 紫色
    }
  ],
  
  // 元数据（可选）
  metadata: {
    title: '中国主要城市月平均温度(°C)',
    description: '展示中国5个城市12个月的平均温度数据',
    source: '国家气象数据中心'
  }
};

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleLineData = sampleLineData;

export default sampleLineData;
