/**
 * 3D面积图可视化组件
 * 基于Three.js实现的3D面积图，支持多个区域和动画效果
 */
import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class AreaChart3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);

    // 面积图特定属性
    this.areaOpacity = 0.7; // 面积透明度
    this.lineWidth = 3; // 线宽
    this.pointSize = 0.2; // 点大小
    this.gridSize = { width: 10, height: 10, depth: 10 }; // 网格大小
    this.gridDivisions = 10; // 网格分割数

    // 动画属性
    this.animationDuration = 1500; // 毫秒
    this.animationStartTime = null;
    this.areasToAnimate = [];

    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.hoveredPoint = null;
    this.selectedArea = null;
    this.tooltip = null;

    // 坐标轴范围
    this.axisRange = {
      x: { min: 0, max: 11 }, // 对应月份索引
      y: { min: 0, max: 500 }, // 数值范围
      z: { min: 0, max: 4 } // 区域索引
    };
  }

  /**
   * 重写清除方法，添加提示框的清理
   */
  clear() {
    // 调用父类的清除方法
    super.clear();

    // 清理提示框
    if (this.tooltip) {
      document.body.removeChild(this.tooltip);
      this.tooltip = null;
    }

    // 重置交互状态
    this.hoveredPoint = null;
    this.selectedArea = null;
    this.areasToAnimate = [];
  }

  create(camera, renderer) {
    if (!this.data || !this.data.series || !this.data.timePoints) {
      console.error('无效的数据格式，无法创建面积图');
      return;
    }

    // 清除之前的可视化
    this.clear();

    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;

    // 设置默认视角 - 调整为更好的观察角度
    camera.position.set(12, 18, 20);
    camera.lookAt(5, 5, 2);

    // 创建地面网格
    this.createFloor();

    // 创建坐标轴和网格
    this.createAxes();

    // 创建面积图
    this.createAreas();

    // 创建图例
    this.createLegend();

    // 创建数据提示框
    this.createTooltip();

    // 开始动画
    this.animationStartTime = Date.now();

    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
  }

  /**
   * 创建坐标轴和网格
   */
  createAxes() {
    // 创建坐标轴组
    const axesGroup = new THREE.Group();
    this.scene.add(axesGroup);
    this.objects.push(axesGroup);

    // 创建X轴（月份）
    const xAxisGeometry = new THREE.BufferGeometry();
    const xAxisPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(this.gridSize.width, 0, 0)
    ];
    xAxisGeometry.setFromPoints(xAxisPoints);
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
    axesGroup.add(xAxis);

    // 创建Y轴（数值）
    const yAxisGeometry = new THREE.BufferGeometry();
    const yAxisPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, this.gridSize.height, 0)
    ];
    yAxisGeometry.setFromPoints(yAxisPoints);
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const yAxis = new THREE.Line(yAxisGeometry, yAxisMaterial);
    axesGroup.add(yAxis);

    // 创建Z轴（区域）
    const zAxisGeometry = new THREE.BufferGeometry();
    const zAxisPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, this.gridSize.depth)
    ];
    zAxisGeometry.setFromPoints(zAxisPoints);
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
    const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
    axesGroup.add(zAxis);

    // 添加X轴刻度和标签
    const { timePoints } = this.data;
    const monthCount = timePoints.length;

    for (let i = 0; i < monthCount; i++) {
      const x = (i / (monthCount - 1)) * this.gridSize.width;

      // 创建刻度线 - 向上而不是向下
      const tickGeometry = new THREE.BufferGeometry();
      const tickPoints = [
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x, 0.2, 0) // 向上的刻度线
      ];
      tickGeometry.setFromPoints(tickPoints);
      const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      axesGroup.add(tick);

      // 创建标签 - 放在平面上方
      this.createTextLabel(timePoints[i], { x, y: 0.5, z: 0 }, 0.5, axesGroup);
    }

    // 添加Y轴刻度和标签
    const maxValue = this.getMaxValue();
    const yStep = Math.ceil(maxValue / 5 / 100) * 100; // 向上取整到最接近的100

    for (let i = 0; i <= 5; i++) {
      const y = (i / 5) * this.gridSize.height;
      const value = i * yStep;

      // 创建刻度线
      const tickGeometry = new THREE.BufferGeometry();
      const tickPoints = [
        new THREE.Vector3(0, y, 0),
        new THREE.Vector3(-0.2, y, 0)
      ];
      tickGeometry.setFromPoints(tickPoints);
      const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      axesGroup.add(tick);

      // 创建标签
      this.createTextLabel(value.toString(), { x: -0.5, y, z: 0 }, 0.5, axesGroup);
    }

    // 添加Z轴刻度和标签
    const { series } = this.data;
    const seriesCount = series.length;

    for (let i = 0; i < seriesCount; i++) {
      const z = (i / (seriesCount - 1)) * this.gridSize.depth;

      // 创建刻度线
      const tickGeometry = new THREE.BufferGeometry();
      const tickPoints = [
        new THREE.Vector3(0, 0, z),
        new THREE.Vector3(-0.2, 0, z)
      ];
      tickGeometry.setFromPoints(tickPoints);
      const tickMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const tick = new THREE.Line(tickGeometry, tickMaterial);
      axesGroup.add(tick);

      // 创建标签
      this.createTextLabel(series[i].name, { x: -0.5, y: 0, z }, 0.5, axesGroup);
    }

    // 创建网格线
    this.createGridLines(axesGroup);
  }

  /**
   * 创建网格线
   * @param {THREE.Group} parent - 父容器
   */
  createGridLines(parent) {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x555555,
      transparent: true,
      opacity: 0.2
    });

    // 创建XZ平面的网格线（Y=0平面）
    for (let i = 0; i <= this.gridDivisions; i++) {
      const x = (i / this.gridDivisions) * this.gridSize.width;

      // Z方向线
      const lineGeometry1 = new THREE.BufferGeometry();
      const linePoints1 = [
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x, 0, this.gridSize.depth)
      ];
      lineGeometry1.setFromPoints(linePoints1);
      const line1 = new THREE.Line(lineGeometry1, gridMaterial);
      parent.add(line1);
    }

    for (let i = 0; i <= this.gridDivisions; i++) {
      const z = (i / this.gridDivisions) * this.gridSize.depth;

      // X方向线
      const lineGeometry2 = new THREE.BufferGeometry();
      const linePoints2 = [
        new THREE.Vector3(0, 0, z),
        new THREE.Vector3(this.gridSize.width, 0, z)
      ];
      lineGeometry2.setFromPoints(linePoints2);
      const line2 = new THREE.Line(lineGeometry2, gridMaterial);
      parent.add(line2);
    }
  }

  /**
   * 创建文本标签
   * @param {string} text - 标签文本
   * @param {Object} position - 位置坐标
   * @param {number} size - 标签大小
   * @param {THREE.Object3D} parent - 父容器
   * @returns {THREE.Sprite} 文本精灵
   */
  createTextLabel(text, position, size, parent) {
    // 创建画布 - 增加分辨率以提高清晰度
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512; // 增加画布宽度
    canvas.height = 256; // 增加画布高度

    // 清除背景，不再添加半透明背景
    context.clearRect(0, 0, canvas.width, canvas.height);

    // 设置文本样式 - 增加字体大小和粗细
    context.font = 'bold 36px Arial'; // 加粗并增大字体
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // 增强文本阴影以提高可读性（没有背景的情况下）
    context.shadowColor = 'rgba(0, 0, 0, 0.9)';
    context.shadowBlur = 6;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    // 绘制文本
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // 创建材质
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });

    // 创建精灵
    const sprite = new THREE.Sprite(material);
    sprite.position.set(position.x, position.y, position.z);
    // 调整精灵尺寸以适应更大的文本
    sprite.scale.set(size * 4, size * 2, 1);

    if (parent) {
      parent.add(sprite);
    } else {
      this.scene.add(sprite);
      this.objects.push(sprite);
    }

    return sprite;
  }

  /**
   * 创建面积图
   */
  createAreas() {
    const { series, timePoints } = this.data;
    const monthCount = timePoints.length;
    const maxValue = this.getMaxValue();

    // 为每个区域创建面积
    series.forEach((areaData, areaIndex) => {
      const { name, values, color } = areaData;
      const zPos = (areaIndex / (series.length - 1)) * this.gridSize.depth;

      // 创建顶部线的点
      const linePoints = [];
      const pointObjects = [];

      // 为每个月份创建点
      for (let i = 0; i < monthCount; i++) {
        const xPos = (i / (monthCount - 1)) * this.gridSize.width;
        const yPos = (values[i] / maxValue) * this.gridSize.height;

        linePoints.push(new THREE.Vector3(xPos, yPos, zPos));

        // 创建点对象
        const pointGeometry = new THREE.SphereGeometry(this.pointSize, 16, 16);
        const pointMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.2,
          specular: 0xffffff
        });

        const point = new THREE.Mesh(pointGeometry, pointMaterial);
        point.position.set(xPos, yPos, zPos);
        point.userData = {
          type: 'point',
          areaIndex: areaIndex,
          monthIndex: i,
          area: name,
          month: timePoints[i],
          value: values[i]
        };

        this.scene.add(point);
        this.objects.push(point);
        pointObjects.push(point);
      }

      // 创建顶部线
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: this.lineWidth
      });

      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = {
        type: 'line',
        areaIndex: areaIndex,
        area: name
      };

      this.scene.add(line);
      this.objects.push(line);

      // 创建面积
      // 为了创建面积，我们需要创建一个从顶部线到底部的面
      const areaShape = new THREE.Shape();

      // 添加顶部线的点
      areaShape.moveTo(0, 0);
      for (let i = 0; i < linePoints.length; i++) {
        const point = linePoints[i];
        areaShape.lineTo(point.x, point.y);
      }

      // 添加底部线的点（反向）
      areaShape.lineTo(this.gridSize.width, 0);
      areaShape.lineTo(0, 0);

      // 创建几何体
      const areaGeometry = new THREE.ShapeGeometry(areaShape);

      // 将几何体旋转和移动到正确的位置
      areaGeometry.rotateX(-Math.PI / 2);
      areaGeometry.translate(0, 0, zPos);

      // 创建材质
      const areaMaterial = new THREE.MeshPhongMaterial({
        color: color,
        transparent: true,
        opacity: this.areaOpacity,
        side: THREE.DoubleSide,
        shininess: 50
      });

      // 创建网格
      const areaMesh = new THREE.Mesh(areaGeometry, areaMaterial);
      areaMesh.userData = {
        type: 'area',
        areaIndex: areaIndex,
        area: name
      };

      this.scene.add(areaMesh);
      this.objects.push(areaMesh);

      // 添加到动画列表
      this.areasToAnimate.push({
        area: areaMesh,
        line: line,
        points: pointObjects,
        originalPoints: linePoints.map(p => p.clone())
      });
    });
  }

  /**
   * 创建图例
   */
  createLegend() {
    const { series } = this.data;
    const legendGroup = new THREE.Group();

    // 创建图例背景板，增强可读性
    const bgWidth = 3;
    const bgHeight = series.length * 0.8 + 0.4;
    const bgGeometry = new THREE.PlaneGeometry(bgWidth, bgHeight);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });

    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.set(1, -((series.length - 1) * 0.4), 0);
    legendGroup.add(background);

    // 将图例放在右上角，稍微调整位置使其更加可见
    legendGroup.position.set(this.gridSize.width - 1, this.gridSize.height, 2);

    // 为每个系列创建图例项
    series.forEach((item, index) => {
      const y = -index * 0.8; // 增加间距

      // 创建图例颜色块 - 使用更大的方块
      const boxGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const boxMaterial = new THREE.MeshPhongMaterial({
        color: item.color,
        emissive: item.color,
        emissiveIntensity: 0.3,
        specular: 0xffffff
      });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      box.position.set(0, y, 0);
      legendGroup.add(box);

      // 创建图例文本 - 调整位置
      this.createTextLabel(item.name, { x: 1.2, y, z: 0 }, 0.4, legendGroup);
    });

    // 添加图例标题
    this.createTextLabel("图例", { x: 0.6, y: 0.6, z: 0 }, 0.4, legendGroup);

    // 旋转图例使其始终面向相机
    legendGroup.rotation.y = Math.PI / 6; // 稍微旋转以增加3D效果

    this.scene.add(legendGroup);
    this.objects.push(legendGroup);
  }

  /**
   * 创建地面
   */
  createFloor() {
    const geometry = new THREE.PlaneGeometry(
      this.gridSize.width,
      this.gridSize.depth
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x333333,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = Math.PI / 2;
    floor.position.set(this.gridSize.width / 2, 0, this.gridSize.depth / 2);

    this.scene.add(floor);
    this.objects.push(floor);
  }

  /**
   * 添加事件监听器
   * @param {HTMLElement} domElement - DOM元素
   */
  addEventListeners(domElement) {
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    domElement.addEventListener('click', this.onClick.bind(this));
  }

  /**
   * 创建数据提示框
   */
  createTooltip() {
    // 创建HTML提示框
    const tooltip = document.createElement('div');
    tooltip.className = 'visualization-tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.padding = '10px';
    tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    tooltip.style.color = 'white';
    tooltip.style.borderRadius = '4px';
    tooltip.style.fontSize = '14px';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    tooltip.style.transition = 'opacity 0.2s';

    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
  }

  /**
   * 鼠标移动事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onMouseMove(event) {
    if (!this.tooltip) return;

    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 查找所有点对象
    const pointObjects = this.objects.filter(obj => obj.userData && obj.userData.type === 'point');

    // 检测射线与点的交点
    const intersects = this.raycaster.intersectObjects(pointObjects);

    if (intersects.length > 0) {
      const intersect = intersects[0].object;

      // 如果悬停在新的点上
      if (this.hoveredPoint !== intersect) {
        // 重置之前的点
        if (this.hoveredPoint) {
          this.hoveredPoint.material.emissiveIntensity = 0.2;
          this.hoveredPoint.scale.set(1, 1, 1);
        }

        // 高亮新的点
        this.hoveredPoint = intersect;
        this.hoveredPoint.material.emissiveIntensity = 0.5;
        this.hoveredPoint.scale.set(1.5, 1.5, 1.5);
      }

      // 显示提示信息
      const { area, month, value } = intersect.userData;

      // 更新提示框内容
      this.tooltip.innerHTML = `
        <div><strong>${area}</strong></div>
        <div>${month}: ${value}</div>
      `;

      // 更新提示框位置
      this.tooltip.style.left = `${event.clientX + 10}px`;
      this.tooltip.style.top = `${event.clientY + 10}px`;
      this.tooltip.style.display = 'block';

    } else {
      // 隐藏提示框
      this.tooltip.style.display = 'none';

      // 重置之前的点
      if (this.hoveredPoint) {
        this.hoveredPoint.material.emissiveIntensity = 0.2;
        this.hoveredPoint.scale.set(1, 1, 1);
        this.hoveredPoint = null;
      }
    }
  }

  /**
   * 鼠标点击事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onClick(event) {
    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 查找所有区域对象
    const areaObjects = this.objects.filter(obj => obj.userData && obj.userData.type === 'area');

    // 检测射线与区域的交点
    const intersects = this.raycaster.intersectObjects(areaObjects);

    if (intersects.length > 0) {
      const intersect = intersects[0].object;
      const areaIndex = intersect.userData.areaIndex;

      // 切换选中状态
      if (this.selectedArea === intersect) {
        // 取消选中
        intersect.material.opacity = this.areaOpacity;
        this.selectedArea = null;
      } else {
        // 重置之前选中的区域
        if (this.selectedArea) {
          this.selectedArea.material.opacity = this.areaOpacity;
        }

        // 选中新区域
        this.selectedArea = intersect;
        intersect.material.opacity = 1.0;
      }
    }
  }

  /**
   * 获取数据中的最大值
   * @returns {number} 最大值
   */
  getMaxValue() {
    const { series } = this.data;
    let maxValue = 0;

    series.forEach(item => {
      const seriesMax = Math.max(...item.values);
      if (seriesMax > maxValue) {
        maxValue = seriesMax;
      }
    });

    return maxValue;
  }

  /**
   * 归一化Y值到坐标系
   * @param {number} value - 原始值
   * @returns {number} 归一化后的Y坐标
   */
  normalizeY(value) {
    const maxValue = this.getMaxValue();
    return (value / maxValue) * this.gridSize.height;
  }

  /**
   * 更新可视化
   * 实现面积图的动画效果
   */
  update() {
    // 如果没有开始动画，直接返回
    if (!this.animationStartTime) return;

    // 计算动画进度
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);

    // 使用缓动函数使动画更自然
    const easedProgress = this.easeOutCubic(progress);

    // 更新所有区域的点位置
    this.areasToAnimate.forEach(item => {
      const { area, line, points, originalPoints } = item;

      // 更新线的几何体
      const positions = line.geometry.attributes.position.array;

      for (let i = 0; i < originalPoints.length; i++) {
        const point = originalPoints[i];

        // 从Y=0开始动画到最终位置
        const currentY = point.y * easedProgress;

        // 更新线的顶点
        positions[i * 3 + 1] = currentY;

        // 更新点的位置
        if (points[i]) {
          points[i].position.y = currentY;
        }
      }

      line.geometry.attributes.position.needsUpdate = true;

      // 更新区域几何体
      // 由于ShapeGeometry不容易直接修改，我们通过缩放来实现动画
      area.scale.y = easedProgress;
    });

    // 动画结束后重置动画状态
    if (progress >= 1) {
      this.animationStartTime = null;
    }
  }

  /**
   * 缓动函数：缓出立方
   * @param {number} t - 进度值（0-1）
   * @returns {number} 缓动后的进度值
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }
}
