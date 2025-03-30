/**
 * 网络图示例数据
 * 包含节点(nodes)和连接(links)的数据结构
 */

const sampleNetworkData = {
  nodes: [
    { id: 1, name: '北京', group: 0 },
    { id: 2, name: '上海', group: 0 },
    { id: 3, name: '广州', group: 0 },
    { id: 4, name: '深圳', group: 0 },
    { id: 5, name: '成都', group: 1 },
    { id: 6, name: '重庆', group: 1 },
    { id: 7, name: '杭州', group: 2 },
    { id: 8, name: '武汉', group: 2 },
    { id: 9, name: '西安', group: 3 },
    { id: 10, name: '南京', group: 2 }
  ],
  links: [
    { source: 1, target: 2, value: 5 },
    { source: 1, target: 3, value: 3 },
    { source: 1, target: 4, value: 4 },
    { source: 1, target: 5, value: 2 },
    { source: 2, target: 7, value: 4 },
    { source: 2, target: 8, value: 2 },
    { source: 2, target: 10, value: 3 },
    { source: 3, target: 4, value: 5 },
    { source: 3, target: 6, value: 2 },
    { source: 4, target: 5, value: 3 },
    { source: 5, target: 6, value: 4 },
    { source: 5, target: 9, value: 2 },
    { source: 6, target: 8, value: 3 },
    { source: 7, target: 10, value: 4 },
    { source: 8, target: 9, value: 3 },
    { source: 9, target: 10, value: 2 }
  ]
};

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleNetworkData = sampleNetworkData;

export default sampleNetworkData;