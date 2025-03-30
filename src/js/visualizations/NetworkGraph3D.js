import * as THREE from 'three';
import { VisualizationBase } from './VisualizationBase.js';

export class NetworkGraph3D extends VisualizationBase {
  constructor(scene, data) {
    super(scene, data);
    
    // 网络图特定属性
    this.nodeSize = 0.5;
    this.nodeColors = [
      0x3498db, // 蓝色
      0x2ecc71, // 绿色
      0xe74c3c, // 红色
      0xf39c12, // 橙色
      0x9b59b6  // 紫色
    ];
    this.edgeColor = 0xaaaaaa;
    this.edgeWidth = 0.1;
    
    // 布局属性
    this.graphSize = 15;
    this.repulsionForce = 5;
    this.attractionForce = 0.01;
    
    // 动画属性
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = null;
    this.nodesToAnimate = [];
    
    // 节点和边的引用
    this.nodes = [];
    this.edges = [];
    
    // 物理模拟相关
    this.simulationActive = false;
    this.simulationSteps = 100;
    this.currentStep = 0;
  }
  
  create() {
    if (!this.data || !this.data.nodes || !this.data.links) {
      console.error('无效的数据格式，网络图需要包含nodes和links属性');
      return;
    }
    
    // 清除之前的可视化
    this.clear();
    
    // 创建地面网格
    this.createFloor();
    
    // 初始化节点位置
    this.initializeNodePositions();
    
    // 创建节点和边
    this.createNodesAndEdges();
    
    // 开始动画
    this.animationStartTime = Date.now();
    this.simulationActive = true;
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
  
  initializeNodePositions() {
    // 为每个节点分配一个随机的3D位置
    this.data.nodes.forEach(node => {
      // 如果节点已经有位置，则使用它，否则随机生成
      if (!node.x) node.x = (Math.random() - 0.5) * this.graphSize;
      if (!node.y) node.y = (Math.random() - 0.5) * this.graphSize;
      if (!node.z) node.z = (Math.random() - 0.5) * this.graphSize;
      
      // 初始化速度向量（用于力导向布局）
      node.vx = 0;
      node.vy = 0;
      node.vz = 0;
    });
  }
  
  createNodesAndEdges() {
    // 创建节点
    this.data.nodes.forEach((node, index) => {
      // 确定节点颜色（可以基于节点类型或其他属性）
      const nodeColor = node.group !== undefined
        ? this.nodeColors[node.group % this.nodeColors.length]
        : this.nodeColors[index % this.nodeColors.length];
      
      // 创建节点几何体（球体）
      const nodeSize = node.size || this.nodeSize;
      const nodeGeometry = new THREE.SphereGeometry(nodeSize, 16, 16);
      const nodeMaterial = new THREE.MeshStandardMaterial({
        color: nodeColor,
        metalness: 0.3,
        roughness: 0.7,
        emissive: nodeColor,
        emissiveIntensity: 0.2
      });
      
      const nodeMesh = new THREE.Mesh(nodeGeometry, nodeMaterial);
      nodeMesh.position.set(node.x, node.y, node.z);
      
      // 存储节点引用
      this.nodes.push({
        data: node,
        mesh: nodeMesh
      });
      
      // 添加到场景
      this.scene.add(nodeMesh);
      this.objects.push(nodeMesh);
      
      // 添加到动画列表
      this.nodesToAnimate.push({
        mesh: nodeMesh,
        initialScale: 0,
        targetScale: 1
      });
      
      // 添加节点标签
      if (node.id || node.name) {
        this.createNodeLabel(node, nodeMesh.position);
      }
    });
    
    // 创建边
    this.data.links.forEach(link => {
      // 查找源节点和目标节点
      const sourceNode = this.data.nodes.find(node => node.id === link.source || node === link.source);
      const targetNode = this.data.nodes.find(node => node.id === link.target || node === link.target);
      
      if (!sourceNode || !targetNode) {
        console.warn('找不到链接的源节点或目标节点:', link);
        return;
      }
      
      // 创建边几何体（线段）
      const edgeGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(sourceNode.x, sourceNode.y, sourceNode.z),
        new THREE.Vector3(targetNode.x, targetNode.y, targetNode.z)
      ]);
      
      // 确定边的颜色和宽度
      const edgeColor = link.color || this.edgeColor;
      const edgeWidth = link.width || this.edgeWidth;
      
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: edgeColor,
        linewidth: edgeWidth
      });
      
      const edge = new THREE.Line(edgeGeometry, edgeMaterial);
      
      // 存储边引用及其连接的节点
      this.edges.push({
        data: link,
        line: edge,
        source: sourceNode,
        target: targetNode
      });
      
      // 添加到场景
      this.scene.add(edge);
      this.objects.push(edge);
      
