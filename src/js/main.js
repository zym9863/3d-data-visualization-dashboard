/**
 * 主入口文件
 * 初始化应用程序并处理用户交互
 */
import { App } from './App.js';
import { DataParser } from './utils/DataParser.js';

// DOM元素
const visualizationContainer = document.getElementById('visualization-container');
const dataFileInput = document.getElementById('data-file');
const visualizationTypeSelect = document.getElementById('visualization-type');
const visualizeBtn = document.getElementById('visualize-btn');
const errorMessage = document.getElementById('error-message');
const loader = document.getElementById('loader');
const resetCameraBtn = document.getElementById('reset-camera');
const sampleBarDataBtn = document.getElementById('sample-bar-data');
const sampleNetworkDataBtn = document.getElementById('sample-network-data');
const sampleScatterDataBtn = document.getElementById('sample-scatter-data');
const sampleSurfaceDataBtn = document.getElementById('sample-surface-data');
const sampleLineDataBtn = document.getElementById('sample-line-data');
const sampleAreaDataBtn = document.getElementById('sample-area-data');
const samplePieDataBtn = document.getElementById('sample-pie-data');
const sampleHeatMapDataBtn = document.getElementById('sample-heat-map-data');
const sampleTreeDataBtn = document.getElementById('sample-tree-data');
const previewContent = document.getElementById('preview-content');

// 初始化应用程序
const app = new App(visualizationContainer);

// 当前数据
let currentData = null;

// 显示错误消息
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
  setTimeout(() => {
    errorMessage.classList.remove('active');
  }, 5000);
}

// 显示加载指示器
function showLoader() {
  loader.classList.add('active');
}

// 隐藏加载指示器
function hideLoader() {
  loader.classList.remove('active');
}

// 创建数据预览
function createDataPreview(data) {
  // 清空预览内容
  previewContent.innerHTML = '';

  if (!data || (Array.isArray(data) && data.length === 0)) {
    previewContent.innerHTML = '<p>无数据可预览</p>';
    return;
  }

  // 处理不同的数据格式
  if (Array.isArray(data)) {
    // 数组格式（表格预览）
    createTablePreview(data);
  } else if (data.nodes && data.links) {
    // 网络图格式
    createNetworkPreview(data);
  } else if (data.values && Array.isArray(data.values)) {
    // 表面图或热力图格式
    if (visualizationTypeSelect.value === 'heat-map') {
      createHeatMapPreview(data);
    } else {
      createSurfacePreview(data);
    }
  } else if (data.series && data.timePoints) {
    // 折线图或面积图格式
    if (visualizationTypeSelect.value === 'area-chart') {
      createAreaChartPreview(data);
    } else {
      createLineChartPreview(data);
    }
  } else if (data.children || (data.id && data.name)) {
    // 树状图格式
    createTreePreview(data);
  } else if (typeof data === 'object') {
    // 其他对象格式
    createObjectPreview(data);
  }
}

