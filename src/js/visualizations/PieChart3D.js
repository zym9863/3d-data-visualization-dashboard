/**
 * 3D饼图可视化组件
 * 基于Three.js实现的3D饼图，支持动画和交互效果
 */
import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class PieChart3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);

    // 饼图特定属性
    this.radius = 5;           // 饼图半径
    this.height = 1;           // 饼图高度
    this.centerX = 0;          // 中心X坐标
    this.centerZ = 0;          // 中心Z坐标
    this.startY = 0.5;         // 起始Y坐标（高度的一半）
    this.angleOffset = 0;      // 起始角度偏移
    this.explodeOffset = 0.2;  // 选中扇区偏移量
    this.colors = [
      0x3498db, // 蓝色
      0x2ecc71, // 绿色
      0xe74c3c, // 红色
      0xf39c12, // 橙色
      0x9b59b6, // 紫色
      0x1abc9c, // 青绿色
      0xd35400, // 深橙色
      0x34495e, // 深蓝灰色
      0x16a085, // 深青色
      0x27ae60, // 深绿色
      0x2980b9, // 深蓝色
      0x8e44ad  // 深紫色
    ];

    // 动画属性
    this.animationDuration = 1500; // 毫秒
    this.animationStartTime = null;
    this.slicesToAnimate = [];

    // 交互属性
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.selectedSliceIndex = -1;
    this.hoveredSliceIndex = -1;
    this.slices = [];
    this.totalValue = 0;
    this.labelSprites = [];

    // 图例属性
    this.legendGroup = null;
    this.legendItems = [];
  }

  create(camera, renderer) {
    if (!this.data || !Array.isArray(this.data) || this.data.length === 0) {
      console.error('无效的数据格式，无法创建饼图');
      return;
    }

    // 清除之前的可视化
    this.clear();

    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;

    // 设置默认视角 - 从上方45度角观察饼图
    camera.position.set(10, 15, 10);
    camera.lookAt(0, 0, 0);

    // 创建地面网格
    this.createFloor();

    // 分析数据，找出分类字段和数值字段
    const { categoryField, valueField } = this.analyzeData();

    if (!categoryField || !valueField) {
      console.error('无法识别分类字段和数值字段，无法创建饼图');
      return;
    }

    // 计算总值
    this.totalValue = this.data.reduce((sum, item) => sum + item[valueField], 0);

    // 创建饼图
    this.createPieSlices(categoryField, valueField);

    // 创建图例
    this.createLegend(categoryField, valueField);

    // 创建中心标题
    this.createCenterLabel();

    // 开始动画
    this.animationStartTime = Date.now();

    // 添加鼠标事件监听器
    this.addEventListeners(renderer.domElement);
  }

  /**
   * 分析数据，找出分类字段和数值字段
   * @returns {Object} 包含categoryField和valueField的对象
   */
  analyzeData() {
    if (!this.data || this.data.length === 0) {
      return { categoryField: null, valueField: null };
    }

    const firstItem = this.data[0];
    let categoryField = null;
    let valueField = null;

    // 查找第一个非数值字段作为分类字段
    for (const key in firstItem) {
      if (typeof firstItem[key] !== 'number') {
        categoryField = key;
        break;
      }
    }

    // 查找第一个数值字段作为值字段
    for (const key in firstItem) {
      if (typeof firstItem[key] === 'number') {
        valueField = key;
        break;
      }
    }

    return { categoryField, valueField };
  }

  /**
   * 创建地面网格
   */
  createFloor() {
    // 创建地面网格
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444);
    gridHelper.position.y = 0;
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);

    // 创建半透明地面
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
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

    // 添加环境光和定向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    this.objects.push(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    this.scene.add(directionalLight);
    this.objects.push(directionalLight);
  }

  /**
   * 创建饼图扇区
   * @param {string} categoryField - 分类字段名
   * @param {string} valueField - 值字段名
   */
  createPieSlices(categoryField, valueField) {
    let startAngle = this.angleOffset;

    // 为每个数据项创建一个扇区
    this.data.forEach((item, index) => {
      const value = item[valueField];
      const category = item[categoryField];

      // 计算扇区角度
      const angle = (value / this.totalValue) * Math.PI * 2;
      const endAngle = startAngle + angle;

      // 创建扇区几何体
      const sliceGeometry = new THREE.CylinderGeometry(
        this.radius,         // 顶部半径
        this.radius,         // 底部半径
        this.height,         // 高度
        32,                  // 径向分段数
        1,                   // 高度分段数
        false,               // 是否开口
        startAngle,          // 起始角度
        angle                // 扇区角度
      );

      // 计算扇区中心点的角度
      const midAngle = startAngle + angle / 2;

      // 计算扇区中心点的位置（用于标签和选中时的偏移）
      const sliceCenterX = this.centerX + Math.sin(midAngle) * (this.radius / 2);
      const sliceCenterZ = this.centerZ + Math.cos(midAngle) * (this.radius / 2);

      // 创建扇区材质
      const sliceColor = this.colors[index % this.colors.length];
      const sliceMaterial = new THREE.MeshPhongMaterial({
        color: sliceColor,
        transparent: true,
        opacity: 0.9,
        shininess: 30,
        side: THREE.DoubleSide
      });

      // 创建扇区网格
      const slice = new THREE.Mesh(sliceGeometry, sliceMaterial);

      // 设置扇区位置
      slice.position.set(this.centerX, this.startY, this.centerZ);

      // 存储扇区数据
      slice.userData = {
        type: 'slice',
        index: index,
        value: value,
        percentage: (value / this.totalValue) * 100,
        category: category,
        midAngle: midAngle,
        centerX: sliceCenterX,
        centerZ: sliceCenterZ,
        color: sliceColor,
        isExploded: false
      };

      // 添加到场景
      this.scene.add(slice);
      this.objects.push(slice);
      this.slices.push(slice);

      // 创建扇区标签
      this.createSliceLabel(slice);

      // 更新起始角度
      startAngle = endAngle;
    });

    // 添加到动画列表
    this.slicesToAnimate = this.slices.map(slice => ({
      slice: slice,
      targetScale: 1,
      originalPosition: slice.position.clone()
    }));
  }

  /**
   * 创建扇区标签
   * @param {THREE.Mesh} slice - 扇区网格
   */
  createSliceLabel(slice) {
    const { category, value, percentage, midAngle, color } = slice.userData;

    // 计算标签位置（在扇区外部）
    const labelDistance = this.radius * 1.3;
    const labelX = this.centerX + Math.sin(midAngle) * labelDistance;
    const labelY = this.startY + this.height / 2;
    const labelZ = this.centerZ + Math.cos(midAngle) * labelDistance;

    // 创建标签内容
    const labelText = `${category}: ${value.toFixed(1)} (${percentage.toFixed(1)}%)`;

    // 创建标签精灵 - 移除背景
    const labelSprite = this.createTextSprite(
      labelText,
      new THREE.Vector3(labelX, labelY, labelZ),
      {
        fontFace: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        textColor: this.rgbToHex(color),
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 } // 设置背景透明度为0，移除背景
      }
    );

    // 存储标签引用
    this.labelSprites.push(labelSprite);
  }

  /**
   * 创建中心标签
   */
  createCenterLabel() {
    // 创建中心标签内容
    const labelText = `总计: ${this.totalValue.toFixed(1)}`;

    // 创建中心标签精灵 - 移除背景
    const centerLabelSprite = this.createTextSprite(
      labelText,
      new THREE.Vector3(this.centerX, this.startY + this.height + 1, this.centerZ),
      {
        fontFace: 'Arial',
        fontSize: 32,
        fontWeight: 'bold',
        textColor: { r: 255, g: 255, b: 255 },
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 } // 设置背景透明度为0，移除背景
      }
    );

    // 存储标签引用
    this.labelSprites.push(centerLabelSprite);
  }

  /**
   * 创建图例
   * @param {string} categoryField - 分类字段名
   * @param {string} valueField - 值字段名
   */
  createLegend(categoryField, valueField) {
    // 创建图例组
    this.legendGroup = new THREE.Group();
    this.legendGroup.position.set(-9, 8, -9);

    // 创建图例背景
    const legendBgGeometry = new THREE.PlaneGeometry(6, this.data.length * 0.6 + 1);
    const legendBgMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });

    const legendBg = new THREE.Mesh(legendBgGeometry, legendBgMaterial);
    legendBg.position.set(3, 0, 0);
    this.legendGroup.add(legendBg);

    // 创建图例标题
    const titleSprite = this.createTextSprite(
      '图例',
      new THREE.Vector3(3, this.data.length * 0.3, 0.1),
      {
        fontFace: 'Arial',
        fontSize: 24,
        fontWeight: 'bold',
        textColor: { r: 255, g: 255, b: 255 },
        backgroundColor: { r: 0, g: 0, b: 0, a: 0 }
      }
    );

    this.legendGroup.add(titleSprite);

    // 为每个数据项创建图例项
    this.data.forEach((item, index) => {
      const category = item[categoryField];
      const value = item[valueField];
      const percentage = (value / this.totalValue) * 100;
      const color = this.colors[index % this.colors.length];

      // 创建图例项的颜色方块
      const itemGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
      const itemMaterial = new THREE.MeshBasicMaterial({ color: color });
      const itemMesh = new THREE.Mesh(itemGeometry, itemMaterial);

      // 设置位置
      itemMesh.position.set(1, -index * 0.6, 0.1);

      // 创建图例项的文本
      const itemText = `${category}: ${percentage.toFixed(1)}%`;
      const textSprite = this.createTextSprite(
        itemText,
        new THREE.Vector3(3.5, -index * 0.6, 0.1),
        {
          fontFace: 'Arial',
          fontSize: 20,
          textColor: { r: 255, g: 255, b: 255 },
          backgroundColor: { r: 0, g: 0, b: 0, a: 0 }
        }
      );

      // 添加到图例组
      this.legendGroup.add(itemMesh);
      this.legendGroup.add(textSprite);

      // 存储图例项引用
      this.legendItems.push({
        mesh: itemMesh,
        text: textSprite,
        index: index
      });
    });

    // 添加图例组到场景
    this.scene.add(this.legendGroup);
    this.objects.push(this.legendGroup);
  }

  /**
   * 创建文本精灵
   * @param {string} text - 文本内容
   * @param {THREE.Vector3} position - 位置
   * @param {Object} options - 选项
   * @returns {THREE.Sprite} 文本精灵
   */
  createTextSprite(text, position, options = {}) {
    const {
      fontFace = 'Arial',
      fontSize = 16,
      fontWeight = 'normal',
      textColor = { r: 255, g: 255, b: 255 },
      backgroundColor = { r: 0, g: 0, b: 0, a: 0 }
    } = options;

    // 创建画布
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // 设置画布大小 - 增加尺寸以提高清晰度
    canvas.width = 512;
    canvas.height = 256;

    // 绘制背景
    if (backgroundColor.a > 0) {
      context.fillStyle = `rgba(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b}, ${backgroundColor.a})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 设置文本样式
    context.font = `${fontWeight} ${fontSize}px ${fontFace}`;
    context.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, 1.0)`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // 添加文本阴影以提高可读性
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 6;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    // 绘制文本
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;

    // 创建精灵材质
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });

    // 创建精灵
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(5, 2.5, 1);

    // 添加到场景
    this.scene.add(sprite);
    this.objects.push(sprite);

    return sprite;
  }

  /**
   * 添加鼠标事件监听器
   * @param {HTMLElement} domElement - DOM元素
   */
  addEventListeners(domElement) {
    // 鼠标移动事件
    domElement.addEventListener('mousemove', (event) => {
      this.onMouseMove(event);
    });

    // 鼠标点击事件
    domElement.addEventListener('click', (event) => {
      this.onMouseClick(event);
    });
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

    // 更新射线投射器
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 检测与扇区的交叉
    const intersects = this.raycaster.intersectObjects(this.slices);

    // 重置所有扇区的悬停状态
    this.slices.forEach(slice => {
      if (!slice.userData.isExploded) {
        slice.material.emissive.setHex(0x000000);
      }
    });

    // 更新悬停的扇区
    if (intersects.length > 0) {
      const intersectedSlice = intersects[0].object;
      const sliceIndex = intersectedSlice.userData.index;

      // 如果不是当前选中的扇区，设置悬停效果
      if (sliceIndex !== this.selectedSliceIndex) {
        intersectedSlice.material.emissive.setHex(0x333333);
      }

      this.hoveredSliceIndex = sliceIndex;
    } else {
      this.hoveredSliceIndex = -1;
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

    // 更新射线投射器
    this.raycaster.setFromCamera(this.mouse, this.scene.userData.camera);

    // 检测与扇区的交叉
    const intersects = this.raycaster.intersectObjects(this.slices);

    if (intersects.length > 0) {
      const intersectedSlice = intersects[0].object;
      const sliceIndex = intersectedSlice.userData.index;

      // 如果点击的是当前选中的扇区，取消选中
      if (sliceIndex === this.selectedSliceIndex) {
        this.resetSlices();
        this.selectedSliceIndex = -1;
      } else {
        // 重置所有扇区
        this.resetSlices();

        // 设置新的选中扇区
        this.selectedSliceIndex = sliceIndex;
        this.explodeSlice(intersectedSlice);
      }
    } else {
      // 点击空白区域，重置所有扇区
      this.resetSlices();
      this.selectedSliceIndex = -1;
    }
  }

  /**
   * 爆炸扇区（将扇区向外移动）
   * @param {THREE.Mesh} slice - 扇区网格
   */
  explodeSlice(slice) {
    const { midAngle } = slice.userData;

    // 计算偏移方向
    const offsetX = Math.sin(midAngle) * this.explodeOffset;
    const offsetZ = Math.cos(midAngle) * this.explodeOffset;

    // 设置新位置
    slice.position.x += offsetX;
    slice.position.z += offsetZ;

    // 设置高亮效果
    slice.material.emissive.setHex(0x555555);

    // 更新状态
    slice.userData.isExploded = true;
  }

  /**
   * 重置所有扇区
   */
  resetSlices() {
    this.slices.forEach(slice => {
      // 重置位置
      if (slice.userData.isExploded) {
        const { midAngle } = slice.userData;

        // 计算偏移方向
        const offsetX = Math.sin(midAngle) * this.explodeOffset;
        const offsetZ = Math.cos(midAngle) * this.explodeOffset;

        // 恢复原始位置
        slice.position.x -= offsetX;
        slice.position.z -= offsetZ;

        // 重置高亮效果
        slice.material.emissive.setHex(0x000000);

        // 更新状态
        slice.userData.isExploded = false;
      }
    });
  }

  /**
   * 更新可视化
   */
  update() {
    // 更新扇区动画
    if (this.animationStartTime && this.slicesToAnimate.length > 0) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.animationStartTime;

      if (elapsedTime < this.animationDuration) {
        // 计算动画进度（0-1之间）
        const progress = elapsedTime / this.animationDuration;

        // 使用缓动函数使动画更平滑
        const easedProgress = this.easeOutCubic(progress);

        // 更新每个扇区的缩放
        this.slicesToAnimate.forEach((sliceInfo, index) => {
          const { slice, targetScale } = sliceInfo;

          // 计算当前扇区的延迟进度
          const delayedProgress = Math.max(0, (easedProgress - (index * 0.05)) / (1 - index * 0.05));

          // 设置Y轴缩放（高度动画）
          slice.scale.y = delayedProgress * targetScale;
        });
      } else {
        // 动画结束，重置
        this.animationStartTime = null;
      }
    }
  }

  /**
   * 缓动函数：缓出立方
   * @param {number} t - 进度（0-1）
   * @returns {number} 缓动后的进度
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 将RGB颜色转换为十六进制颜色
   * @param {number} color - THREE.js颜色值
   * @returns {Object} RGB颜色对象
   */
  rgbToHex(color) {
    const threeColor = new THREE.Color(color);
    return {
      r: Math.round(threeColor.r * 255),
      g: Math.round(threeColor.g * 255),
      b: Math.round(threeColor.b * 255)
    };
  }
}
