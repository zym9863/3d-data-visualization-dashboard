/**
 * 3D热力图可视化组件
 * 基于Three.js实现的3D热力图，支持动画和交互效果
 */
import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class HeatMap3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);
    
    // 热力图特定属性
    this.cellSize = 1;         // 单元格大小
    this.cellHeight = 0.2;     // 单元格高度
    this.cellSpacing = 0.1;    // 单元格间距
    this.maxHeight = 5;        // 最大高度
    this.colorMin = new THREE.Color(0x0000ff);  // 最小值颜色（蓝色）
    this.colorMax = new THREE.Color(0xff0000);  // 最大值颜色（红色）
    
    // 动画属性
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = null;
    this.cellsToAnimate = [];
    
    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedCellIndex = -1; // 当前选中的单元格索引
    this.hoveredCell = null;     // 当前悬停的单元格
    this.tooltip = null;         // 工具提示
  }
  
  /**
   * 创建热力图可视化
   * @param {THREE.Camera} camera - 相机对象
   * @param {THREE.WebGLRenderer} renderer - 渲染器对象
   */
  create(camera, renderer) {
    if (!this.data || !this.data.values || !Array.isArray(this.data.values)) {
      console.error('无效的数据格式，无法创建热力图');
      return;
    }
    
    // 清除之前的可视化
    this.clear();
    
    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;
    
    // 设置默认视角
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    
    // 创建地面网格
    this.createFloor();
    
    // 创建坐标轴
    this.createAxes();
    
    // 创建热力图单元格
    this.createHeatMapCells();
    
    // 创建颜色图例
    this.createColorLegend();
    
    // 开始动画
    this.animationStartTime = Date.now();
    
    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
  }
  
  /**
   * 创建地面网格
   */
  createFloor() {
    const gridSize = Math.max(
      this.data.values.length,
      this.data.values[0].length
    ) * (this.cellSize + this.cellSpacing) + 5;
    
    // 创建地面网格
    const gridHelper = new THREE.GridHelper(gridSize, gridSize / 2);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);
    
    // 创建地面平面
    const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0xeeeeee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
    this.objects.push(ground);
  }
  
  /**
   * 创建坐标轴
   */
  createAxes() {
    const rows = this.data.values.length;
    const cols = this.data.values[0].length;
    const gridWidth = cols * (this.cellSize + this.cellSpacing);
    const gridDepth = rows * (this.cellSize + this.cellSpacing);
    
    // 创建坐标轴
    const axesHelper = new THREE.AxesHelper(Math.max(gridWidth, gridDepth) + 2);
    this.scene.add(axesHelper);
    this.objects.push(axesHelper);
    
    // 创建X轴标签
    if (this.data.xLabels && Array.isArray(this.data.xLabels)) {
      const xLabelGroup = new THREE.Group();
      
      for (let i = 0; i < cols; i++) {
        if (i % Math.ceil(cols / 10) === 0 || cols <= 10) { // 只显示部分标签，避免过于拥挤
          const x = i * (this.cellSize + this.cellSpacing) - gridWidth / 2 + this.cellSize / 2;
          
          // 创建标签精灵
          const label = this.createTextSprite(
            this.data.xLabels[i] || `${i}`,
            { x, y: -0.5, z: gridDepth / 2 + 1 },
            { fontSize: 24, fontColor: 0x000000 }
          );
          
          xLabelGroup.add(label);
          this.objects.push(label);
        }
      }
      
      this.scene.add(xLabelGroup);
      this.objects.push(xLabelGroup);
    }
    
    // 创建Y轴标签
    if (this.data.yLabels && Array.isArray(this.data.yLabels)) {
      const yLabelGroup = new THREE.Group();
      
      for (let i = 0; i < rows; i++) {
        if (i % Math.ceil(rows / 10) === 0 || rows <= 10) { // 只显示部分标签，避免过于拥挤
          const z = i * (this.cellSize + this.cellSpacing) - gridDepth / 2 + this.cellSize / 2;
          
          // 创建标签精灵
          const label = this.createTextSprite(
            this.data.yLabels[i] || `${i}`,
            { x: -gridWidth / 2 - 1, y: -0.5, z },
            { fontSize: 24, fontColor: 0x000000 }
          );
          
          yLabelGroup.add(label);
          this.objects.push(label);
        }
      }
      
      this.scene.add(yLabelGroup);
      this.objects.push(yLabelGroup);
    }
    
    // 创建标题（如果有）
    if (this.data.metadata && this.data.metadata.title) {
      const title = this.createTextSprite(
        this.data.metadata.title,
        { x: 0, y: this.maxHeight + 2, z: 0 },
        { fontSize: 40, fontColor: 0x000000, fontWeight: 'bold' }
      );
      
      this.scene.add(title);
      this.objects.push(title);
    }
  }
  
  /**
   * 创建热力图单元格
   */
  createHeatMapCells() {
    const rows = this.data.values.length;
    const cols = this.data.values[0].length;
    const gridWidth = cols * (this.cellSize + this.cellSpacing);
    const gridDepth = rows * (this.cellSize + this.cellSpacing);
    
    // 找出数据中的最大值和最小值
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = this.data.values[i][j];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
    }
    
    // 存储单元格对象，用于动画和交互
    this.cells = [];
    
    // 创建单元格
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = this.data.values[i][j];
        
        // 计算单元格位置
        const x = j * (this.cellSize + this.cellSpacing) - gridWidth / 2 + this.cellSize / 2;
        const z = i * (this.cellSize + this.cellSpacing) - gridDepth / 2 + this.cellSize / 2;
        
        // 计算单元格高度（基于数值）
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        const height = normalizedValue * this.maxHeight;
        
        // 计算单元格颜色（基于数值）
        const color = new THREE.Color().lerpColors(
          this.colorMin,
          this.colorMax,
          normalizedValue
        );
        
        // 创建单元格几何体
        const geometry = new THREE.BoxGeometry(this.cellSize, this.cellHeight, this.cellSize);
        const material = new THREE.MeshLambertMaterial({ color });
        
        // 创建单元格网格
        const cell = new THREE.Mesh(geometry, material);
        cell.position.set(x, this.cellHeight / 2, z);
        
        // 存储单元格数据
        cell.userData = {
          value,
          row: i,
          col: j,
          normalizedValue,
          targetHeight: height,
          originalColor: color.clone(),
          xLabel: this.data.xLabels ? this.data.xLabels[j] : `列${j+1}`,
          yLabel: this.data.yLabels ? this.data.yLabels[i] : `行${i+1}`
        };
        
        // 添加到场景
        this.scene.add(cell);
        this.objects.push(cell);
        this.cells.push(cell);
        
        // 添加到动画队列
        this.cellsToAnimate.push({
          cell,
          startHeight: this.cellHeight,
          targetHeight: height
        });
      }
    }
  }
  
  /**
   * 创建颜色图例
   */
  createColorLegend() {
    const legendWidth = 5;
    const legendHeight = 0.5;
    const legendDepth = 0.2;
    const segments = 10;
    
    // 创建图例组
    const legendGroup = new THREE.Group();
    legendGroup.position.set(0, this.maxHeight + 0.5, 0);
    
    // 创建图例标题
    const title = this.createTextSprite(
      '数值范围',
      { x: 0, y: 1, z: 0 },
      { fontSize: 24, fontColor: 0x000000 }
    );
    legendGroup.add(title);
    
    // 创建颜色渐变图例
    for (let i = 0; i < segments; i++) {
      const normalizedValue = i / (segments - 1);
      const color = new THREE.Color().lerpColors(
        this.colorMin,
        this.colorMax,
        normalizedValue
      );
      
      const segmentWidth = legendWidth / segments;
      const x = i * segmentWidth - legendWidth / 2 + segmentWidth / 2;
      
      // 创建图例段
      const geometry = new THREE.BoxGeometry(segmentWidth, legendHeight, legendDepth);
      const material = new THREE.MeshBasicMaterial({ color });
      const segment = new THREE.Mesh(geometry, material);
      segment.position.set(x, 0, 0);
      
      legendGroup.add(segment);
    }
    
    // 创建最小值标签
    const minLabel = this.createTextSprite(
      this.data.minLabel || '最小值',
      { x: -legendWidth / 2, y: -0.5, z: 0 },
      { fontSize: 20, fontColor: 0x000000 }
    );
    legendGroup.add(minLabel);
    
    // 创建最大值标签
    const maxLabel = this.createTextSprite(
      this.data.maxLabel || '最大值',
      { x: legendWidth / 2, y: -0.5, z: 0 },
      { fontSize: 20, fontColor: 0x000000 }
    );
    legendGroup.add(maxLabel);
    
    // 添加图例到场景
    this.scene.add(legendGroup);
    this.objects.push(legendGroup);
  }
  
  /**
   * 创建文本精灵
   * @param {string} text - 文本内容
   * @param {Object} position - 位置对象 {x, y, z}
   * @param {Object} options - 选项对象
   * @returns {THREE.Sprite} 文本精灵
   */
  createTextSprite(text, position, options = {}) {
    const {
      fontSize = 28,
      fontFace = 'Arial',
      fontColor = 0xffffff,
      fontWeight = 'normal',
      textAlign = 'center',
      backgroundColor = { r: 255, g: 255, b: 255, a: 0 }
    } = options;
    
    // 创建画布
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 设置字体
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    
    // 测量文本宽度
    const textWidth = context.measureText(text).width;
    
    // 设置画布大小
    canvas.width = textWidth + 20;
    canvas.height = fontSize + 10;
    
    // 重新设置字体（因为画布大小改变后字体设置会重置）
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    context.textAlign = textAlign;
    context.textBaseline = 'middle';
    
    // 绘制背景
    context.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制文本
    context.fillStyle = `#${new THREE.Color(fontColor).getHexString()}`;
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    
    // 创建纹理
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    
    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    
    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, position.y, position.z);
    
    // 设置精灵缩放
    const aspectRatio = canvas.width / canvas.height;
    sprite.scale.set(aspectRatio, 1, 1);
    
    return sprite;
  }
  
  /**
   * 添加事件监听器
   * @param {HTMLElement} domElement - DOM元素
   */
  addEventListeners(domElement) {
    // 鼠标移动事件
    domElement.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event, domElement);
    });
    
    // 鼠标点击事件
    domElement.addEventListener('click', (event) => {
      this.handleMouseClick(event, domElement);
    });
  }
  
  /**
   * 处理鼠标移动事件
   * @param {MouseEvent} event - 鼠标事件
   * @param {HTMLElement} domElement - DOM元素
   */
  handleMouseMove(event, domElement) {
    // 计算鼠标位置
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
    
    // 检测与单元格的交叉
    const intersects = this.raycaster.intersectObjects(this.cells);
    
    // 重置之前悬停的单元格
    if (this.hoveredCell && (!intersects.length || intersects[0].object !== this.hoveredCell)) {
      const material = this.hoveredCell.material;
      material.color.copy(this.hoveredCell.userData.originalColor);
      material.emissive.set(0x000000);
      this.hoveredCell = null;
      
      // 移除工具提示
      if (this.tooltip) {
        this.scene.remove(this.tooltip);
        this.tooltip = null;
      }
    }
    
    // 处理新的悬停单元格
    if (intersects.length > 0) {
      const cell = intersects[0].object;
      
      // 如果是新的悬停单元格
      if (this.hoveredCell !== cell) {
        // 高亮单元格
        this.hoveredCell = cell;
        const material = cell.material;
        material.emissive.set(0x333333);
        
        // 创建工具提示
        const { value, row, col, xLabel, yLabel } = cell.userData;
        const tooltipText = `${xLabel}, ${yLabel}: ${value.toFixed(2)}`;
        
        // 移除旧的工具提示
        if (this.tooltip) {
          this.scene.remove(this.tooltip);
        }
        
        // 创建新的工具提示
        this.tooltip = this.createTextSprite(
          tooltipText,
          {
            x: cell.position.x,
            y: cell.position.y + cell.userData.targetHeight + 1,
            z: cell.position.z
          },
          {
            fontSize: 24,
            fontColor: 0x000000,
            backgroundColor: { r: 255, g: 255, b: 255, a: 0.8 }
          }
        );
        
        this.scene.add(this.tooltip);
      }
    }
  }
  
  /**
   * 处理鼠标点击事件
   * @param {MouseEvent} event - 鼠标事件
   * @param {HTMLElement} domElement - DOM元素
   */
  handleMouseClick(event, domElement) {
    // 计算鼠标位置
    const rect = domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
    
    // 检测与单元格的交叉
    const intersects = this.raycaster.intersectObjects(this.cells);
    
    // 重置之前选中的单元格
    if (this.selectedCellIndex !== -1) {
      const prevCell = this.cells[this.selectedCellIndex];
      const material = prevCell.material;
      material.color.copy(prevCell.userData.originalColor);
      material.emissive.set(0x000000);
      this.selectedCellIndex = -1;
    }
    
    // 处理新的选中单元格
    if (intersects.length > 0) {
      const cell = intersects[0].object;
      const index = this.cells.indexOf(cell);
      
      if (index !== -1) {
        this.selectedCellIndex = index;
        const material = cell.material;
        material.emissive.set(0x555555);
        
        // 显示单元格详细信息
        console.log('单元格信息:', cell.userData);
      }
    }
  }
  
  /**
   * 更新可视化
   * 在每一帧调用，用于动画和交互
   */
  update() {
    // 处理单元格高度动画
    if (this.animationStartTime && this.cellsToAnimate.length > 0) {
      const now = Date.now();
      const elapsed = now - this.animationStartTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      // 使用缓动函数使动画更平滑
      const easedProgress = this.easeOutCubic(progress);
      
      // 更新每个单元格的高度
      for (const item of this.cellsToAnimate) {
        const { cell, startHeight, targetHeight } = item;
        const currentHeight = startHeight + (targetHeight - startHeight) * easedProgress;
        
        // 更新几何体
        cell.scale.y = currentHeight / this.cellHeight;
        cell.position.y = currentHeight / 2;
      }
      
      // 动画完成后清除动画数据
      if (progress >= 1) {
        this.animationStartTime = null;
        this.cellsToAnimate = [];
      }
    }
    
    // 更新工具提示位置（如果有）
    if (this.tooltip && this.hoveredCell) {
      const camera = this.scene.userData.camera;
      
      // 计算工具提示位置
      this.tooltip.position.set(
        this.hoveredCell.position.x,
        this.hoveredCell.position.y + this.hoveredCell.userData.targetHeight + 1,
        this.hoveredCell.position.z
      );
      
      // 使工具提示始终面向相机
      this.tooltip.lookAt(camera.position);
    }
  }
  
  /**
   * 缓动函数 - 三次方缓出
   * @param {number} t - 进度 (0-1)
   * @returns {number} 缓动后的进度
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}
