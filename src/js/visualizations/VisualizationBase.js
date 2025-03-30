/**
 * 可视化基类
 * 所有3D可视化组件的基础类
 */
export class VisualizationBase {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.objects = []; // 存储所有创建的3D对象，用于后续清理
  }
  
  /**
   * 创建可视化
   * 子类必须实现此方法
   */
  create() {
    throw new Error('子类必须实现create方法');
  }
  
  /**
   * 更新可视化
   * 子类可以覆盖此方法以实现动画或交互
   */
  update() {
    // 默认不执行任何操作
  }
  
  /**
   * 清除可视化
   * 移除所有3D对象并释放资源
   */
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
  }
  
  /**
   * 设置新数据
   * @param {Array} data - 新的数据数组
   */
  setData(data) {
    this.data = data;
  }
}