// 创建表格预览
function createTablePreview(data) {
  if (data.length === 0) return;

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 创建表头
  const headerRow = document.createElement('tr');
  const sampleItem = data[0];

  for (const key in sampleItem) {
    const th = document.createElement('th');
    th.textContent = key;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 创建表格内容（最多显示5行）
  const maxRows = Math.min(5, data.length);

  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement('tr');
    const item = data[i];

    for (const key in sampleItem) {
      const td = document.createElement('td');
      td.textContent = item[key] !== undefined ? String(item[key]) : '';
      row.appendChild(td);
    }

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  previewContent.appendChild(table);

  // 如果数据超过5行，显示提示信息
  if (data.length > 5) {
    const info = document.createElement('p');
    info.textContent = `显示 ${maxRows} 行，共 ${data.length} 行`;
    previewContent.appendChild(info);
  }
}

// 创建网络图预览
function createNetworkPreview(data) {
  const info = document.createElement('div');

  const nodesInfo = document.createElement('p');
  nodesInfo.textContent = `节点数量: ${data.nodes.length}`;
  info.appendChild(nodesInfo);

  const linksInfo = document.createElement('p');
  linksInfo.textContent = `连接数量: ${data.links.length}`;
  info.appendChild(linksInfo);

  // 显示部分节点信息
  if (data.nodes.length > 0) {
    const nodesList = document.createElement('p');
    const nodesPreview = data.nodes.slice(0, 3).map(node => node.name || node.id).join(', ');
    nodesList.textContent = `节点示例: ${nodesPreview}${data.nodes.length > 3 ? '...' : ''}`;
    info.appendChild(nodesList);
  }

  previewContent.appendChild(info);
}

// 创建树状图预览
function createTreePreview(data) {
  if (!data || (!data.children && !data.id)) {
    previewContent.innerHTML = '<p>无效的树状图数据</p>';
    return;
  }

  const info = document.createElement('div');

  // 添加标题（如果有）
  if (data.metadata && data.metadata.title) {
    const title = document.createElement('p');
    title.innerHTML = `<strong>标题:</strong> ${data.metadata.title}`;
    info.appendChild(title);
  }

  // 计算树的统计信息
  const stats = calculateTreeStats(data);

  // 添加树结构信息
  const nodesInfo = document.createElement('p');
  nodesInfo.innerHTML = `<strong>节点总数:</strong> ${stats.totalNodes}`;
  info.appendChild(nodesInfo);

  const depthInfo = document.createElement('p');
  depthInfo.innerHTML = `<strong>最大深度:</strong> ${stats.maxDepth}`;
  info.appendChild(depthInfo);

  const leavesInfo = document.createElement('p');
  leavesInfo.innerHTML = `<strong>叶子节点数:</strong> ${stats.leafNodes}`;
  info.appendChild(leavesInfo);

  // 创建树结构预览
  const treeTitle = document.createElement('p');
  treeTitle.innerHTML = '<strong>树结构预览:</strong>';
  info.appendChild(treeTitle);

  const treeContainer = document.createElement('div');
  treeContainer.className = 'tree-preview';

  // 递归创建树结构显示
  const treeElement = createTreeElement(data, 0, 3); // 最多显示3层
  treeContainer.appendChild(treeElement);

  info.appendChild(treeContainer);

  previewContent.appendChild(info);

  // 添加树预览的CSS样式
  const style = document.createElement('style');
  style.textContent = `
    .tree-preview {
      font-family: monospace;
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      margin: 10px 0;
      max-height: 300px;
      overflow-y: auto;
    }
    .tree-node {
      margin: 2px 0;
      padding: 2px 0;
    }
    .tree-node-content {
      display: inline-block;
      padding: 2px 6px;
      background: #e3f2fd;
      border-radius: 3px;
      margin-left: 4px;
    }
    .tree-node-value {
      color: #666;
      font-size: 0.9em;
    }
    .tree-indent {
      color: #999;
      margin-right: 4px;
    }
  `;
  document.head.appendChild(style);
}

// 计算树的统计信息
function calculateTreeStats(node, depth = 0) {
  let totalNodes = 1;
  let maxDepth = depth;
  let leafNodes = 0;

  if (!node.children || node.children.length === 0) {
    leafNodes = 1;
  } else {
    node.children.forEach(child => {
      const childStats = calculateTreeStats(child, depth + 1);
      totalNodes += childStats.totalNodes;
      maxDepth = Math.max(maxDepth, childStats.maxDepth);
      leafNodes += childStats.leafNodes;
    });
  }

  return { totalNodes, maxDepth, leafNodes };
}

// 创建树元素显示
function createTreeElement(node, depth, maxDepth) {
  const nodeDiv = document.createElement('div');
  nodeDiv.className = 'tree-node';

  // 创建缩进
  const indent = '│  '.repeat(depth);
  const connector = depth > 0 ? '├─ ' : '';

  const indentSpan = document.createElement('span');
  indentSpan.className = 'tree-indent';
  indentSpan.textContent = indent + connector;
  nodeDiv.appendChild(indentSpan);

  // 创建节点内容
  const contentSpan = document.createElement('span');
  contentSpan.className = 'tree-node-content';

  let nodeText = node.name || node.id || 'Node';
  if (node.value !== undefined) {
    const valueSpan = document.createElement('span');
    valueSpan.className = 'tree-node-value';
    valueSpan.textContent = ` (${node.value})`;
    contentSpan.textContent = nodeText;
    contentSpan.appendChild(valueSpan);
  } else {
    contentSpan.textContent = nodeText;
  }

  nodeDiv.appendChild(contentSpan);

  // 递归添加子节点（如果在深度限制内）
  if (node.children && depth < maxDepth) {
    node.children.forEach((child, index) => {
      const childElement = createTreeElement(child, depth + 1, maxDepth);
      nodeDiv.appendChild(childElement);
    });

    // 如果有更多子节点但超出了显示限制
    if (depth === maxDepth - 1 && node.children.length > 0) {
      const moreDiv = document.createElement('div');
      moreDiv.className = 'tree-node';

      const moreIndent = '│  '.repeat(depth + 1);
      const moreIndentSpan = document.createElement('span');
      moreIndentSpan.className = 'tree-indent';
      moreIndentSpan.textContent = moreIndent + '└─ ';
      moreDiv.appendChild(moreIndentSpan);

      const moreSpan = document.createElement('span');
      moreSpan.style.color = '#999';
      moreSpan.style.fontStyle = 'italic';
      moreSpan.textContent = `... (${node.children.length} 个子节点)`;
      moreDiv.appendChild(moreSpan);

      nodeDiv.appendChild(moreDiv);
    }
  } else if (node.children && node.children.length > 0) {
    // 显示子节点数量
    const childCountDiv = document.createElement('div');
    childCountDiv.className = 'tree-node';

    const childIndent = '│  '.repeat(depth + 1);
    const childIndentSpan = document.createElement('span');
    childIndentSpan.className = 'tree-indent';
    childIndentSpan.textContent = childIndent + '└─ ';
    childCountDiv.appendChild(childIndentSpan);

    const childSpan = document.createElement('span');
    childSpan.style.color = '#999';
    childSpan.style.fontStyle = 'italic';
    childSpan.textContent = `... (${node.children.length} 个子节点)`;
    childCountDiv.appendChild(childSpan);

    nodeDiv.appendChild(childCountDiv);
  }

  return nodeDiv;
}

// 创建对象预览
function createObjectPreview(data) {
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data, null, 2).substring(0, 500);

  if (JSON.stringify(data, null, 2).length > 500) {
    pre.textContent += '\n...';
  }

  previewContent.appendChild(pre);
}

