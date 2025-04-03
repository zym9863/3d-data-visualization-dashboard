import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class BarChart3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);
    
    // 柱状图特定属性
    this.barWidth = 1;
    this.barDepth = 1;
    this.barSpacing = 0.5;
    this.maxBarHeight = 15;
    this.barColors = [
      0x3498db, // 蓝色
      0x2ecc71, // 绿色
      0xe74c3c, // 红色
      0xf39c12, // 橙色
      0x9b59b6  // 紫色
    ];
    
    // 动画属性
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = null;
    this.barsToAnimate = [];
    
    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedBarIndex = -1; // 当前选中的柱子索引
    this.yLabelGroup = null; // Y轴标签组
    this.currentValueField = null; // 当前显示的数值字段
    this.currentMaxValue = null; // 当前显示的最大值
    this.selectedField = null; // 当前选中的字段
    this.isLayerFocused = false; // 是否处于层级聚焦模式
  }
  
  create(camera, renderer) {
    if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
      console.error('无效的数据格式，无法创建柱状图');
      return;
    }
    
    // 清除之前的可视化
    this.clear();
    
    // 保存相机和渲染器引用到场景的userData中，以便在事件处理中使用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;
    
    // 创建地面网格
    this.createFloor();
    
    // 分析数据，找出数值型字段
    const numericFields = this.getNumericFields();
    
    if (numericFields.length === 0) {
      console.error('没有找到数值型字段，无法创建柱状图');
      return;
    }
    
    // 使用第一个非数值字段作为分类字段（如果有）
    let categoryField = null;
    for (const key in this.data[0]) {
      if (typeof this.data[0][key] !== 'number') {
        categoryField = key;
        break;
      }
    }
    
    // 如果没有找到分类字段，使用索引作为分类
    const categories = categoryField 
      ? [...new Set(this.data.map(item => item[categoryField]))]
      : this.data.map((_, index) => `Item ${index + 1}`);
    
    // 创建图例
    this.createLegend(numericFields);
    
    // 创建坐标轴标签
    this.createAxisLabels(categories, numericFields[0]);
    
    // 创建柱状图
    this.createBars(categories, numericFields, categoryField);
    
    // 开始动画
    this.animationStartTime = Date.now();
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
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
    this.objects.push(floor);
  }
  
  getNumericFields() {
    // 获取所有数值型字段
    const numericFields = [];
    
    if (this.data.length > 0) {
      const sampleItem = this.data[0];
      
      for (const key in sampleItem) {
        if (typeof sampleItem[key] === 'number') {
          numericFields.push(key);
        }
      }
    }
    
    return numericFields;
  }
  
  createLegend(numericFields) {
    // 创建图例（使用彩色立方体表示不同的数值字段）
    const legendGroup = new THREE.Group();
    legendGroup.position.set(-9, 0.5, -9);
    
    numericFields.forEach((field, index) => {
      // 创建图例立方体
      const cubeGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const cubeMaterial = new THREE.MeshBasicMaterial({ color: this.barColors[index % this.barColors.length] });
      const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
      cube.position.set(0, index * 0.7, 0);
      legendGroup.add(cube);
      
      // 创建图例文本
      const textCanvas = document.createElement('canvas');
      const context = textCanvas.getContext('2d');
      textCanvas.width = 512;
      textCanvas.height = 128;
      context.font = 'bold 32px Arial';
      context.fillStyle = 'white';
      // 添加文本阴影以增强可读性
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(field, 0, 24);
      
      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // 增大文本几何体尺寸以适应更大的字体
      const textGeometry = new THREE.PlaneGeometry(3, 0.8);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      textMesh.position.set(1.5, index * 0.7, 0);
      legendGroup.add(textMesh);
    });
    
    this.scene.add(legendGroup);
    this.objects.push(legendGroup);
  }
  
  createAxisLabels(categories, valueField) {
    // 创建X轴标签（类别）
    const xLabelGroup = new THREE.Group();
    
    categories.forEach((category, index) => {
      const textCanvas = document.createElement('canvas');
      const context = textCanvas.getContext('2d');
      textCanvas.width = 256;
      textCanvas.height = 128;
      context.font = 'bold 24px Arial';
      context.fillStyle = 'white';
      // 添加文本阴影以增强可读性
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(String(category).substring(0, 10), 0, 20);
      
      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // 增大文本几何体尺寸以适应更大的字体
      const textGeometry = new THREE.PlaneGeometry(2.5, 0.8);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // 计算位置（考虑间距）
      const xPos = index * (this.barWidth + this.barSpacing) - (categories.length * (this.barWidth + this.barSpacing)) / 2 + this.barWidth / 2;
      textMesh.position.set(xPos, 0, 0);
      textMesh.rotation.x = -Math.PI / 2;
      textMesh.rotation.z = Math.PI / 4; // 倾斜标签以便更好地阅读
      
      xLabelGroup.add(textMesh);
    });
    
    xLabelGroup.position.set(0, 0, 0);
    this.scene.add(xLabelGroup);
    this.objects.push(xLabelGroup);
    
    // 保存当前数值字段
    this.currentValueField = valueField;
    
    // 创建Y轴标签（数值）
    const maxValue = Math.max(...this.data.map(item => item[valueField]));
    this.currentMaxValue = maxValue; // 保存当前最大值
    this.yLabelGroup = new THREE.Group();
    
    // 创建5个刻度标签
    for (let i = 0; i <= 5; i++) {
      const value = (maxValue * i / 5).toFixed(1);
      
      const textCanvas = document.createElement('canvas');
      const context = textCanvas.getContext('2d');
      textCanvas.width = 128;
      textCanvas.height = 64;
      context.font = 'bold 24px Arial';
      context.fillStyle = 'white';
      // 添加文本阴影以增强可读性
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(value, 0, 20);
      
      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // 增大文本几何体尺寸以适应更大的字体
      const textGeometry = new THREE.PlaneGeometry(1.5, 0.8);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // 计算位置
      const yPos = (i / 5) * this.maxBarHeight;
      textMesh.position.set(-10, yPos, 0);
      
      this.yLabelGroup.add(textMesh);
      
      // 添加刻度线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-9.5, yPos, 0),
        new THREE.Vector3(-9, yPos, 0)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.yLabelGroup.add(line);
    }
    
    this.scene.add(this.yLabelGroup);
    this.objects.push(this.yLabelGroup);
  }
  
  /**
   * 计算柱子高度
   * @param {number} value - 数据值
   * @param {number} maxValue - 最大值（用于归一化）
   * @param {boolean} useGlobalMax - 是否使用全局最大值而不是字段最大值
   * @return {number} 归一化后的高度
   */
  calculateBarHeight(value, maxValue, useGlobalMax = false) {
    // 如果有选中的值作为参考，则使用它
    if (useGlobalMax && this.currentMaxValue !== null) {
      return (value / this.currentMaxValue) * this.maxBarHeight;
    }
    // 否则使用字段的最大值
    return (value / maxValue) * this.maxBarHeight;
  }
  
  /**
   * 更新柱子几何体
   * @param {THREE.Mesh} bar - 柱子网格
   * @param {number} height - 新的高度
   */
  updateBarGeometry(bar, height) {
    // 处理柱子几何体
    if (bar.geometry) bar.geometry.dispose();
    
    // 创建新的几何体
    const newGeometry = new THREE.BoxGeometry(
      this.barWidth,
      height,
      this.barDepth
    );
    
    // 更新几何体
    bar.geometry = newGeometry;
    
    // 更新位置（Y轴位置为高度的一半）
    bar.position.y = height / 2;
  }
  
  createBars(categories, numericFields, categoryField) {
    // 找出每个数值字段的最大值，用于归一化
    const maxValues = {};
    numericFields.forEach(field => {
      maxValues[field] = Math.max(...this.data.map(item => item[field]));
    });
    
    // 为每个类别创建一组柱子
    categories.forEach((category, categoryIndex) => {
      // 过滤出当前类别的数据
      const categoryData = categoryField
        ? this.data.filter(item => item[categoryField] === category)
        : [this.data[categoryIndex]];
      
      if (categoryData.length === 0) return;
      
      // 计算柱子的X位置（考虑间距）
      const xPos = categoryIndex * (this.barWidth + this.barSpacing) - 
                  (categories.length * (this.barWidth + this.barSpacing)) / 2 + 
                  this.barWidth / 2;
      
      // 为每个数值字段创建一个柱子
      numericFields.forEach((field, fieldIndex) => {
        // 获取数据值
        const value = categoryData[0][field];
        
        // 计算柱子高度（归一化）
        const normalizedHeight = this.calculateBarHeight(value, maxValues[field]);
        
        // 创建柱子几何体
        const barGeometry = new THREE.BoxGeometry(
          this.barWidth,
          normalizedHeight,
          this.barDepth
        );
        
        // 创建柱子材质
        const barMaterial = new THREE.MeshPhongMaterial({
          color: this.barColors[fieldIndex % this.barColors.length],
          transparent: true,
          opacity: 0.8,
          specular: 0x111111,
          shininess: 30
        });
        
        // 创建柱子网格
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        
        // 计算Z位置（不同字段的柱子在Z轴上错开）
        const zPos = fieldIndex * (this.barDepth + this.barSpacing / 2) - 
                    (numericFields.length * (this.barDepth + this.barSpacing / 2)) / 2 + 
                    this.barDepth / 2;
        
        // 设置柱子位置（Y轴位置为高度的一半，因为几何体是从中心点开始的）
        bar.position.set(xPos, normalizedHeight / 2, zPos);
        
        // 为柱子添加用户数据，用于点击识别
        bar.userData = {
          type: 'bar',
          categoryIndex: categoryIndex,
          fieldIndex: fieldIndex,
          field: field,
          value: value,
          category: category,
          maxValue: maxValues[field] // 保存最大值，用于后续更新
        };
        
        // 添加到场景
        this.scene.add(bar);
        this.objects.push(bar);
        
        // 添加到动画列表
        this.barsToAnimate.push({
          bar,
          targetHeight: normalizedHeight,
          value: value
        });
        
        // 初始高度为0（用于动画）
        bar.scale.y = 0;
      });
    });
    
    // 添加点击事件监听器
    const renderer = this.scene.userData.renderer;
    if (renderer) {
      renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
    }
  }
  
  /**
   * 更新可视化
   * 实现柱状图的动画效果
   */
  update(camera) {
    // 如果没有开始动画，直接返回
    if (!this.animationStartTime) return;
    
    // 计算动画进度
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);
    
    // 使用缓动函数使动画更自然
    const easedProgress = this.easeOutCubic(progress);
    
    // 更新所有柱子的高度
    this.barsToAnimate.forEach(item => {
      item.bar.scale.y = easedProgress;
    });
    
    // 动画结束后重置动画状态
    if (progress >= 1) {
      this.animationStartTime = null;
    }
  }
  
  /**
   * 处理鼠标点击事件
   * @param {MouseEvent} event - 鼠标事件
   */
  onMouseClick(event) {
    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 设置射线投射器
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
    
    // 获取与射线相交的对象
    const intersects = this.raycaster.intersectObjects(this.objects, true);
    
    // 查找第一个柱子对象
    for (let i = 0; i < intersects.length; i++) {
      const object = intersects[i].object;
      
      // 检查是否是柱子
      if (object.userData && object.userData.type === 'bar') {
        // 如果点击的是当前选中的字段的柱子，则重置视图
        if (this.isLayerFocused && object.userData.field === this.selectedField) {
          this.resetView();
          return;
        }
        
        // 更新Y轴刻度以显示该柱子的值
        this.updateYAxisLabels(object.userData.field, object.userData.value);
        
        // 切换柱子可见性，只显示当前层的柱子
        this.toggleBarVisibility(object.userData.field);
        
        // 更新选中的字段和聚焦状态
        this.selectedField = object.userData.field;
        this.isLayerFocused = true;
        
        return;
      }
    }
  }
  
  /**
   * 更新Y轴刻度标签以显示特定柱子的值
   * @param {string} field - 数值字段名称
   * @param {number} value - 柱子的值
   */
  updateYAxisLabels(field, value) {
    // 如果没有Y轴标签组，直接返回
    if (!this.yLabelGroup) return;
    
    // 更新当前显示的数值字段和最大值
    this.currentValueField = field;
    this.currentMaxValue = value;
    
    // 清除现有的Y轴标签
    while (this.yLabelGroup.children.length > 0) {
      const child = this.yLabelGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
      this.yLabelGroup.remove(child);
    }
    
    // 创建新的刻度标签，以选中的柱子值为最大值
    for (let i = 0; i <= 5; i++) {
      const labelValue = (value * i / 5).toFixed(1);
      
      const textCanvas = document.createElement('canvas');
      const context = textCanvas.getContext('2d');
      textCanvas.width = 128;
      textCanvas.height = 64;
      context.font = 'bold 24px Arial';
      context.fillStyle = 'white';
      // 添加文本阴影以增强可读性
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 4;
      context.shadowOffsetX = 2;
      context.shadowOffsetY = 2;
      context.fillText(labelValue, 0, 20);
      
      const textTexture = new THREE.CanvasTexture(textCanvas);
      const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      // 增大文本几何体尺寸以适应更大的字体
      const textGeometry = new THREE.PlaneGeometry(1.5, 0.8);
      const textMesh = new THREE.Mesh(textGeometry, textMaterial);
      
      // 计算位置
      const yPos = (i / 5) * this.maxBarHeight;
      textMesh.position.set(-10, yPos, 0);
      
      this.yLabelGroup.add(textMesh);
      
      // 添加刻度线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-9.5, yPos, 0),
        new THREE.Vector3(-9, yPos, 0)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.yLabelGroup.add(line);
    }
    
    // 更新所有柱子的高度
    this.updateAllBarsHeight();
    
    // 添加提示信息
    this.showTooltip(`已聚焦于 ${field} 字段，点击同一柱子可重置视图`);
  }
  
  /**
   * 更新所有柱子的高度
   * 根据当前选中的值作为参考来调整所有柱子
   */
  updateAllBarsHeight() {
    // 如果没有选中的值，直接返回
    if (this.currentMaxValue === null) return;
    
    // 遍历所有柱子并更新高度
    this.objects.forEach(object => {
      // 检查是否是柱子
      if (object.userData && object.userData.type === 'bar') {
        // 计算新的高度
        const value = object.userData.value;
        const newHeight = this.calculateBarHeight(value, object.userData.maxValue, true);
        
        // 更新柱子几何体
        this.updateBarGeometry(object, newHeight);
        
        // 更新动画目标高度
        const animItem = this.barsToAnimate.find(item => item.bar === object);
        if (animItem) {
          animItem.targetHeight = newHeight;
        }
      }
    });
    
    // 开始新的动画
    this.animationStartTime = Date.now();
  }
  
  /**
   * 切换柱子可见性，只显示特定字段的柱子
   * @param {string} field - 要显示的字段名称
   */
  toggleBarVisibility(field) {
    // 遍历所有柱子并更新可见性
    this.objects.forEach(object => {
      // 检查是否是柱子
      if (object.userData && object.userData.type === 'bar') {
        // 如果柱子的字段与选中的字段相同，则显示，否则隐藏
        if (object.userData.field === field) {
          // 显示柱子
          object.visible = true;
          // 添加高亮效果
          if (object.material) {
            object.material.emissive = new THREE.Color(0x222222);
            object.material.emissiveIntensity = 0.5;
          }
        } else {
          // 隐藏柱子
          object.visible = false;
        }
      }
    });
  }
  
  /**
   * 重置视图，显示所有柱子
   */
  resetView() {
    // 重置聚焦状态
    this.isLayerFocused = false;
    this.selectedField = null;
    
    // 遍历所有柱子并恢复可见性
    this.objects.forEach(object => {
      // 检查是否是柱子
      if (object.userData && object.userData.type === 'bar') {
        // 显示所有柱子
        object.visible = true;
        // 移除高亮效果
        if (object.material) {
          object.material.emissive = new THREE.Color(0x000000);
          object.material.emissiveIntensity = 0;
        }
      }
    });
    
    // 恢复原始Y轴刻度
    if (this.currentValueField) {
      // 找出当前字段的最大值
      const maxValue = Math.max(...this.data.map(item => item[this.currentValueField]));
      this.currentMaxValue = maxValue;
      
      // 更新Y轴标签
      this.updateYAxisLabels(this.currentValueField, maxValue);
    }
    
    // 添加提示信息
    this.showTooltip('已重置视图，显示所有数据');
  }
  
  /**
   * 缓动函数 - 三次方缓出
   * @param {number} t - 进度值 (0-1)
   * @return {number} 缓动后的进度值
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
  
  /**
   * 显示提示信息
   * @param {string} message - 提示信息
   */
  showTooltip(message) {
    // 创建或更新提示信息元素
    let tooltip = document.getElementById('chart-tooltip');
    
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'chart-tooltip';
      tooltip.style.position = 'absolute';
      tooltip.style.bottom = '20px';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translateX(-50%)';
      tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      tooltip.style.color = 'white';
      tooltip.style.padding = '8px 16px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontFamily = 'Arial, sans-serif';
      tooltip.style.fontSize = '14px';
      tooltip.style.zIndex = '1000';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.transition = 'opacity 0.3s';
      document.body.appendChild(tooltip);
    }
    
    // 更新提示信息
    tooltip.textContent = message;
    tooltip.style.opacity = '1';
    
    // 3秒后隐藏提示信息
    setTimeout(() => {
      tooltip.style.opacity = '0';
    }, 3000);
  }
}