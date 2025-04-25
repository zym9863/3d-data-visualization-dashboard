/**
 * 面积图示例数据
 * 包含时间序列数据，适合用于3D面积图可视化
 */

const sampleAreaData = {
  // 时间点（X轴）
  timePoints: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  
  // 多个区域数据
  series: [
    {
      name: '北方区域',
      values: [120, 132, 101, 134, 90, 230, 210, 182, 191, 234, 290, 330],
      color: 0x3498db // 蓝色
    },
    {
      name: '南方区域',
      values: [220, 182, 191, 234, 290, 330, 310, 123, 442, 321, 90, 149],
      color: 0x2ecc71 // 绿色
    },
    {
      name: '东部区域',
      values: [150, 232, 201, 154, 190, 330, 410, 182, 191, 234, 290, 330],
      color: 0xe74c3c // 红色
    },
    {
      name: '西部区域',
      values: [98, 77, 101, 99, 40, 150, 160, 92, 71, 120, 190, 210],
      color: 0xf39c12 // 橙色
    }
  ],
  
  // 元数据（可选）
  metadata: {
    title: '各区域月度销售额（万元）',
    description: '展示4个区域12个月的销售数据',
    source: '销售部门'
  }
};

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleAreaData = sampleAreaData;

export default sampleAreaData;