// 创建折线图预览
function createLineChartPreview(data) {
  if (!data || !data.series || !data.timePoints) {
    previewContent.innerHTML = '<p>无效的折线图数据</p>';
    return;
  }

  const info = document.createElement('div');

  // 添加标题（如果有）
  if (data.metadata && data.metadata.title) {
    const title = document.createElement('p');
    title.innerHTML = `<strong>标题:</strong> ${data.metadata.title}`;
    info.appendChild(title);
  }

  // 添加数据系列信息
  const seriesInfo = document.createElement('p');
  seriesInfo.innerHTML = `<strong>数据系列数量:</strong> ${data.series.length}`;
  info.appendChild(seriesInfo);

  // 添加时间点信息
  const timeInfo = document.createElement('p');
  timeInfo.innerHTML = `<strong>时间点数量:</strong> ${data.timePoints.length}`;
  info.appendChild(timeInfo);

  // 创建表格预览
  const tableTitle = document.createElement('p');
  tableTitle.innerHTML = '<strong>示例数据:</strong>';
  info.appendChild(tableTitle);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 创建表头
  const headerRow = document.createElement('tr');
  const cornerCell = document.createElement('th');
  cornerCell.textContent = '城市/月份';
  headerRow.appendChild(cornerCell);

  // 添加月份标签（最多显示6个）
  const maxMonths = Math.min(6, data.timePoints.length);
  for (let i = 0; i < maxMonths; i++) {
    const th = document.createElement('th');
    th.textContent = data.timePoints[i];
    headerRow.appendChild(th);
  }

  if (data.timePoints.length > 6) {
    const ellipsis = document.createElement('th');
    ellipsis.textContent = '...';
    headerRow.appendChild(ellipsis);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 创建表格内容（最多显示5个城市）
  const maxCities = Math.min(5, data.series.length);

  for (let i = 0; i < maxCities; i++) {
    const row = document.createElement('tr');
    const cityData = data.series[i];

    // 添加城市名称
    const cityHeader = document.createElement('th');
    cityHeader.textContent = cityData.name;
    row.appendChild(cityHeader);

    // 添加数据单元格
    for (let j = 0; j < maxMonths; j++) {
      const td = document.createElement('td');
      td.textContent = cityData.values[j];
      row.appendChild(td);
    }

    if (data.timePoints.length > 6) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      row.appendChild(ellipsis);
    }

    tbody.appendChild(row);
  }

  // 如果有更多城市，添加省略号
  if (data.series.length > 5) {
    const ellipsisRow = document.createElement('tr');
    const ellipsisHeader = document.createElement('th');
    ellipsisHeader.textContent = '...';
    ellipsisRow.appendChild(ellipsisHeader);

    for (let j = 0; j < maxMonths + (data.timePoints.length > 6 ? 1 : 0); j++) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      ellipsisRow.appendChild(ellipsis);
    }

    tbody.appendChild(ellipsisRow);
  }

  table.appendChild(tbody);
  info.appendChild(table);

  previewContent.appendChild(info);
}

