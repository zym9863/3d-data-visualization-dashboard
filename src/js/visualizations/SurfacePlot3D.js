import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class SurfacePlot3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);
    
    // 表面图特定属性
    this.gridSize = { width: 0, height: 0 };
    this.surfaceColors = [
      0x0000ff, // 蓝色（低值）
      0x00ffff, // 青色
      0x00ff00, // 绿色
      0xffff00, // 黄色
      0xff0000  // 红色（高值）
    ];
    
    // 动画属性
    this.animationDuration = 1500; // 毫秒
    this.animationStartTime = null;
    
    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredPoint = null;
    
    // 坐标轴范围
    this.axisRange = {
      x: { min: 0, max: 10 },
      y: { min: 0, max: 10 },
      z: { min: 0, max: 10 }
    };
    
    // 表面网格
    this.surfaceMesh = null;
    this.wireframe = null;
    this.colorScale = null;
  }
  
  create(camera, renderer) {
    if (!this.data || !this.data.values || !Array.isArray(this.data.values)) {
      console.error('无效的数据格式，无法创建表面图');
      return;
    }
    
    // 清除之前的可视化
    this.clear();
    
    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;
    
    // 设置默认视角
    camera.position.set(15, 20, 15);
    camera.lookAt(5, 0, 5);
    
    // 创建地面网格
    this.createFloor();
    
    // 创建坐标轴
    this.createAxes();
    
    // 创建表面
    this.createSurface();
    
    // 创建图例 - 在视图右上角
    this.createLegend();
    
    // 开始动画
    this.animationStartTime = Date.now();
    
    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
    
    // 创建数据提示框
    this.createTooltip();
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
  
  createAxes() {
    // 获取数据范围
    const { xLabels, yLabels, values } = this.data;
    
    // 设置网格大小
    this.gridSize.width = xLabels ? xLabels.length : values[0].length;
    this.gridSize.height = yLabels ? yLabels.length : values.length;
    
    // 计算数据范围
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const value = values[i][j];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
    }
    
    // 设置坐标轴范围
    this.axisRange.x.max = this.gridSize.width;
    this.axisRange.z.max = this.gridSize.height;
    this.axisRange.y.min = Math.min(0, minValue);
    this.axisRange.y.max = Math.max(maxValue * 1.1, 0.1); // 留出一些空间
    
    // 创建坐标轴
    const axisLength = 12;
    const axisWidth = 0.05;
    
    // X轴
    const xAxisGeometry = new THREE.BoxGeometry(axisLength, axisWidth, axisWidth);
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
    xAxis.position.set(axisLength / 2, 0, 0);
    this.scene.add(xAxis);
    this.objects.push(xAxis);
    
    // Y轴
    const yAxisGeometry = new THREE.BoxGeometry(axisWidth, axisLength, axisWidth);
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
    yAxis.position.set(0, axisLength / 2, 0);
    this.scene.add(yAxis);
    this.objects.push(yAxis);
    
    // Z轴
    const zAxisGeometry = new THREE.BoxGeometry(axisWidth, axisWidth, axisLength);
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
    zAxis.position.set(0, 0, axisLength / 2);
    this.scene.add(zAxis);
    this.objects.push(zAxis);
    
    // 添加坐标轴标签
    this.addAxisLabels(xLabels, yLabels, minValue, maxValue);
  }
  
  addAxisLabels(xLabels, yLabels, minValue, maxValue) {
    const loader = new THREE.TextureLoader();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 128;
    canvas.height = 64;
    
    // X轴标签
    if (xLabels && xLabels.length > 0) {
      const step = this.gridSize.width / (xLabels.length - 1);
      
      for (let i = 0; i < xLabels.length; i++) {
        const x = i * step;
        
        // 创建标签
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(xLabels[i], canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(x, -0.5, 0);
        sprite.scale.set(1, 0.5, 1);
        this.scene.add(sprite);
        this.objects.push(sprite);
      }
    }
    
    // Z轴标签
    if (yLabels && yLabels.length > 0) {
      const step = this.gridSize.height / (yLabels.length - 1);
      
      for (let i = 0; i < yLabels.length; i++) {
        const z = i * step;
        
        // 创建标签
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.font = '24px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(yLabels[i], canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(material);
        sprite.position.set(0, -0.5, z);
        sprite.scale.set(1, 0.5, 1);
        this.scene.add(sprite);
        this.objects.push(sprite);
      }
    }
    
    // Y轴刻度
    const yRange = this.axisRange.y.max - this.axisRange.y.min;
    const yStep = yRange / 5;
    
    for (let i = 0; i <= 5; i++) {
      const y = this.axisRange.y.min + i * yStep;
      
      // 创建标签
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.font = '24px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(y.toFixed(1), canvas.width / 2, canvas.height / 2);
      
      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({ map: texture });
      const sprite = new THREE.Sprite(material);
      sprite.position.set(-0.5, y, 0);
      sprite.scale.set(1, 0.5, 1);
      this.scene.add(sprite);
      this.objects.push(sprite);
    }
  }
  
  createSurface() {
    const { values } = this.data;
    const rows = values.length;
    const cols = values[0].length;
    
    // 创建表面几何体
    const geometry = new THREE.PlaneGeometry(
      this.gridSize.width,
      this.gridSize.height,
      cols - 1,
      rows - 1
    );
    
    // 调整顶点高度
    const vertices = geometry.attributes.position.array;
    const colors = [];
    
    // 计算颜色比例尺
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const value = values[i][j];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
    }
    
    const valueRange = maxValue - minValue;
    
    // 创建颜色数组
    const colorBuffer = new Float32Array(rows * cols * 3);
    
    // 设置顶点位置和颜色
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i * cols + j;
        const posIndex = index * 3;
        
        // 计算网格上的位置
        const x = j / (cols - 1) * this.gridSize.width;
        const z = i / (rows - 1) * this.gridSize.height;
        const y = values[i][j];
        
        // 设置顶点位置
        vertices[posIndex] = x;
        vertices[posIndex + 1] = y;
        vertices[posIndex + 2] = z;
        
        // 计算颜色（基于值的渐变）
        const normalizedValue = (y - minValue) / valueRange;
        const colorIndex = Math.floor(normalizedValue * (this.surfaceColors.length - 1));
        const nextColorIndex = Math.min(colorIndex + 1, this.surfaceColors.length - 1);
        const colorFraction = normalizedValue * (this.surfaceColors.length - 1) - colorIndex;
        
        const color1 = new THREE.Color(this.surfaceColors[colorIndex]);
        const color2 = new THREE.Color(this.surfaceColors[nextColorIndex]);
        const color = color1.lerp(color2, colorFraction);
        
        // 设置颜色
        colorBuffer[posIndex] = color.r;
        colorBuffer[posIndex + 1] = color.g;
        colorBuffer[posIndex + 2] = color.b;
      }
    }
    
    // 更新几何体顶点
    geometry.attributes.position.needsUpdate = true;
    
    // 添加颜色属性
    geometry.setAttribute('color', new THREE.BufferAttribute(colorBuffer, 3));
    
    // 创建材质
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 50,
      flatShading: true
    });
    
    // 创建网格
    this.surfaceMesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.surfaceMesh);
    this.objects.push(this.surfaceMesh);
    
    // 添加线框
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });
    
    this.wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
    this.scene.add(this.wireframe);
    this.objects.push(this.wireframe);
    
    // 设置初始位置（用于动画）
    this.surfaceMesh.position.y = -5;
    this.wireframe.position.y = -5;
  }
  
  createLegend() {
    // 创建图例 - 使用HTML和CSS实现更好的可视化效果
    const legendContainer = document.createElement('div');
    legendContainer.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      padding: 15px;
      border-radius: 8px;
      color: white;
      font-family: 'Roboto', sans-serif;
      pointer-events: none;
      z-index: 1000;
    `;

    // 创建渐变条
    const gradientBar = document.createElement('div');
    gradientBar.style.cssText = `
      width: 30px;
      height: 200px;
      margin: 10px auto;
      background: linear-gradient(
        to bottom,
        #ff0000,
        #ffff00,
        #00ff00,
        #00ffff,
        #0000ff
      );
      border-radius: 4px;
    `;

    // 添加标题
    const title = document.createElement('div');
    title.textContent = '数值范围';
    title.style.cssText = `
      text-align: center;
      margin-bottom: 10px;
      font-weight: bold;
    `;

    // 获取数据范围
    const { values } = this.data;
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (let i = 0; i < values.length; i++) {
      for (let j = 0; j < values[i].length; j++) {
        const value = values[i][j];
        if (value < minValue) minValue = value;
        if (value > maxValue) maxValue = value;
      }
    }

    // 添加最大值和最小值标签
    const maxLabel = document.createElement('div');
    maxLabel.textContent = maxValue.toFixed(2);
    maxLabel.style.cssText = 'text-align: center; margin-bottom: 5px;';

    const minLabel = document.createElement('div');
    minLabel.textContent = minValue.toFixed(2);
    minLabel.style.cssText = 'text-align: center; margin-top: 5px;';

    // 组装图例
    legendContainer.appendChild(title);
    legendContainer.appendChild(maxLabel);
    legendContainer.appendChild(gradientBar);
    legendContainer.appendChild(minLabel);

    // 将图例添加到DOM
    document.body.appendChild(legendContainer);

    // 保存引用以便清除
    this.legendElement = legendContainer;
  }
  
  createTooltip() {
    // 创建数据提示框
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 4px;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      pointer-events: none;
      display: none;
      z-index: 1000;
      transition: all 0.2s ease;
    `;
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  addEventListeners(domElement) {
    // 添加鼠标移动事件监听器
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // 添加鼠标离开事件监听器
    domElement.addEventListener('mouseleave', () => {
      if (this.tooltip) {
        this.tooltip.style.display = 'none';
      }
      // 重置高亮效果
      if (this.hoveredPoint) {
        this.hoveredPoint.material.emissive.setHex(0x000000);
        this.hoveredPoint = null;
      }
    });
  }

  onMouseMove(event) {
    if (!this.surfaceMesh || !this.tooltip) return;

    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 检测射线与表面的交点
    const intersects = this.raycaster.intersectObject(this.surfaceMesh);

    if (intersects.length > 0) {
      const intersect = intersects[0];
      const face = intersect.face;
      const point = intersect.point;

      // 获取交点对应的网格顶点索引
      const vertices = this.surfaceMesh.geometry.attributes.position;
      const x = Math.floor(face.a / (this.gridSize.height + 1));
      const z = face.a % (this.gridSize.height + 1);

      // 获取数据值
      const value = this.data.values[z] ? this.data.values[z][x] : null;

      if (value !== null) {
        // 更新提示框位置和内容
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = `${event.clientX + 10}px`;
        this.tooltip.style.top = `${event.clientY + 10}px`;
        
        // 格式化提示信息
        const xLabel = this.data.xLabels ? this.data.xLabels[x] : `X: ${x}`;
        const zLabel = this.data.yLabels ? this.data.yLabels[z] : `Z: ${z}`;
        this.tooltip.innerHTML = `
          <strong>${xLabel}, ${zLabel}</strong><br>
          值: ${value.toFixed(2)}
        `;

        // 高亮当前点
        if (this.hoveredPoint && this.hoveredPoint !== intersect.object) {
          this.hoveredPoint.material.emissive.setHex(0x000000);
        }
        intersect.object.material.emissive.setHex(0x555555);
        this.hoveredPoint = intersect.object;
      }
    } else {
      // 隐藏提示框
      this.tooltip.style.display = 'none';
      
      // 重置高亮效果
      if (this.hoveredPoint) {
        this.hoveredPoint.material.emissive.setHex(0x000000);
        this.hoveredPoint = null;
      }
    }
  }
  
  update() {
    // 处理动画
    if (this.animationStartTime) {
      const elapsed = Date.now() - this.animationStartTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);
      
      // 使用缓动函数使动画更平滑
      const easedProgress = this.easeOutCubic(progress);
      
      if (this.surfaceMesh && this.wireframe) {
        // 从下方升起的动画
        const targetY = 0;
        const currentY = -5 * (1 - easedProgress);
        
        this.surfaceMesh.position.y = currentY;
        this.wireframe.position.y = currentY;
        
        if (progress >= 1) {
          this.animationStartTime = null;
        }
      }
    }
    
    // 处理悬停交互
    if (this.scene.userData.camera && this.surfaceMesh) {
      this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);
      
      const intersects = this.raycaster.intersectObject(this.surfaceMesh);
      
      if (intersects.length > 0) {
        const intersect = intersects[0];
        
        // 如果有新的悬停点
        if (!this.hoveredPoint || this.hoveredPoint.point.distanceTo(intersect.point) > 0.01) {
          // 移除旧的悬停点
          if (this.hoveredPoint && this.hoveredPoint.marker) {
            this.scene.remove(this.hoveredPoint.marker);
            this.objects = this.objects.filter(obj => obj !== this.hoveredPoint.marker);
          }
          
          // 创建新的悬停点标记
          const geometry = new THREE.SphereGeometry(0.1, 16, 16);
          const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const marker = new THREE.Mesh(geometry, material);
          marker.position.copy(intersect.point);
          this.scene.add(marker);
          this.objects.push(marker);
          
          // 创建标签显示值
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = 128;
          canvas.height = 64;
          
          context.fillStyle = '#000000';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#ffffff';
          context.font = '16px Arial';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.fillText(`值: ${intersect.point.y.toFixed(2)}`, canvas.width / 2, canvas.height / 2);
          
          const texture = new THREE.CanvasTexture(canvas);
          const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.position.copy(intersect.point);
          sprite.position.y += 0.5;
          sprite.scale.set(1, 0.5, 1);
          this.scene.add(sprite);
          this.objects.push(sprite);
          
          // 保存悬停点信息
          this.hoveredPoint = {
            point: intersect.point.clone(),
            marker: marker,
            label: sprite
          };
        }
      } else if (this.hoveredPoint) {
        // 如果没有交点但有悬停点，移除悬停点
        if (this.hoveredPoint.marker) {
          this.scene.remove(this.hoveredPoint.marker);
          this.objects = this.objects.filter(obj => obj !== this.hoveredPoint.marker);
        }
        
        if (this.hoveredPoint.label) {
          this.scene.remove(this.hoveredPoint.label);
          this.objects = this.objects.filter(obj => obj !== this.hoveredPoint.label);
        }
        
        this.hoveredPoint = null;
      }
    }
  }
  
  // 缓动函数
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}