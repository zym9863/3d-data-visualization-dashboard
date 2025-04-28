/**
 * 3D数据可视化仪表盘应用程序
 * 负责初始化Three.js场景、相机和渲染器，并管理可视化组件
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { BarChart3D } from './visualizations/BarChart3D.js';
import { NetworkGraph3D } from './visualizations/NetworkGraph3D.js';
import { ScatterPlot3D } from './visualizations/ScatterPlot3D.js';
import { SurfacePlot3D } from './visualizations/SurfacePlot3D.js';
import { LineChart3D } from './visualizations/LineChart3D.js';
import { AreaChart3D } from './visualizations/AreaChart3D.js';
import { PieChart3D } from './visualizations/PieChart3D.js';
import { DataParser } from './utils/DataParser.js';

export class App {
  constructor(container) {
    // 容器元素
    this.container = container;

    // Three.js 核心组件
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // 当前可视化组件
    this.currentVisualization = null;

    // 当前数据
    this.currentData = null;

    // 可视化类型
    this.visualizationTypes = {
      'bar-chart': BarChart3D,
      'network-graph': NetworkGraph3D,
      'scatter-plot': ScatterPlot3D,
      'surface-plot': SurfacePlot3D,
      'line-chart': LineChart3D,
      'area-chart': AreaChart3D,
      'pie-chart': PieChart3D
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化Three.js场景、相机和渲染器
   */
  init() {
    // 创建场景
    this.scene = new THREE.Scene();
    // 使用深色透明背景，让CSS星空背景可见
    this.scene.background = null;

    // 创建相机
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspectRatio = width / height;

    this.camera = new THREE.PerspectiveCamera(60, aspectRatio, 0.1, 1000);
    this.camera.position.set(15, 15, 15);
    this.camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // 启用抗锯齿
      alpha: true, // 启用透明背景
      precision: 'highp' // 使用高精度渲染
    });
    this.renderer.setSize(width, height);
    // 设置更高的像素比以提高渲染质量，但不超过设备像素比的2倍，避免性能问题
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio * 1.5, 2));
    this.container.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // 添加阻尼效果
    this.controls.dampingFactor = 0.05;

    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    // 添加霓虹光效
    this.addNeonLights();

    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(5);
    this.scene.add(axesHelper);

    // 监听窗口大小变化
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 开始动画循环
    this.animate();
  }

  /**
   * 加载数据
   * @param {string|File} source - 数据源（字符串或文件对象）
   * @param {string} type - 数据类型（'csv'、'json'或'auto'）
   * @returns {Promise<Array|Object>} 解析后的数据
   */
  async loadData(source, type = 'auto') {
    try {
      // 解析数据
      const data = await DataParser.parseData(source, type);
      this.currentData = data;
      return data;
    } catch (error) {
      console.error('加载数据失败:', error);
      throw error;
    }
  }

  /**
   * 创建可视化
   * @param {string} type - 可视化类型（'bar-chart'或'network-graph'）
   * @param {Array|Object} data - 可视化数据（可选，默认使用当前数据）
   */
  createVisualization(type, data = null) {
    // 如果没有提供数据，使用当前数据
    const visualizationData = data || this.currentData;

    if (!visualizationData) {
      console.error('没有可用的数据，请先加载数据');
      return;
    }

    // 清除当前可视化
    if (this.currentVisualization) {
      this.currentVisualization.clear();
      this.currentVisualization = null;
    }

    // 获取可视化类
    const VisualizationClass = this.visualizationTypes[type];

    if (!VisualizationClass) {
      console.error(`不支持的可视化类型: ${type}`);
      return;
    }

    // 根据可视化类型预处理数据
    let processedData = visualizationData;

    if (type === 'network-graph') {
      processedData = DataParser.convertToNetworkData(visualizationData);
    } else if (type === 'bar-chart') {
      processedData = DataParser.convertToBarChartData(visualizationData);
    } else if (type === 'surface-plot') {
      processedData = DataParser.convertToSurfaceData(visualizationData);
    } else if (type === 'line-chart' || type === 'area-chart') {
      // 折线图和面积图数据通常不需要特殊转换，但如果需要可以在这里添加
      processedData = visualizationData;
    } else if (type === 'pie-chart') {
      // 饼图数据通常不需要特殊转换
      processedData = visualizationData;
    }

    // 创建新的可视化
    this.currentVisualization = new VisualizationClass(this.scene, processedData);

    // 传递相机和渲染器参数给所有可视化组件
    this.currentVisualization.create(this.camera, this.renderer);
  }

  /**
   * 窗口大小变化处理函数
   */
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  /**
   * 添加霓虹光效
   */
  addNeonLights() {
    // 创建霓虹点光源组
    this.neonLights = [];

    // 添加不同颜色的点光源
    const colors = [0xff00ff, 0x00ffff, 0x00ff00, 0xff0088];
    const positions = [
      new THREE.Vector3(-10, 10, 10),
      new THREE.Vector3(10, -10, 10),
      new THREE.Vector3(-10, -10, -10),
      new THREE.Vector3(10, 10, -10)
    ];

    for (let i = 0; i < colors.length; i++) {
      const light = new THREE.PointLight(colors[i], 1, 50);
      light.position.copy(positions[i]);
      this.scene.add(light);

      // 添加光源辅助（开发时可见，发布时可注释）
      // const helper = new THREE.PointLightHelper(light, 1);
      // this.scene.add(helper);

      // 存储光源以便在动画中使用
      this.neonLights.push({
        light: light,
        initialPosition: positions[i].clone(),
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * 更新霓虹光效
   */
  updateNeonLights() {
    if (!this.neonLights) return;

    const time = Date.now() * 0.001; // 当前时间（秒）

    this.neonLights.forEach((neon, index) => {
      // 光源强度呼吸效果
      neon.light.intensity = 1 + Math.sin(time * 0.5 + neon.phase) * 0.5;

      // 光源位置轻微浮动
      const pos = neon.initialPosition;
      neon.light.position.x = pos.x + Math.sin(time * 0.3 + index) * 2;
      neon.light.position.y = pos.y + Math.cos(time * 0.4 + index) * 2;
      neon.light.position.z = pos.z + Math.sin(time * 0.5 + index) * 2;
    });
  }

  /**
   * 动画循环
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // 更新控制器
    this.controls.update();

    // 更新霓虹光效
    this.updateNeonLights();

    // 更新当前可视化
    if (this.currentVisualization) {
      this.currentVisualization.update(this.camera);
    }

    // 渲染场景
    this.renderer.render(this.scene, this.camera);
  }
}