// 创建面积图预览
function createAreaChartPreview(data) {
  if (!data || !data.series || !data.timePoints) {
    previewContent.innerHTML = '<p>无效的面积图数据</p>';
    return;
  }

  const info = document.createElement('div');

  // 添加标题（如果有）
  if (data.metadata && data.metadata.title) {
    const title = document.createElement('p');
    title.innerHTML = `<strong>标题:</strong> ${data.metadata.title}`;
    info.appendChild(title);
  }

  // 添加数据系列信息
  const seriesInfo = document.createElement('p');
  seriesInfo.innerHTML = `<strong>区域数量:</strong> ${data.series.length}`;
  info.appendChild(seriesInfo);

  // 添加时间点信息
  const timeInfo = document.createElement('p');
  timeInfo.innerHTML = `<strong>时间点数量:</strong> ${data.timePoints.length}`;
  info.appendChild(timeInfo);

  // 创建表格预览
  const tableTitle = document.createElement('p');
  tableTitle.innerHTML = '<strong>示例数据:</strong>';
  info.appendChild(tableTitle);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 创建表头
  const headerRow = document.createElement('tr');
  const cornerCell = document.createElement('th');
  cornerCell.textContent = '区域/月份';
  headerRow.appendChild(cornerCell);

  // 添加月份标签（最多显示6个）
  const maxMonths = Math.min(6, data.timePoints.length);
  for (let i = 0; i < maxMonths; i++) {
    const th = document.createElement('th');
    th.textContent = data.timePoints[i];
    headerRow.appendChild(th);
  }

  if (data.timePoints.length > 6) {
    const ellipsis = document.createElement('th');
    ellipsis.textContent = '...';
    headerRow.appendChild(ellipsis);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 创建表格内容（最多显示5个区域）
  const maxAreas = Math.min(5, data.series.length);

  for (let i = 0; i < maxAreas; i++) {
    const row = document.createElement('tr');
    const areaData = data.series[i];

    // 添加区域名称
    const areaHeader = document.createElement('th');
    areaHeader.textContent = areaData.name;
    row.appendChild(areaHeader);

    // 添加数据单元格
    for (let j = 0; j < maxMonths; j++) {
      const td = document.createElement('td');
      td.textContent = areaData.values[j];
      row.appendChild(td);
    }

    if (data.timePoints.length > 6) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      row.appendChild(ellipsis);
    }

    tbody.appendChild(row);
  }

  // 如果有更多区域，添加省略号
  if (data.series.length > 5) {
    const ellipsisRow = document.createElement('tr');
    const ellipsisHeader = document.createElement('th');
    ellipsisHeader.textContent = '...';
    ellipsisRow.appendChild(ellipsisHeader);

    for (let j = 0; j < maxMonths + (data.timePoints.length > 6 ? 1 : 0); j++) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      ellipsisRow.appendChild(ellipsis);
    }

    tbody.appendChild(ellipsisRow);
  }

  table.appendChild(tbody);
  info.appendChild(table);

  previewContent.appendChild(info);
}

