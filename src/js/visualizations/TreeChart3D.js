import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class TreeChart3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);

    // 树状图特定属性
    this.nodeSize = 0.4;
    this.nodeColors = [
      0x3498db, // 蓝色 - 根节点
      0x2ecc71, // 绿色 - 第一层
      0xe74c3c, // 红色 - 第二层
      0xf39c12, // 橙色 - 第三层
      0x9b59b6, // 紫色 - 第四层
      0x1abc9c, // 青色 - 第五层
      0xe67e22, // 深橙色 - 第六层
      0x34495e  // 深蓝灰色 - 更深层
    ];
    this.edgeColor = 0x7f8c8d;
    this.edgeWidth = 0.08;

    // 布局属性
    this.levelHeight = 4;      // 每层之间的垂直距离
    this.nodeSpacing = 3;      // 同层节点之间的水平距离
    this.maxWidth = 20;        // 树的最大宽度

    // 动画属性
    this.animationDuration = 1500; // 毫秒
    this.animationStartTime = null;
    this.nodesToAnimate = [];
    this.edgesToAnimate = [];

    // 节点和边的引用
    this.nodes = [];
    this.edges = [];

    // 树结构相关
    this.rootNode = null;
    this.maxDepth = 0;
    this.nodePositions = new Map(); // 存储每个节点的计算位置
  }

  create(camera, renderer) {
    if (!this.data) {
      console.error('无效的数据格式，树状图需要层次结构数据');
      return;
    }

    // 清除之前的可视化
    this.clear();

    // 保存相机和渲染器引用
    this.scene.userData.camera = camera;
    this.scene.userData.renderer = renderer;

    // 创建地面网格
    this.createFloor();

    // 解析树结构
    this.parseTreeStructure();

    // 计算节点位置
    this.calculateNodePositions();

    // 创建节点和边
    this.createNodesAndEdges();

    // 开始动画
    this.animationStartTime = Date.now();
  }

  createFloor() {
    // 创建地面网格
    const gridHelper = new THREE.GridHelper(25, 25, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);
    this.objects.push(gridHelper);

    // 添加地面平面（半透明）
    const floorGeometry = new THREE.PlaneGeometry(25, 25);
    const floorMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);
    this.objects.push(floor);
  }

  parseTreeStructure() {
    // 支持多种数据格式
    if (this.data.nodes && this.data.links) {
      // 网络图格式，转换为树结构
      this.rootNode = this.convertNetworkToTree();
    } else if (this.data.children || Array.isArray(this.data)) {
      // 标准树结构格式
      this.rootNode = Array.isArray(this.data) ? this.data[0] : this.data;
    } else {
      console.error('不支持的树数据格式');
      return;
    }

    // 计算树的最大深度
    this.maxDepth = this.calculateMaxDepth(this.rootNode);

    // 为每个节点分配唯一ID（如果没有的话）
    this.assignNodeIds(this.rootNode);
  }

  convertNetworkToTree() {
    // 从网络图数据构建树结构
    const { nodes, links } = this.data;

    // 创建节点映射
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // 构建父子关系
    const childrenSet = new Set();
    links.forEach(link => {
      const parent = nodeMap.get(link.source);
      const child = nodeMap.get(link.target);

      if (parent && child) {
        parent.children.push(child);
        childrenSet.add(link.target);
      }
    });

    // 找到根节点（没有父节点的节点）
    const rootNodes = nodes.filter(node => !childrenSet.has(node.id));

    if (rootNodes.length === 0) {
      console.warn('未找到根节点，使用第一个节点作为根节点');
      return nodeMap.get(nodes[0].id);
    }

    return nodeMap.get(rootNodes[0].id);
  }

  calculateMaxDepth(node, depth = 0) {
    if (!node.children || node.children.length === 0) {
      return depth;
    }

    let maxChildDepth = depth;
    node.children.forEach(child => {
      const childDepth = this.calculateMaxDepth(child, depth + 1);
      maxChildDepth = Math.max(maxChildDepth, childDepth);
    });

    return maxChildDepth;
  }

  assignNodeIds(node, idCounter = { value: 0 }) {
    if (!node.id) {
      node.id = `node_${idCounter.value++}`;
    }

    if (node.children) {
      node.children.forEach(child => {
        this.assignNodeIds(child, idCounter);
      });
    }
  }

  calculateNodePositions() {
    // 使用改进的树布局算法
    this.nodePositions.clear();

    // 首先计算每层的节点数量
    const levelCounts = this.calculateLevelCounts(this.rootNode);

    // 计算根节点位置
    this.nodePositions.set(this.rootNode.id, {
      x: 0,
      y: this.maxDepth * this.levelHeight / 2,
      z: 0,
      level: 0
    });

    // 递归计算子节点位置
    this.calculateChildPositions(this.rootNode, 0, 0, this.maxWidth);
  }

  calculateLevelCounts(node, level = 0, counts = []) {
    if (!counts[level]) {
      counts[level] = 0;
    }
    counts[level]++;

    if (node.children) {
      node.children.forEach(child => {
        this.calculateLevelCounts(child, level + 1, counts);
      });
    }

    return counts;
  }

  calculateChildPositions(node, level, centerX, availableWidth) {
    if (!node.children || node.children.length === 0) {
      return;
    }

    const childLevel = level + 1;
    const childY = this.maxDepth * this.levelHeight / 2 - childLevel * this.levelHeight;
    const childCount = node.children.length;

    // 计算子节点的水平分布
    let startX, spacing;

    if (childCount === 1) {
      startX = centerX;
      spacing = 0;
    } else {
      const totalWidth = Math.min(availableWidth, (childCount - 1) * this.nodeSpacing);
      startX = centerX - totalWidth / 2;
      spacing = totalWidth / (childCount - 1);
    }

    // 为每个子节点分配位置
    node.children.forEach((child, index) => {
      const childX = childCount === 1 ? startX : startX + index * spacing;
      const childZ = 0; // 可以根据需要添加Z轴变化

      this.nodePositions.set(child.id, {
        x: childX,
        y: childY,
        z: childZ,
        level: childLevel
      });

      // 递归计算子节点的子节点位置
      const childAvailableWidth = availableWidth / Math.max(childCount, 1);
      this.calculateChildPositions(child, childLevel, childX, childAvailableWidth);
    });
  }

  createNodesAndEdges() {
    // 创建所有节点
    this.createNodeRecursive(this.rootNode);

    // 创建所有边
    this.createEdgesRecursive(this.rootNode);
  }

  createNodeRecursive(node) {
    const position = this.nodePositions.get(node.id);
    if (!position) return;

    // 根据层级确定节点颜色和大小
    const nodeColor = this.nodeColors[position.level % this.nodeColors.length];
    const nodeSize = this.nodeSize * (1 + (this.maxDepth - position.level) * 0.1); // 根节点更大

    // 创建节点几何体
    const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);
    const nodeMaterial = new THREE.MeshStandardMaterial({
      color: nodeColor,
      metalness: 0.3,
      roughness: 0.7,
      emissive: nodeColor,
      emissiveIntensity: 0.15
    });

    const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
    nodeMesh.position.set(position.x, position.y, position.z);

    // 存储节点引用
    this.nodes.push({
      data: node,
      mesh: nodeMesh,
      position: position
    });

    // 添加到场景
    this.scene.add(nodeMesh);
    this.objects.push(nodeMesh);

    // 添加到动画列表
    this.nodesToAnimate.push({
      mesh: nodeMesh,
      initialScale: 0,
      targetScale: 1,
      delay: position.level * 200 // 按层级延迟动画
    });

    // 创建节点标签
    this.createNodeLabel(node, position);

    // 递归创建子节点
    if (node.children) {
      node.children.forEach(child => {
        this.createNodeRecursive(child);
      });
    }
  }

  createEdgesRecursive(node) {
    if (!node.children || node.children.length === 0) return;

    const parentPosition = this.nodePositions.get(node.id);
    if (!parentPosition) return;

    node.children.forEach(child => {
      const childPosition = this.nodePositions.get(child.id);
      if (!childPosition) return;

      // 创建边几何体（线段）
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(parentPosition.x, parentPosition.y, parentPosition.z),
        new THREE.Vector3(childPosition.x, childPosition.y, childPosition.z)
      ]);

      // 创建边材质
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: this.edgeColor,
        linewidth: this.edgeWidth,
        transparent: true,
        opacity: 0.8
      });

      const edge = new THREE.Line(edgeGeometry, edgeMaterial);

      // 存储边引用
      this.edges.push({
        line: edge,
        parent: node,
        child: child,
        parentPosition: parentPosition,
        childPosition: childPosition
      });

      // 添加到场景
      this.scene.add(edge);
      this.objects.push(edge);

      // 添加到动画列表
      this.edgesToAnimate.push({
        line: edge,
        delay: Math.max(parentPosition.level, childPosition.level) * 200 + 100
      });

      // 递归创建子边
      this.createEdgesRecursive(child);
    });
  }

  createNodeLabel(node, position) {
    const labelText = node.name || node.id || 'Node';

    // 创建文本纹理
    const textCanvas = document.createElement('canvas');
    const context = textCanvas.getContext('2d');
    textCanvas.width = 512;
    textCanvas.height = 128;

    // 设置字体和样式
    context.font = 'bold 32px Arial';
    context.fillStyle = '#ffffff';
    context.shadowColor = 'rgba(0, 0, 0, 0.8)';
    context.shadowBlur = 8;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;

    // 绘制文本
    context.fillText(String(labelText), 10, 40);

    // 如果节点有值，显示在第二行
    if (node.value !== undefined) {
      context.font = 'normal 24px Arial';
      context.fillStyle = '#cccccc';
      context.fillText(`值: ${node.value}`, 10, 80);
    }

    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide
    });

    const textGeometry = new THREE.PlaneGeometry(2.5, 0.6);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);

    // 设置标签位置（在节点上方）
    textMesh.position.set(
      position.x,
      position.y + this.nodeSize + 0.8,
      position.z
    );

    // 存储标签信息
    textMesh.userData = {
      isLabel: true,
      nodeId: node.id,
      type: 'nodeLabel'
    };

    this.scene.add(textMesh);
    this.objects.push(textMesh);

    return textMesh;
  }

  update(camera) {
    // 更新节点动画
    if (this.animationStartTime && this.nodesToAnimate.length > 0) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.animationStartTime;

      this.nodesToAnimate.forEach(nodeInfo => {
        const { mesh, targetScale, delay } = nodeInfo;
        const nodeElapsedTime = elapsedTime - delay;

        if (nodeElapsedTime > 0 && nodeElapsedTime < this.animationDuration) {
          // 计算动画进度（0-1之间）
          const progress = nodeElapsedTime / this.animationDuration;

          // 使用缓动函数使动画更平滑
          const easedProgress = this.easeOutBounce(progress);

          // 更新节点缩放
          const scale = easedProgress * targetScale;
          mesh.scale.set(scale, scale, scale);
        } else if (nodeElapsedTime >= this.animationDuration) {
          // 动画结束，设置最终缩放
          mesh.scale.set(targetScale, targetScale, targetScale);
        }
      });
    }

    // 更新边动画
    if (this.animationStartTime && this.edgesToAnimate.length > 0) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.animationStartTime;

      this.edgesToAnimate.forEach(edgeInfo => {
        const { line, delay } = edgeInfo;
        const edgeElapsedTime = elapsedTime - delay;

        if (edgeElapsedTime > 0 && edgeElapsedTime < this.animationDuration) {
          // 计算动画进度（0-1之间）
          const progress = edgeElapsedTime / this.animationDuration;

          // 使用缓动函数
          const easedProgress = this.easeOutCubic(progress);

          // 更新边的透明度
          line.material.opacity = easedProgress * 0.8;
        } else if (edgeElapsedTime >= this.animationDuration) {
          // 动画结束，设置最终透明度
          line.material.opacity = 0.8;
        }
      });
    }

    // 使标签始终面向相机
    if (camera) {
      this.objects.forEach(object => {
        if (object.userData && object.userData.isLabel) {
          object.lookAt(camera.position);
        }
      });
    }

    // 检查动画是否完成
    if (this.animationStartTime) {
      const currentTime = Date.now();
      const totalElapsedTime = currentTime - this.animationStartTime;

      // 安全地计算最大延迟
      const nodeDelays = this.nodesToAnimate.map(n => n.delay);
      const edgeDelays = this.edgesToAnimate.map(e => e.delay);
      const allDelays = [...nodeDelays, ...edgeDelays];
      const maxDelay = allDelays.length > 0 ? Math.max(...allDelays) : 0;

      if (totalElapsedTime > maxDelay + this.animationDuration) {
        this.animationStartTime = null; // 动画完成
      }
    }
  }

  // 缓动函数：缓出立方
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // 缓动函数：缓出弹跳
  easeOutBounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  // 清除所有对象
  clear() {
    // 移除所有对象
    this.objects.forEach(object => {
      this.scene.remove(object);

      // 释放几何体和材质
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // 清空对象数组
    this.objects = [];
    this.nodes = [];
    this.edges = [];
    this.nodesToAnimate = [];
    this.edgesToAnimate = [];
    this.nodePositions.clear();
  }
}
