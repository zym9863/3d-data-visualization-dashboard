import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class ScatterPlot3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);
    
    // 散点图特定属性
    this.pointSize = 0.3;
    this.pointColors = [
      0x3498db, // 蓝色
      0x2ecc71, // 绿色
      0xe74c3c, // 红色
      0xf39c12, // 橙色
      0x9b59b6  // 紫色
    ];
    
    // 动画属性
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = null;
    this.pointsToAnimate = [];
    
    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedPointIndex = -1; // 当前选中的点索引
    this.hoveredPoint = null; // 当前悬停的点
    
    // 坐标轴范围
    this.axisRange = {
      x: { min: 0, max: 10 },
      y: { min: 0, max: 10 },
      z: { min: 0, max: 10 }
    };
  }
  
  create(camera, renderer) {
    if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
      console.error('无效的数据格式，无法创建散点图');
      return;
    }
    
    // 清除之前的可视化
    this.clear();
    
    // 保存相机和渲染器引用，以便在事件处理中使用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;
    
    // 创建地面网格
    this.createFloor();
    
    // 分析数据，找出数值型字段
    const numericFields = this.getNumericFields();
    
    if (numericFields.length < 3) {
      console.error('散点图需要至少3个数值型字段作为x、y、z坐标');
      return;
    }
    
    // 创建图例
    this.createLegend(numericFields);
    
    // 创建坐标轴
    this.createAxes(numericFields);
    
    // 创建散点
    this.createPoints(numericFields);
    
    // 开始动画
    this.animationStartTime = Date.now();
    
    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
  }
  
  createFloor() {
    // 创建地面网格
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);
    
    // 添加地面平面（半透明）
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
    this.objects.push(floor);
  }
  
  getNumericFields() {
    // 获取数据中的所有数值型字段
    const numericFields = [];
    
    if (this.data.length > 0) {
      const firstItem = this.data[0];
      
      for (const key in firstItem) {
        if (typeof firstItem[key] === 'number') {
          numericFields.push(key);
        }
      }
    }
    
    return numericFields;
  }
  
  createLegend(numericFields) {
    // 创建图例容器
    const legendContainer = document.createElement('div');
    legendContainer.className = 'legend-container';
    legendContainer.style.position = 'absolute';
    legendContainer.style.top = '10px';
    legendContainer.style.right = '10px';
    legendContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    legendContainer.style.color = 'white';
    legendContainer.style.padding = '10px';
    legendContainer.style.borderRadius = '5px';
    legendContainer.style.maxWidth = '200px';
    
    // 添加标题
    const title = document.createElement('div');
    title.textContent = '3D散点图';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '10px';
    legendContainer.appendChild(title);
    
    // 添加坐标轴选择器
    const axisSelectors = document.createElement('div');
    axisSelectors.style.marginBottom = '10px';
    
    // X轴选择器
    const xAxisLabel = document.createElement('div');
    xAxisLabel.textContent = 'X轴:';
    xAxisLabel.style.marginBottom = '5px';
    axisSelectors.appendChild(xAxisLabel);
    
    const xAxisSelect = document.createElement('select');
    xAxisSelect.style.width = '100%';
    xAxisSelect.style.marginBottom = '10px';
    numericFields.forEach((field, index) => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field;
      if (index === 0) option.selected = true;
      xAxisSelect.appendChild(option);
    });
    axisSelectors.appendChild(xAxisSelect);
    
    // Y轴选择器
    const yAxisLabel = document.createElement('div');
    yAxisLabel.textContent = 'Y轴:';
    yAxisLabel.style.marginBottom = '5px';
    axisSelectors.appendChild(yAxisLabel);
    
    const yAxisSelect = document.createElement('select');
    yAxisSelect.style.width = '100%';
    yAxisSelect.style.marginBottom = '10px';
    numericFields.forEach((field, index) => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field;
      if (index === 1) option.selected = true;
      yAxisSelect.appendChild(option);
    });
    axisSelectors.appendChild(yAxisSelect);
    
    // Z轴选择器
    const zAxisLabel = document.createElement('div');
    zAxisLabel.textContent = 'Z轴:';
    zAxisLabel.style.marginBottom = '5px';
    axisSelectors.appendChild(zAxisLabel);
    
    const zAxisSelect = document.createElement('select');
    zAxisSelect.style.width = '100%';
    numericFields.forEach((field, index) => {
      const option = document.createElement('option');
      option.value = field;
      option.textContent = field;
      if (index === 2) option.selected = true;
      zAxisSelect.appendChild(option);
    });
    axisSelectors.appendChild(zAxisSelect);
    
    legendContainer.appendChild(axisSelectors);
    
    // 添加更新按钮
    const updateButton = document.createElement('button');
    updateButton.textContent = '更新视图';
    updateButton.style.width = '100%';
    updateButton.style.padding = '5px';
    updateButton.style.backgroundColor = '#3498db';
    updateButton.style.color = 'white';
    updateButton.style.border = 'none';
    updateButton.style.borderRadius = '3px';
    updateButton.style.cursor = 'pointer';
    updateButton.style.marginTop = '10px';
    
    updateButton.addEventListener('click', () => {
      const xField = xAxisSelect.value;
      const yField = yAxisSelect.value;
      const zField = zAxisSelect.value;
      
      // 更新散点图
      this.updateAxisFields(xField, yField, zField);
    });
    
    legendContainer.appendChild(updateButton);
    
    // 将图例添加到DOM
    document.getElementById('visualization-container').appendChild(legendContainer);
    
    // 保存图例引用，以便在清除时移除
    this.legendContainer = legendContainer;
    
    // 保存初始字段选择
    this.currentFields = {
      x: numericFields[0],
      y: numericFields[1],
      z: numericFields[2]
    };
  }
  
  createAxes(numericFields) {
    // 创建坐标轴
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
    this.objects.push(axesHelper);
    
    // 创建坐标轴标签
    this.createAxisLabels(numericFields);
  }
  
  createAxisLabels(numericFields) {
    // 创建坐标轴标签组
    const labelGroup = new THREE.Group();
    this.scene.add(labelGroup);
    this.objects.push(labelGroup);
    
    // 计算数据范围
    const ranges = {};
    numericFields.forEach(field => {
      ranges[field] = {
        min: Infinity,
        max: -Infinity
      };
      
      this.data.forEach(item => {
        if (item[field] < ranges[field].min) ranges[field].min = item[field];
        if (item[field] > ranges[field].max) ranges[field].max = item[field];
      });
    });
    
    // 保存当前字段和范围
    this.currentFields = {
      x: numericFields[0],
      y: numericFields[1],
      z: numericFields[2]
    };
    
    this.axisRange = {
      x: ranges[numericFields[0]],
      y: ranges[numericFields[1]],
      z: ranges[numericFields[2]]
    };
    
    // 创建增强的坐标轴标签
    // X轴标签 - 红色
    const xLabelSprite = this.createTextSprite(numericFields[0], { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(220,0,0,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    xLabelSprite.position.set(12, 0, 0);
    labelGroup.add(xLabelSprite);
    
    // Y轴标签 - 绿色
    const yLabelSprite = this.createTextSprite(numericFields[1], { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(0,180,0,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    yLabelSprite.position.set(0, 12, 0);
    labelGroup.add(yLabelSprite);
    
    // Z轴标签 - 蓝色
    const zLabelSprite = this.createTextSprite(numericFields[2], { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(0,0,220,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    zLabelSprite.position.set(0, 0, 12);
    labelGroup.add(zLabelSprite);
  }
  
  // 旧的createTextSprite方法已移除，使用下方的增强版本
  
  createPoints(numericFields) {
    // 使用前三个数值字段作为x、y、z坐标
    const xField = numericFields[0];
    const yField = numericFields[1];
    const zField = numericFields[2];
    
    // 计算数据范围
    const xRange = { min: Infinity, max: -Infinity };
    const yRange = { min: Infinity, max: -Infinity };
    const zRange = { min: Infinity, max: -Infinity };
    
    this.data.forEach(item => {
      if (item[xField] < xRange.min) xRange.min = item[xField];
      if (item[xField] > xRange.max) xRange.max = item[xField];
      
      if (item[yField] < yRange.min) yRange.min = item[yField];
      if (item[yField] > yRange.max) yRange.max = item[yField];
      
      if (item[zField] < zRange.min) zRange.min = item[zField];
      if (item[zField] > zRange.max) zRange.max = item[zField];
    });
    
    // 保存范围信息
    this.axisRange = {
      x: xRange,
      y: yRange,
      z: zRange
    };
    
    // 创建点的几何体
    const pointsGeometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];
    const pointMaterials = [];
    
    // 创建点
    this.data.forEach((item, index) => {
      // 归一化坐标到0-10范围
      const x = this.normalizeValue(item[xField], xRange.min, xRange.max, 0, 10);
      const y = this.normalizeValue(item[yField], yRange.min, yRange.max, 0, 10);
      const z = this.normalizeValue(item[zField], zRange.min, zRange.max, 0, 10);
      
      // 创建点的几何体和材质
      const pointGeometry = new THREE.SphereGeometry(this.pointSize, 16, 16);
      const pointMaterial = new THREE.MeshPhongMaterial({
        color: this.getColorForIndex(index),
        shininess: 80,
        transparent: true,
        opacity: 0.8
      });
      
      const point = new THREE.Mesh(pointGeometry, pointMaterial);
      point.position.set(x, y, z);
      point.userData = {
        index: index,
        data: item
      };
      
      // 添加到场景
      this.scene.add(point);
      this.objects.push(point);
      
      // 添加到动画队列
      this.pointsToAnimate.push({
        object: point,
        targetPosition: new THREE.Vector3(x, y, z),
        startPosition: new THREE.Vector3(x, 0, z)
      });
      
      // 保存材质引用
      pointMaterials.push(pointMaterial);
    });
    
    // 保存点材质引用，用于交互效果
    this.pointMaterials = pointMaterials;
  }
  
  normalizeValue(value, min, max, targetMin, targetMax) {
    // 将值从原始范围归一化到目标范围
    return targetMin + (value - min) * (targetMax - targetMin) / (max - min);
  }
  
  // 创建文本精灵
  createTextSprite(text, parameters = {}) {
    const {
      fontFace = 'Arial',
      fontSize = 24,
      fontWeight = 'normal',
      color = 'rgba(255,255,255,1)',
      backgroundColor = 'rgba(0,0,0,0)',
      padding = 4,
      borderWidth = 0,
      borderColor = 'rgba(0,0,0,1)',
      borderRadius = 0
    } = parameters;
    
    // 创建画布
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 设置字体
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    
    // 测量文本宽度
    const textWidth = context.measureText(text).width;
    
    // 设置画布尺寸
    const width = textWidth + padding * 2 + borderWidth * 2;
    const height = fontSize + padding * 2 + borderWidth * 2;
    canvas.width = width;
    canvas.height = height;
    
    // 重新设置字体（因为画布尺寸改变后，字体设置会重置）
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    
    // 绘制背景
    if (backgroundColor !== 'rgba(0,0,0,0)') {
      context.fillStyle = backgroundColor;
      if (borderRadius > 0) {
        this.roundRect(context, borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2, borderRadius);
        context.fill();
      } else {
        context.fillRect(borderWidth, borderWidth, width - borderWidth * 2, height - borderWidth * 2);
      }
    }
    
    // 绘制边框
    if (borderWidth > 0) {
      context.lineWidth = borderWidth;
      context.strokeStyle = borderColor;
      if (borderRadius > 0) {
        this.roundRect(context, borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth, borderRadius);
        context.stroke();
      } else {
        context.strokeRect(borderWidth / 2, borderWidth / 2, width - borderWidth, height - borderWidth);
      }
    }
    
    // 绘制文本
    context.fillStyle = color;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, width / 2, height / 2);
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    
    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    
    // 设置精灵尺寸
    const aspectRatio = width / height;
    sprite.scale.set(aspectRatio * 2, 2, 1);
    
    return sprite;
  }
  
  // 绘制圆角矩形
  roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
  
  getColorForIndex(index) {
    // 根据索引获取颜色
    return this.pointColors[index % this.pointColors.length];
  }
  
  updateAxisFields(xField, yField, zField) {
    // 更新坐标轴字段
    this.currentFields = {
      x: xField,
      y: yField,
      z: zField
    };
    
    // 计算新的数据范围
    const ranges = {
      x: { min: Infinity, max: -Infinity },
      y: { min: Infinity, max: -Infinity },
      z: { min: Infinity, max: -Infinity }
    };
    
    this.data.forEach(item => {
      if (item[xField] < ranges.x.min) ranges.x.min = item[xField];
      if (item[xField] > ranges.x.max) ranges.x.max = item[xField];
      
      if (item[yField] < ranges.y.min) ranges.y.min = item[yField];
      if (item[yField] > ranges.y.max) ranges.y.max = item[yField];
      
      if (item[zField] < ranges.z.min) ranges.z.min = item[zField];
      if (item[zField] > ranges.z.max) ranges.z.max = item[zField];
    });
    
    // 更新坐标轴范围
    this.axisRange = ranges;
    
    // 清除现有的点动画数组
    this.pointsToAnimate = [];
    
    // 更新所有点的位置
    const pointObjects = this.objects.filter(obj => obj.type === 'Mesh' && obj.geometry.type === 'SphereGeometry');
    
    pointObjects.forEach((point, index) => {
      const item = this.data[index];
      const x = this.normalizeValue(item[xField], ranges.x.min, ranges.x.max, 0, 10);
      const y = this.normalizeValue(item[yField], ranges.y.min, ranges.y.max, 0, 10);
      const z = this.normalizeValue(item[zField], ranges.z.min, ranges.z.max, 0, 10);
      
      // 设置动画起始位置为当前位置
      this.pointsToAnimate.push({
        object: point,
        startPosition: point.position.clone(),
        targetPosition: new THREE.Vector3(x, y, z)
      });
    });
    
    // 更新坐标轴标签
    this.updateAxisLabels();
    
    // 开始动画
    this.animationStartTime = Date.now();
  }
  
  updateAxisLabels() {
    // 移除现有的标签
    const labelGroup = this.objects.find(obj => obj.type === 'Group');
    if (labelGroup) {
      this.scene.remove(labelGroup);
      this.objects = this.objects.filter(obj => obj !== labelGroup);
    }
    
    // 创建新的标签组
    const newLabelGroup = new THREE.Group();
    this.scene.add(newLabelGroup);
    this.objects.push(newLabelGroup);
    
    // X轴标签 - 红色
    const xLabelSprite = this.createTextSprite(this.currentFields.x, { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(220,0,0,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    xLabelSprite.position.set(12, 0, 0);
    newLabelGroup.add(xLabelSprite);
    
    // Y轴标签 - 绿色
    const yLabelSprite = this.createTextSprite(this.currentFields.y, { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(0,180,0,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    yLabelSprite.position.set(0, 12, 0);
    newLabelGroup.add(yLabelSprite);
    
    // Z轴标签 - 蓝色
    const zLabelSprite = this.createTextSprite(this.currentFields.z, { 
      color: 'rgba(255,255,255,1)', 
      backgroundColor: 'rgba(0,0,220,0.8)',
      fontSize: 28,
      fontWeight: 'bold',
      padding: 8,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.8)',
      borderRadius: 4
    });
    zLabelSprite.position.set(0, 0, 12);
    newLabelGroup.add(zLabelSprite);
  }
  
  addEventListeners(domElement) {
    // 添加鼠标事件监听器
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('click', this.onMouseClick.bind(this));
  }
  
  onMouseMove(event) {
    // 计算鼠标位置的归一化坐标（-1到1之间）
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 使用射线检测与点的交叉
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
    
    // 获取所有点对象
    const pointObjects = this.objects.filter(obj => obj.type === 'Mesh' && obj.geometry.type === 'SphereGeometry');
    
    // 检测交叉
    const intersects = this.raycaster.intersectObjects(pointObjects);
    
    // 重置所有点的外观
    pointObjects.forEach(point => {
      if (point.userData.index !== this.selectedPointIndex) {
        point.material.opacity = 0.8;
        point.material.emissive = new THREE.Color(0x000000);
      }
    });
    
    // 如果有交叉，高亮显示第一个交叉的点
    if (intersects.length > 0) {
      const intersectedPoint = intersects[0].object;
      
      if (intersectedPoint.userData.index !== this.selectedPointIndex) {
        intersectedPoint.material.opacity = 1.0;
        intersectedPoint.material.emissive = new THREE.Color(0x333333);
      }
      
      this.hoveredPoint = intersectedPoint;
      
      // 显示数据提示
      this.showTooltip(intersectedPoint, event.clientX, event.clientY);
    } else {
      this.hoveredPoint = null;
      this.hideTooltip();
    }
  }
  
  onMouseClick(event) {
    // 如果有悬停的点，选中它
    if (this.hoveredPoint) {
      // 如果已经选中，取消选中
      if (this.selectedPointIndex === this.hoveredPoint.userData.index) {
        this.selectedPointIndex = -1;
        this.hoveredPoint.material.emissive = new THREE.Color(0x333333);
      } else {
        // 重置之前选中的点
        if (this.selectedPointIndex !== -1) {
          const previousSelected = this.objects.find(
            obj => obj.userData && obj.userData.index === this.selectedPointIndex
          );
          
          if (previousSelected) {
            previousSelected.material.emissive = new THREE.Color(0x000000);
          }
        }
        
        // 选中新的点
        this.selectedPointIndex = this.hoveredPoint.userData.index;
        this.hoveredPoint.material.emissive = new THREE.Color(0x666666);
      }
    }
  }
  
  showTooltip(point, x, y) {
    // 创建或更新数据提示
    let tooltip = document.getElementById('data-tooltip');
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'data-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '10px';
      tooltip.style.borderRadius = '5px';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.zIndex = '1000';
      document.body.appendChild(tooltip);
    }
    
    // 更新提示内容
    const data = point.userData.data;
    let content = '<div style="font-weight: bold; margin-bottom: 5px">数据点信息</div>';
    
    for (const key in data) {
      content += `<div>${key}: ${data[key]}</div>`;
    }
    
    tooltip.innerHTML = content;
    
    // 更新提示位置
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y + 15}px`;
    tooltip.style.display = 'block';
  }
  
  hideTooltip() {
    // 隐藏数据提示
    const tooltip = document.getElementById('data-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }
  
  update() {
    // 更新动画
    if (this.animationStartTime) {
      const now = Date.now();
      const elapsed = now - this.animationStartTime;
      
      if (elapsed < this.animationDuration) {
        // 计算动画进度（0到1之间）
        const progress = elapsed / this.animationDuration;
        
        // 使用缓动函数使动画更自然
        const easedProgress = this.easeOutCubic(progress);
        
        // 更新每个点的位置
        this.pointsToAnimate.forEach(item => {
          const { object, startPosition, targetPosition } = item;
          
          // 插值计算当前位置
          object.position.y = startPosition.y + (targetPosition.y - startPosition.y) * easedProgress;
        });
      } else {
        // 动画结束，确保所有点都在目标位置
        this.pointsToAnimate.forEach(item => {
          item.object.position.copy(item.targetPosition);
        });
        
        // 重置动画状态
        this.animationStartTime = null;
      }
    }
  }
  
  easeOutCubic(t) {
    // 缓动函数：缓出立方
    return 1 - Math.pow(1 - t, 3);
  }
  
  clear() {
    // 调用父类的清除方法
    super.clear();
    
    // 移除图例
    if (this.legendContainer) {
      this.legendContainer.remove();
      this.legendContainer = null;
    }
    
    // 移除提示
    const tooltip = document.getElementById('data-tooltip');
    if (tooltip) {
      tooltip.remove();
    }
    
    // 重置状态
    this.selectedPointIndex = -1;
    this.hoveredPoint = null;
    this.pointsToAnimate = [];
  }
}