// 创建表面图预览
function createSurfacePreview(data) {
  const { values, xLabels, yLabels, metadata } = data;

  const rowCount = values.length;
  const colCount = values[0].length;

  // 计算最大值和最小值
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      const value = values[i][j];
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }
  }

  const info = document.createElement('div');

  // 添加标题（如果有）
  if (metadata && metadata.title) {
    const title = document.createElement('p');
    title.innerHTML = `<strong>标题:</strong> ${metadata.title}`;
    info.appendChild(title);
  }

  // 添加网格大小信息
  const gridInfo = document.createElement('p');
  gridInfo.innerHTML = `<strong>数据网格大小:</strong> ${rowCount} × ${colCount}`;
  info.appendChild(gridInfo);

  // 添加数值范围信息
  const rangeInfo = document.createElement('p');
  rangeInfo.innerHTML = `<strong>数值范围:</strong> ${minValue.toFixed(1)} - ${maxValue.toFixed(1)}`;
  info.appendChild(rangeInfo);

  // 创建表格预览
  const tableTitle = document.createElement('p');
  tableTitle.innerHTML = '<strong>示例数据:</strong>';
  info.appendChild(tableTitle);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 创建表头
  const headerRow = document.createElement('tr');
  const cornerCell = document.createElement('th');
  headerRow.appendChild(cornerCell);

  // 添加X轴标签（列标题）
  const maxCols = Math.min(4, colCount);
  for (let j = 0; j < maxCols; j++) {
    const th = document.createElement('th');
    th.textContent = xLabels ? xLabels[j] : `列${j+1}`;
    headerRow.appendChild(th);
  }

  if (colCount > 4) {
    const ellipsis = document.createElement('th');
    ellipsis.textContent = '...';
    headerRow.appendChild(ellipsis);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 创建表格内容（最多显示3行）
  const maxRows = Math.min(3, rowCount);

  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement('tr');

    // 添加Y轴标签（行标题）
    const rowHeader = document.createElement('th');
    rowHeader.textContent = yLabels ? yLabels[i] : `行${i+1}`;
    row.appendChild(rowHeader);

    // 添加数据单元格
    for (let j = 0; j < maxCols; j++) {
      const td = document.createElement('td');
      td.textContent = values[i][j].toFixed(1);
      row.appendChild(td);
    }

    if (colCount > 4) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      row.appendChild(ellipsis);
    }

    tbody.appendChild(row);
  }

  // 如果有更多行，添加省略号
  if (rowCount > 3) {
    const ellipsisRow = document.createElement('tr');
    const ellipsisHeader = document.createElement('th');
    ellipsisHeader.textContent = '...';
    ellipsisRow.appendChild(ellipsisHeader);

    for (let j = 0; j < maxCols + (colCount > 4 ? 1 : 0); j++) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      ellipsisRow.appendChild(ellipsis);
    }

    tbody.appendChild(ellipsisRow);
  }

  table.appendChild(tbody);
  info.appendChild(table);

  previewContent.appendChild(info);
}

