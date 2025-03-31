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
    
    // 布局属性 - 优化参数以改善数据与视觉匹配
    this.graphSize = 15;
    this.repulsionForce = 8;     // 增加斥力，使节点分布更加均匀
    this.attractionForce = 0.015; // 微调引力，保持连接节点的适当距离
    this.edgeLengthFactor = 2.0;  // 边长度因子，影响连接节点间的距离
    this.centerForce = 0.001;     // 向中心的引力，防止节点飘得太远
    
    // 动画属性
    this.animationDuration = 1000; // 毫秒
    this.animationStartTime = null;
    this.nodesToAnimate = [];
    
    // 节点和边的引用
    this.nodes = [];
    this.edges = [];
    
    // 物理模拟相关
    this.simulationActive = false;
    this.simulationSteps = 150;    // 增加模拟步数，使布局更稳定
    this.currentStep = 0;
    this.dampingFactor = 0.85;     // 阻尼系数，控制节点运动
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
    
    // 根据节点组设置标签颜色，增强视觉关联
    let labelColor = '#ffffff';
    if (node.group !== undefined) {
      const nodeColor = this.nodeColors[node.group % this.nodeColors.length];
      // 将十六进制颜色转换为RGB字符串
      const r = (nodeColor >> 16) & 255;
      const g = (nodeColor >> 8) & 255;
      const b = nodeColor & 255;
      labelColor = `rgb(${r}, ${g}, ${b})`;
    }
    
    context.fillStyle = labelColor;
    // 添加文本阴影以增强可读性
    context.shadowColor = 'rgba(0, 0, 0, 0.7)';
    context.shadowBlur = 5;
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
    
    // 存储关联的节点信息，用于动态更新位置
    textMesh.userData = {
      isLabel: true,
      nodeId: node.id,
      type: 'nodeLabel',
      offset: new THREE.Vector3(0.8, 0.8, 0.2) // 可调整的偏移量
    };
    
    // 设置标签位置（在节点旁边，考虑节点大小）
    const nodeSize = node.size || this.nodeSize;
    textMesh.position.set(
      position.x + nodeSize + textMesh.userData.offset.x,
      position.y + textMesh.userData.offset.y,
      position.z + textMesh.userData.offset.z
    );
    
    this.scene.add(textMesh);
    this.objects.push(textMesh);
    
    // 添加连接线，增强标签与节点的视觉关联
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(labelColor),
      transparent: true,
      opacity: 0.6
    });
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(position.x, position.y, position.z),
      new THREE.Vector3(
        position.x + nodeSize + textMesh.userData.offset.x * 0.5,
        position.y + textMesh.userData.offset.y * 0.5,
        position.z + textMesh.userData.offset.z * 0.5
      )
    ]);
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData = {
      isLabelConnector: true,
      nodeId: node.id,
      labelMesh: textMesh
    };
    
    this.scene.add(line);
    this.objects.push(line);
    
    return { textMesh, line }; // 返回创建的对象，便于后续更新
  }
  
  createEdgeLabel(weight, sourceNode, targetNode) {
    // 创建边权重标签
    const textCanvas = document.createElement('canvas');
    const context = textCanvas.getContext('2d');
    textCanvas.width = 128;
    textCanvas.height = 64;
    context.font = 'bold 24px Arial';
    
    // 根据边的权重设置颜色，增强数据与视觉的关联
    // 权重越大，颜色越暖（从蓝到红）
    const normalizedWeight = Math.min(Math.max(weight / 5, 0), 1); // 假设权重范围0-5
    const r = Math.floor(normalizedWeight * 255);
    const g = Math.floor(100 - normalizedWeight * 50);
    const b = Math.floor(255 - normalizedWeight * 255);
    const edgeLabelColor = `rgb(${r}, ${g}, ${b})`;
    
    context.fillStyle = edgeLabelColor;
    // 添加文本阴影以增强可读性
    context.shadowColor = 'rgba(0, 0, 0, 0.7)';
    context.shadowBlur = 5;
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
    
    // 计算边的中点，但略微偏移以避免与边重叠
    const midX = (sourceNode.x + targetNode.x) / 2;
    const midY = (sourceNode.y + targetNode.y) / 2;
    const midZ = (sourceNode.z + targetNode.z) / 2;
    
    // 计算从边中点到标签的偏移向量
    // 使用垂直于边的方向，确保标签不会与边重叠
    const edgeVector = new THREE.Vector3(
      targetNode.x - sourceNode.x,
      targetNode.y - sourceNode.y,
      targetNode.z - sourceNode.z
    );
    
    // 创建一个垂直于边的向量（使用叉积）
    const upVector = new THREE.Vector3(0, 1, 0);
    const offsetVector = new THREE.Vector3().crossVectors(edgeVector, upVector).normalize();
    
    // 如果偏移向量太小（边接近垂直），使用另一个方向
    if (offsetVector.length() < 0.1) {
      offsetVector.set(1, 0, 0).crossVectors(edgeVector, offsetVector).normalize();
    }
    
    // 应用偏移，偏移量与权重成正比
    const offsetMultiplier = 0.5 + normalizedWeight * 0.5; // 0.5-1.0
    
    // 存储关联的边信息，用于动态更新位置
    textMesh.userData = {
      isLabel: true,
      type: 'edgeLabel',
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      weight: weight,
      offsetVector: offsetVector,
      offsetMultiplier: offsetMultiplier
    };
    
    // 设置标签位置
    textMesh.position.set(
      midX + offsetVector.x * offsetMultiplier,
      midY + offsetVector.y * offsetMultiplier + 0.2, // 略微向上偏移
      midZ + offsetVector.z * offsetMultiplier
    );
    
    this.scene.add(textMesh);
    this.objects.push(textMesh);
    
    // 添加从边中点到标签的连接线，增强视觉关联
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(edgeLabelColor),
      transparent: true,
      opacity: 0.6
    });
    
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(midX, midY, midZ),
      new THREE.Vector3(
        midX + offsetVector.x * offsetMultiplier * 0.8,
        midY + offsetVector.y * offsetMultiplier * 0.8 + 0.1,
        midZ + offsetVector.z * offsetMultiplier * 0.8
      )
    ]);
    
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.userData = {
      isEdgeLabelConnector: true,
      sourceId: sourceNode.id,
      targetId: targetNode.id,
      labelMesh: textMesh
    };
    
    this.scene.add(line);
    this.objects.push(line);
    
    return { textMesh, line }; // 返回创建的对象，便于后续更新
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
    
    // 更新标签和连接线位置
    this.updateLabelsAndConnectors();
    
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
        // 使用改进的斥力计算，在近距离时斥力更强
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
      
      // 获取边的权重（如果有）
      const weight = link.value !== undefined ? link.value : (link.weight !== undefined ? link.weight : 1);
      
      // 计算理想边长度（根据权重调整）
      // 权重越大，理想距离越短，表示关系越紧密
      const idealDistance = this.edgeLengthFactor * (1 / (0.1 + weight * 0.2));
      
      // 应用引力（基于当前距离与理想距离的差异）
      const forceFactor = (distance - idealDistance) * this.attractionForce;
      
      const fx = dx / distance * forceFactor;
      const fy = dy / distance * forceFactor;
      const fz = dz / distance * forceFactor;
      
      sourceNode.vx += fx;
      sourceNode.vy += fy;
      sourceNode.vz += fz;
      
      targetNode.vx -= fx;
      targetNode.vy -= fy;
      targetNode.vz -= fz;
    });
    
    // 应用中心引力，防止节点飘得太远
    this.data.nodes.forEach(node => {
      // 计算到中心的距离
      const dx = 0 - node.x;
      const dy = 0 - node.y;
      const dz = 0 - node.z;
      
      const distanceToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      
      // 应用中心引力（距离越远，引力越大）
      const centerForce = this.centerForce * distanceToCenter;
      
      node.vx += dx / distanceToCenter * centerForce;
      node.vy += dy / distanceToCenter * centerForce;
      node.vz += dz / distanceToCenter * centerForce;
    });
    
    // 更新节点位置
    this.data.nodes.forEach(node => {
      // 应用阻尼系数
      node.vx *= this.dampingFactor;
      node.vy *= this.dampingFactor;
      node.vz *= this.dampingFactor;
      
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
  
  /**
   * 更新标签和连接线位置
   * 确保标签和连接线与节点和边的位置保持同步
   */
  updateLabelsAndConnectors() {
    // 更新节点标签和连接线
    this.objects.forEach(object => {
      // 处理节点标签
      if (object.userData && object.userData.type === 'nodeLabel') {
        const nodeId = object.userData.nodeId;
        const node = this.data.nodes.find(n => n.id === nodeId);
        
        if (node) {
          // 找到对应的节点网格
          const nodeMesh = this.nodes.find(n => n.data.id === nodeId)?.mesh;
          
          if (nodeMesh) {
            const nodeSize = node.size || this.nodeSize;
            const offset = object.userData.offset;
            
            // 更新标签位置
            object.position.set(
              nodeMesh.position.x + nodeSize + offset.x,
              nodeMesh.position.y + offset.y,
              nodeMesh.position.z + offset.z
            );
          }
        }
      }
      
      // 处理节点标签连接线
      if (object.userData && object.userData.isLabelConnector) {
        const nodeId = object.userData.nodeId;
        const node = this.data.nodes.find(n => n.id === nodeId);
        
        if (node) {
          // 找到对应的节点网格和标签
          const nodeMesh = this.nodes.find(n => n.data.id === nodeId)?.mesh;
          const labelMesh = object.userData.labelMesh;
          
          if (nodeMesh && labelMesh) {
            // 更新连接线几何体
            const positions = new Float32Array([
              nodeMesh.position.x, nodeMesh.position.y, nodeMesh.position.z,
              labelMesh.position.x - 0.4, labelMesh.position.y - 0.4, labelMesh.position.z - 0.1
            ]);
            
            // 更新几何体
            object.geometry.dispose();
            object.geometry = new THREE.BufferGeometry();
            object.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          }
        }
      }
      
      // 处理边标签
      if (object.userData && object.userData.type === 'edgeLabel') {
        const sourceId = object.userData.sourceId;
        const targetId = object.userData.targetId;
        
        // 找到源节点和目标节点
        const sourceNode = this.data.nodes.find(n => n.id === sourceId);
        const targetNode = this.data.nodes.find(n => n.id === targetId);
        
        if (sourceNode && targetNode) {
          // 计算边的中点
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          const midZ = (sourceNode.z + targetNode.z) / 2;
          
          // 计算从边中点到标签的偏移向量
          const edgeVector = new THREE.Vector3(
            targetNode.x - sourceNode.x,
            targetNode.y - sourceNode.y,
            targetNode.z - sourceNode.z
          );
          
          // 使用存储的偏移向量和乘数
          const offsetVector = object.userData.offsetVector;
          const offsetMultiplier = object.userData.offsetMultiplier;
          
          // 更新标签位置
          object.position.set(
            midX + offsetVector.x * offsetMultiplier,
            midY + offsetVector.y * offsetMultiplier + 0.2,
            midZ + offsetVector.z * offsetMultiplier
          );
        }
      }
      
      // 处理边标签连接线
      if (object.userData && object.userData.isEdgeLabelConnector) {
        const sourceId = object.userData.sourceId;
        const targetId = object.userData.targetId;
        
        // 找到源节点和目标节点
        const sourceNode = this.data.nodes.find(n => n.id === sourceId);
        const targetNode = this.data.nodes.find(n => n.id === targetId);
        
        if (sourceNode && targetNode) {
          // 计算边的中点
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          const midZ = (sourceNode.z + targetNode.z) / 2;
          
          // 找到对应的标签
          const labelMesh = object.userData.labelMesh;
          
          if (labelMesh) {
            // 更新连接线几何体
            const positions = new Float32Array([
              midX, midY, midZ,
              labelMesh.position.x - 0.2, labelMesh.position.y - 0.1, labelMesh.position.z - 0.1
            ]);
            
            // 更新几何体
            object.geometry.dispose();
            object.geometry = new THREE.BufferGeometry();
            object.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
          }
        }
      }
    });
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