      // 如果有权重，添加权重标签
      if (link.value !== undefined || link.weight !== undefined) {
        const weight = link.value !== undefined ? link.value : link.weight;
        this.createEdgeLabel(weight, sourceNode, targetNode);
      }
    });
  }
  
  createNodeLabel(node, position) {
    // 创建节点标签
    const labelText = node.name || node.id;
    
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
    context.fillText(String(labelText), 0, 24);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // 增大文本几何体尺寸以适应更大的字体
    const textGeometry = new THREE.PlaneGeometry(3, 0.8);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    
    // 设置标签位置（在节点旁边）
    textMesh.position.set(position.x + 0.7, position.y + 0.7, position.z);
    
    // 使标签始终面向相机
    textMesh.userData.isLabel = true;
    
    this.scene.add(textMesh);
    this.objects.push(textMesh);
  }
  
  createEdgeLabel(weight, sourceNode, targetNode) {
    // 创建边权重标签
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
    context.fillText(weight.toFixed(1), 0, 20);
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // 增大文本几何体尺寸以适应更大的字体
    const textGeometry = new THREE.PlaneGeometry(1.2, 0.6);
    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    
    // 设置标签位置（在边的中间）
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    const midZ = (sourceNode.z + targetNode.z) / 2;
    
    textMesh.position.set(midX, midY + 0.4, midZ);
    
    // 使标签始终面向相机
    textMesh.userData.isLabel = true;
    
    this.scene.add(textMesh);
    this.objects.push(textMesh);
  }
  
  update(camera) {
    // 更新节点动画
    if (this.animationStartTime && this.nodesToAnimate.length > 0) {
      const currentTime = Date.now();
      const elapsedTime = currentTime - this.animationStartTime;
      
      if (elapsedTime < this.animationDuration) {
        // 计算动画进度（0-1之间）
        const progress = elapsedTime / this.animationDuration;
        
        // 使用缓动函数使动画更平滑
        const easedProgress = this.easeOutCubic(progress);
        
        // 更新每个节点的缩放
        this.nodesToAnimate.forEach(nodeInfo => {
          const { mesh, targetScale } = nodeInfo;
          mesh.scale.set(
            easedProgress * targetScale,
            easedProgress * targetScale,
            easedProgress * targetScale
          );
        });
      } else {
        // 动画结束，重置
        this.animationStartTime = null;
      }
    }
    
    // 更新力导向布局
    if (this.simulationActive && this.currentStep < this.simulationSteps) {
      this.updateForceLayout();
      this.currentStep++;
    }
    
    // 使标签始终面向相机
    if (camera) {
      this.objects.forEach(object => {
        if (object.userData && object.userData.isLabel) {
          object.lookAt(camera.position);
        }
      });
    }
  }
  
  updateForceLayout() {
    // 计算节点之间的斥力
    for (let i = 0; i < this.data.nodes.length; i++) {
      const nodeA = this.data.nodes[i];
      
      for (let j = i + 1; j < this.data.nodes.length; j++) {
        const nodeB = this.data.nodes[j];
        
        // 计算两节点间距离
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dz = nodeB.z - nodeA.z;
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        
        // 应用斥力（反比于距离的平方）
        const force = this.repulsionForce / (distance * distance);
        
        const fx = dx / distance * force;
        const fy = dy / distance * force;
        const fz = dz / distance * force;
        
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeA.vz -= fz;
        
        nodeB.vx += fx;
        nodeB.vy += fy;
        nodeB.vz += fz;
      }
    }
    
    // 计算边的引力
    this.data.links.forEach(link => {
      const sourceNode = this.data.nodes.find(node => node.id === link.source || node === link.source);
      const targetNode = this.data.nodes.find(node => node.id === link.target || node === link.target);
      
      if (!sourceNode || !targetNode) return;
      
      // 计算两节点间距离
      const dx = targetNode.x - sourceNode.x;
      const dy = targetNode.y - sourceNode.y;
      const dz = targetNode.z - sourceNode.z;
      
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      
      // 应用引力（正比于距离）
      const force = this.attractionForce * distance;
      
      const fx = dx / distance * force;
      const fy = dy / distance * force;
      const fz = dz / distance * force;
      
      sourceNode.vx += fx;
      sourceNode.vy += fy;
      sourceNode.vz += fz;
      
      targetNode.vx -= fx;
      targetNode.vy -= fy;
      targetNode.vz -= fz;
    });
    
    // 更新节点位置
    this.data.nodes.forEach(node => {
      // 应用阻尼系数
      node.vx *= 0.9;
      node.vy *= 0.9;
      node.vz *= 0.9;
      
      // 更新位置
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
      
      // 限制在边界内
      const limit = this.graphSize / 2;
      node.x = Math.max(-limit, Math.min(limit, node.x));
      node.y = Math.max(-limit, Math.min(limit, node.y));
      node.z = Math.max(-limit, Math.min(limit, node.z));
    });
    
    // 更新可视化元素位置
    this.nodes.forEach(nodeObj => {
      const { data, mesh } = nodeObj;
      mesh.position.set(data.x, data.y, data.z);
    });
    
    // 更新边的几何形状
    this.edges.forEach(edgeObj => {
      const { line, source, target } = edgeObj;
      
      // 更新线段的顶点位置
      const positions = line.geometry.attributes.position.array;
      
      positions[0] = source.x;
      positions[1] = source.y;
      positions[2] = source.z;
      
      positions[3] = target.x;
      positions[4] = target.y;
      positions[5] = target.z;
      
      line.geometry.attributes.position.needsUpdate = true;
    });
  }
  
  // 缓动函数：缓出立方
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
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
  }
}