// 创建热力图预览
function createHeatMapPreview(data) {
  const { values, xLabels, yLabels, metadata } = data;

  const rowCount = values.length;
  const colCount = values[0].length;

  // 计算最大值和最小值
  let minValue = Infinity;
  let maxValue = -Infinity;

  for (let i = 0; i < rowCount; i++) {
    for (let j = 0; j < colCount; j++) {
      const value = values[i][j];
      if (value < minValue) minValue = value;
      if (value > maxValue) maxValue = value;
    }
  }

  const info = document.createElement('div');

  // 添加标题（如果有）
  if (metadata && metadata.title) {
    const title = document.createElement('p');
    title.innerHTML = `<strong>标题:</strong> ${metadata.title}`;
    info.appendChild(title);
  }

  // 添加网格大小信息
  const gridInfo = document.createElement('p');
  gridInfo.innerHTML = `<strong>数据网格大小:</strong> ${rowCount} × ${colCount}`;
  info.appendChild(gridInfo);

  // 添加数值范围信息
  const rangeInfo = document.createElement('p');
  rangeInfo.innerHTML = `<strong>数值范围:</strong> ${minValue.toFixed(1)} - ${maxValue.toFixed(1)}`;
  info.appendChild(rangeInfo);

  // 创建热力图预览
  const tableTitle = document.createElement('p');
  tableTitle.innerHTML = '<strong>热力图数据预览:</strong>';
  info.appendChild(tableTitle);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.className = 'heatmap-preview';

  // 创建表头
  const headerRow = document.createElement('tr');
  const cornerCell = document.createElement('th');
  headerRow.appendChild(cornerCell);

  // 添加X轴标签（列标题）
  const maxCols = Math.min(6, colCount);
  for (let j = 0; j < maxCols; j++) {
    const th = document.createElement('th');
    th.textContent = xLabels ? xLabels[j] : `列${j+1}`;
    headerRow.appendChild(th);
  }

  if (colCount > 6) {
    const ellipsis = document.createElement('th');
    ellipsis.textContent = '...';
    headerRow.appendChild(ellipsis);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 创建表格内容（最多显示5行）
  const maxRows = Math.min(5, rowCount);

  for (let i = 0; i < maxRows; i++) {
    const row = document.createElement('tr');

    // 添加Y轴标签（行标题）
    const rowHeader = document.createElement('th');
    rowHeader.textContent = yLabels ? yLabels[i] : `行${i+1}`;
    row.appendChild(rowHeader);

    // 添加数据单元格
    for (let j = 0; j < maxCols; j++) {
      const td = document.createElement('td');
      const value = values[i][j];
      td.textContent = value.toFixed(1);

      // 根据数值设置背景颜色（热力图效果）
      const normalizedValue = (value - minValue) / (maxValue - minValue);
      const r = Math.round(normalizedValue * 255);
      const b = Math.round((1 - normalizedValue) * 255);
      td.style.backgroundColor = `rgb(${r}, 0, ${b})`;
      td.style.color = normalizedValue > 0.5 ? 'white' : 'black';

      row.appendChild(td);
    }

    if (colCount > 6) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      row.appendChild(ellipsis);
    }

    tbody.appendChild(row);
  }

  // 如果有更多行，添加省略号
  if (rowCount > 5) {
    const ellipsisRow = document.createElement('tr');
    const ellipsisHeader = document.createElement('th');
    ellipsisHeader.textContent = '...';
    ellipsisRow.appendChild(ellipsisHeader);

    for (let j = 0; j < maxCols + (colCount > 6 ? 1 : 0); j++) {
      const ellipsis = document.createElement('td');
      ellipsis.textContent = '...';
      ellipsisRow.appendChild(ellipsis);
    }

    tbody.appendChild(ellipsisRow);
  }

  table.appendChild(tbody);
  info.appendChild(table);

  // 添加颜色图例
  const legendContainer = document.createElement('div');
  legendContainer.className = 'color-legend';

  const legendTitle = document.createElement('p');
  legendTitle.innerHTML = '<strong>颜色图例:</strong>';
  legendContainer.appendChild(legendTitle);

  const legend = document.createElement('div');
  legend.className = 'legend-gradient';
  legend.style.background = 'linear-gradient(to right, blue, purple, red)';
  legendContainer.appendChild(legend);

  const legendLabels = document.createElement('div');
  legendLabels.className = 'legend-labels';

  const minLabel = document.createElement('span');
  minLabel.textContent = minValue.toFixed(1);
  minLabel.className = 'legend-min';

  const maxLabel = document.createElement('span');
  maxLabel.textContent = maxValue.toFixed(1);
  maxLabel.className = 'legend-max';

  legendLabels.appendChild(minLabel);
  legendLabels.appendChild(maxLabel);
  legendContainer.appendChild(legendLabels);

  info.appendChild(legendContainer);

  previewContent.appendChild(info);

  // 添加热力图预览的CSS样式
  const style = document.createElement('style');
  style.textContent = `
    .heatmap-preview td {
      text-align: center;
      padding: 8px;
      min-width: 40px;
    }
    .color-legend {
      margin-top: 15px;
    }
    .legend-gradient {
      height: 20px;
      width: 100%;
      border-radius: 4px;
      margin: 5px 0;
    }
    .legend-labels {
      display: flex;
      justify-content: space-between;
    }
  `;
  document.head.appendChild(style);
}

