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
    // 表面图格式
    createSurfacePreview(data);
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

// 创建对象预览
function createObjectPreview(data) {
  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(data, null, 2).substring(0, 500);
  
  if (JSON.stringify(data, null, 2).length > 500) {
    pre.textContent += '\n...';
  }
  
  previewContent.appendChild(pre);
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