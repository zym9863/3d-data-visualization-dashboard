/**
 * 3D折线图可视化组件
 * 基于Three.js实现的3D折线图，支持多条折线和动画效果
 */
import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class LineChart3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);

    // 折线图特定属性
    this.lineWidth = 3; // 线宽
    this.pointSize = 0.2; // 点大小
    this.gridSize = { width: 10, height: 10, depth: 10 }; // 网格大小
    this.gridDivisions = 10; // 网格分割数

    // 动画属性
    this.animationDuration = 1500; // 毫秒
    this.animationStartTime = null;
    this.linesToAnimate = [];

    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line.threshold = 0.2; // 线的检测阈值
    this.mouse = new THREE.Vector2();
    this.hoveredPoint = null;
    this.selectedLine = null;

    // 坐标轴范围
    this.axisRange = {
      x: { min: 0, max: 11 }, // 对应月份索引
      y: { min: -20, max: 40 }, // 温度范围
      z: { min: 0, max: 4 } // 城市索引
    };
  }

  create(camera, renderer) {
    if (!this.data || !this.data.series || !this.data.timePoints) {
      console.error('无效的数据格式，无法创建折线图');
      return;
    }

    // 清除之前的可视化
    this.clear();

    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;

    // 设置默认视角
    camera.position.set(15, 15, 15);
    camera.lookAt(5, 5, 2);

    // 创建地面网格
    this.createFloor();

    // 创建坐标轴和网格
    this.createAxes();

    // 创建折线
    this.createLines();

    // 创建图例
    this.createLegend();

    // 开始动画
    this.animationStartTime = Date.now();

    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
  }

  /**
   * 创建地面网格
   */
  createFloor() {
    // 创建地面网格
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);

    // 创建半透明地面
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });

    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
    this.objects.push(floor);
  }

  /**
   * 创建坐标轴和网格
   */
  createAxes() {
    // 创建坐标轴
    const axesHelper = new THREE.AxesHelper(10);
    this.scene.add(axesHelper);
    this.objects.push(axesHelper);

    // 创建X轴标签（月份）
    const months = this.data.timePoints;
    const monthCount = months.length;

    for (let i = 0; i < monthCount; i++) {
      const xPos = (i / (monthCount - 1)) * 10;
      // 将X轴标签放在地面上方，而不是下方
      this.createTextLabel(months[i], new THREE.Vector3(xPos, 0.3, 0), 0.6, 0xffffff);
    }

    // 创建Y轴标签（温度）
    const yMin = this.axisRange.y.min;
    const yMax = this.axisRange.y.max;
    const yStep = 10; // 每10度一个标签

    for (let temp = yMin; temp <= yMax; temp += yStep) {
      const yPos = this.normalizeY(temp);
      // 将Y轴标签向左移动，避免与轴重叠
      this.createTextLabel(`${temp}°C`, new THREE.Vector3(-1.2, yPos, 0), 0.6, 0xffffff);
    }

    // 创建Z轴标签（城市）
    const cities = this.data.series.map(s => s.name);
    const cityCount = cities.length;

    for (let i = 0; i < cityCount; i++) {
      const zPos = (i / (cityCount - 1)) * 4;
      // 将Z轴标签放在地面上方，而不是下方，并向右移动以避免与轴重叠
      this.createTextLabel(cities[i], new THREE.Vector3(0, 0.3, zPos), 0.6, 0xffffff);
    }

    // 添加坐标轴标题
    this.createTextLabel('月份', new THREE.Vector3(5, -1.5, 0), 0.8, 0x3498db); // X轴标题
    this.createTextLabel('温度(°C)', new THREE.Vector3(-2, 5, 0), 0.8, 0x2ecc71); // Y轴标题
    this.createTextLabel('城市', new THREE.Vector3(0, -1.5, 2), 0.8, 0xe74c3c); // Z轴标题
  }

  /**
   * 创建文本标签
   * @param {string} text - 标签文本
   * @param {THREE.Vector3} position - 标签位置
   * @param {number} size - 标签大小
   * @param {number} color - 标签颜色
   */
  createTextLabel(text, position, size = 0.5, color = 0xffffff) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    // 增加画布尺寸以提高文本清晰度
    canvas.width = 512;
    canvas.height = 256;

    // 绘制文本
    // 将颜色参数转换为十六进制颜色字符串
    const colorHex = '#' + color.toString(16).padStart(6, '0');
    context.fillStyle = colorHex;
    // 增大字体大小并使用粗体以提高可读性
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    // 添加文本阴影以增强可读性
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    context.fillText(text, 256, 128);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // 创建材质
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // 确保文本始终可见，不被其他对象遮挡
      depthWrite: false // 不写入深度缓冲区
    });

    // 创建精灵
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);
    // 增大精灵尺寸以适应更大的文本
    sprite.scale.set(size * 4, size * 2, 1);

    this.scene.add(sprite);
    this.objects.push(sprite);

    return sprite;
  }

  /**
   * 创建折线
   */
  createLines() {
    const { series, timePoints } = this.data;
    const monthCount = timePoints.length;

    // 为每个城市创建一条折线
    series.forEach((cityData, cityIndex) => {
      const { name, values, color } = cityData;

      // 创建线的点
      const points = [];
      const pointObjects = [];

      // 为每个月份创建点
      for (let i = 0; i < monthCount; i++) {
        const xPos = (i / (monthCount - 1)) * 10;
        const yPos = this.normalizeY(values[i]);
        const zPos = (cityIndex / (series.length - 1)) * 4;

        points.push(new THREE.Vector3(xPos, yPos, zPos));

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
          cityIndex: cityIndex,
          monthIndex: i,
          city: name,
          month: timePoints[i],
          value: values[i]
        };

        this.scene.add(point);
        this.objects.push(point);
        pointObjects.push(point);
      }

      // 创建线的几何体
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

      // 创建线的材质
      const lineMaterial = new THREE.LineBasicMaterial({
        color: color,
        linewidth: this.lineWidth
      });

      // 创建线对象
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.userData = {
        type: 'line',
        cityIndex: cityIndex,
        city: name,
        values: values,
        points: pointObjects
      };

      this.scene.add(line);
      this.objects.push(line);

      // 添加到动画列表
      this.linesToAnimate.push({
        line: line,
        points: pointObjects,
        originalPoints: points.map(p => p.clone())
      });
    });
  }

  /**
   * 创建图例
   */
  createLegend() {
    const { series } = this.data;
    const legendGroup = new THREE.Group();
    // 调整图例位置，使其更容易看到
    legendGroup.position.set(8, 8, 0);

    // 创建图例背景板
    const bgGeometry = new THREE.PlaneGeometry(3.5, series.length * 1.2 + 0.6);
    const bgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const bgPlane = new THREE.Mesh(bgGeometry, bgMaterial);
    bgPlane.position.set(1.2, -((series.length - 1) * 1.2) / 2, -0.1);
    legendGroup.add(bgPlane);

    // 为每个城市创建一个图例项
    series.forEach((cityData, index) => {
      const { name, color } = cityData;

      // 创建图例项的几何体（小立方体）
      const itemGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const itemMaterial = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2
      });

      const item = new THREE.Mesh(itemGeometry, itemMaterial);
      // 增加图例项之间的间距
      item.position.set(0, -index * 1.2, 0);

      // 创建图例文本，调整位置使其更靠近立方体
      // 将文本标签移动到立方体旁边，使其更紧凑
      const textSprite = this.createTextLabel(name, new THREE.Vector3(0.8, -index * 1.2, 0), 0.6, color);

      // 将文本精灵添加到图例组中
      legendGroup.add(textSprite);

      // 为文本添加点击事件数据，与立方体保持一致
      textSprite.userData = {
        type: 'legend',
        cityIndex: index,
        city: name
      };

      // 添加点击事件数据
      item.userData = {
        type: 'legend',
        cityIndex: index,
        city: name
      };

      legendGroup.add(item);
    });

    this.scene.add(legendGroup);
    this.objects.push(legendGroup);
  }

  /**
   * 添加事件监听器
   * @param {HTMLElement} domElement - 渲染器的DOM元素
   */
  addEventListeners(domElement) {
    // 鼠标移动事件
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

    // 鼠标点击事件
    domElement.addEventListener('click', this.onMouseClick.bind(this));
  }

  /**
   * 鼠标移动事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onMouseMove(event) {
    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 检测与点的交叉
    const intersects = this.raycaster.intersectObjects(this.objects);

    // 重置之前的悬停状态
    if (this.hoveredPoint) {
      this.hoveredPoint.scale.set(1, 1, 1);
      this.hoveredPoint = null;
    }

    // 处理新的悬停
    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object.userData && object.userData.type === 'point') {
        // 悬停在点上
        this.hoveredPoint = object;
        this.hoveredPoint.scale.set(1.5, 1.5, 1.5);

        // 显示提示信息
        const { city, month, value } = object.userData;
        console.log(`${city} - ${month}: ${value}°C`);
      }
    }
  }

  /**
   * 鼠标点击事件处理
   * @param {MouseEvent} event - 鼠标事件
   */
  onMouseClick(event) {
    // 计算鼠标在归一化设备坐标中的位置
    const rect = event.target.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 更新射线
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 检测与对象的交叉
    const intersects = this.raycaster.intersectObjects(this.objects);

    if (intersects.length > 0) {
      const object = intersects[0].object;

      if (object.userData && (object.userData.type === 'point' || object.userData.type === 'line' || object.userData.type === 'legend')) {
        // 获取城市索引
        const cityIndex = object.userData.cityIndex;

        // 查找对应的线
        const selectedLine = this.objects.find(obj =>
          obj.userData &&
          obj.userData.type === 'line' &&
          obj.userData.cityIndex === cityIndex
        );

        if (selectedLine) {
          // 重置之前选中的线
          if (this.selectedLine && this.selectedLine !== selectedLine) {
            this.selectedLine.material.linewidth = this.lineWidth;
            this.selectedLine.material.opacity = 1;

            // 重置点的大小
            if (this.selectedLine.userData.points) {
              this.selectedLine.userData.points.forEach(point => {
                point.scale.set(1, 1, 1);
              });
            }
          }

          // 设置新选中的线
          this.selectedLine = selectedLine;
          this.selectedLine.material.linewidth = this.lineWidth * 2;

          // 放大点
          if (this.selectedLine.userData.points) {
            this.selectedLine.userData.points.forEach(point => {
              point.scale.set(1.5, 1.5, 1.5);
            });
          }

          // 显示城市信息
          const { city, values } = this.selectedLine.userData;
          console.log(`选中城市: ${city}`);
          console.log(`温度数据: ${values.join(', ')}`);

          // 在场景中显示城市信息
          this.showCityInfo(city, values);
        }
      }
    }
  }

  /**
   * 显示城市信息
   * @param {string} city - 城市名称
   * @param {Array<number>} values - 温度数据
   */
  showCityInfo(city, values) {
    // 创建一个临时的信息面板
    const infoText = `${city}\n平均温度: ${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)}°C`;

    // 移除之前的信息面板（如果有）
    const oldInfo = this.objects.find(obj => obj.userData && obj.userData.type === 'infoPanel');
    if (oldInfo) {
      this.scene.remove(oldInfo);
      this.objects = this.objects.filter(obj => obj !== oldInfo);
    }

    // 创建新的信息面板
    const infoLabel = this.createTextLabel(infoText, new THREE.Vector3(5, 8, 2), 1.0, 0xffffff);
    infoLabel.userData = { type: 'infoPanel' };
  }

  /**
   * 归一化Y值（温度）到坐标系
   * @param {number} value - 温度值
   * @returns {number} 归一化后的Y坐标
   */
  normalizeY(value) {
    const { min, max } = this.axisRange.y;
    return ((value - min) / (max - min)) * 10;
  }

  /**
   * 更新可视化
   * 实现折线图的动画效果
   */
  update() {
    // 如果没有开始动画，直接返回
    if (!this.animationStartTime) return;

    // 计算动画进度
    const elapsed = Date.now() - this.animationStartTime;
    const progress = Math.min(elapsed / this.animationDuration, 1);

    // 使用缓动函数使动画更自然
    const easedProgress = this.easeOutCubic(progress);

    // 更新所有线的点位置
    this.linesToAnimate.forEach(item => {
      const { line, points, originalPoints } = item;

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