// 处理文件上传
dataFileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];

  if (!file) return;

  try {
    showLoader();

    // 根据文件扩展名确定类型
    const fileType = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json';

    // 加载数据
    currentData = await app.loadData(file, fileType);

    // 创建数据预览
    createDataPreview(currentData);

    // 启用可视化按钮
    visualizeBtn.disabled = false;
  } catch (error) {
    showError(`加载文件失败: ${error.message}`);
    console.error(error);
  } finally {
    hideLoader();
  }
});

// 处理可视化按钮点击
visualizeBtn.addEventListener('click', () => {
  if (!currentData) {
    showError('请先加载数据');
    return;
  }

  const visualizationType = visualizationTypeSelect.value;

  try {
    showLoader();

    // 创建可视化
    app.createVisualization(visualizationType, currentData);
  } catch (error) {
    showError(`创建可视化失败: ${error.message}`);
    console.error(error);
  } finally {
    hideLoader();
  }
});

// 重置相机视图
resetCameraBtn.addEventListener('click', () => {
  if (app.camera) {
    app.camera.position.set(15, 15, 15);
    app.camera.lookAt(0, 0, 0);
  }
});

// 加载柱状图示例数据
sampleBarDataBtn.addEventListener('click', () => {
  currentData = window.sampleBarData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择柱状图类型
  visualizationTypeSelect.value = 'bar-chart';
});

// 加载网络图示例数据
sampleNetworkDataBtn.addEventListener('click', () => {
  currentData = window.sampleNetworkData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择网络图类型
  visualizationTypeSelect.value = 'network-graph';
});

// 加载散点图示例数据
sampleScatterDataBtn.addEventListener('click', () => {
  currentData = window.sampleScatterData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择散点图类型
  visualizationTypeSelect.value = 'scatter-plot';
});

// 加载表面图示例数据
sampleSurfaceDataBtn.addEventListener('click', () => {
  import('./data/sampleSurfaceData.js')
    .then(module => {
      currentData = module.default;
      createDataPreview(currentData);
      visualizeBtn.disabled = false;

      // 自动选择表面图类型
      visualizationTypeSelect.value = 'surface-plot';
    })
    .catch(error => {
      showError('加载示例数据失败: ' + error.message);
    });
});

// 加载折线图示例数据
sampleLineDataBtn.addEventListener('click', () => {
  currentData = window.sampleLineData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择折线图类型
  visualizationTypeSelect.value = 'line-chart';
});

// 加载面积图示例数据
sampleAreaDataBtn.addEventListener('click', () => {
  currentData = window.sampleAreaData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择面积图类型
  visualizationTypeSelect.value = 'area-chart';
});

// 加载饼图示例数据
samplePieDataBtn.addEventListener('click', () => {
  currentData = window.samplePieData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择饼图类型
  visualizationTypeSelect.value = 'pie-chart';
});

// 加载热力图示例数据
sampleHeatMapDataBtn.addEventListener('click', () => {
  currentData = window.sampleHeatMapData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择热力图类型
  visualizationTypeSelect.value = 'heat-map';
});

// 加载树状图示例数据
sampleTreeDataBtn.addEventListener('click', () => {
  currentData = window.sampleTreeData;
  createDataPreview(currentData);
  visualizeBtn.disabled = false;

  // 自动选择树状图类型
  visualizationTypeSelect.value = 'tree-chart';
});

// 处理可视化类型变更
visualizationTypeSelect.addEventListener('change', () => {
  if (currentData && visualizeBtn.disabled) {
    visualizeBtn.disabled = false;
  }
});

// 窗口加载完成后，显示欢迎信息
window.addEventListener('load', () => {
  console.log('3D数据可视化仪表盘已加载');
});