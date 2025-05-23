/**
 * 数据解析工具
 * 用于解析CSV和JSON格式的数据
 */
import Papa from 'papaparse';

export class DataParser {
  /**
   * 解析CSV数据
   * @param {string|File} source - CSV数据源（字符串或文件对象）
   * @param {Object} options - 解析选项
   * @returns {Promise<Array>} 解析后的数据数组
   */
  static parseCSV(source, options = {}) {
    return new Promise((resolve, reject) => {
      // 默认配置
      const defaultOptions = {
        header: true, // 使用第一行作为字段名
        dynamicTyping: true, // 自动转换类型（数字、布尔值等）
        skipEmptyLines: true, // 跳过空行
        ...options
      };

      // 完成回调
      const complete = (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV解析警告:', results.errors);
        }
        resolve(results.data);
      };

      // 错误回调
      const error = (err) => {
        reject(err);
      };

      // 根据source类型选择解析方法
      if (typeof source === 'string') {
        // 解析CSV字符串
        Papa.parse(source, {
          ...defaultOptions,
          complete,
          error
        });
      } else if (source instanceof File) {
        // 解析CSV文件
        Papa.parse(source, {
          ...defaultOptions,
          complete,
          error
        });
      } else {
        reject(new Error('不支持的数据源类型，请提供CSV字符串或文件对象'));
      }
    });
  }

  /**
   * 解析JSON数据
   * @param {string|File} source - JSON数据源（字符串或文件对象）
   * @returns {Promise<Array|Object>} 解析后的数据
   */
  static parseJSON(source) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof source === 'string') {
          // 解析JSON字符串
          const data = JSON.parse(source);
          resolve(data);
        } else if (source instanceof File) {
          // 解析JSON文件
          const reader = new FileReader();

          reader.onload = (event) => {
            try {
              const data = JSON.parse(event.target.result);
              resolve(data);
            } catch (err) {
              reject(new Error(`JSON解析错误: ${err.message}`));
            }
          };

          reader.onerror = () => {
            reject(new Error('读取文件失败'));
          };

          reader.readAsText(source);
        } else {
          reject(new Error('不支持的数据源类型，请提供JSON字符串或文件对象'));
        }
      } catch (err) {
        reject(new Error(`JSON解析错误: ${err.message}`));
      }
    });
  }

  /**
   * 自动检测并解析数据
   * @param {string|File} source - 数据源（字符串或文件对象）
   * @param {string} type - 数据类型（'csv'、'json'或'auto'）
   * @returns {Promise<Array|Object>} 解析后的数据
   */
  static parseData(source, type = 'auto') {
    return new Promise((resolve, reject) => {
      // 如果是文件，根据文件扩展名或指定类型解析
      if (source instanceof File) {
        const fileName = source.name.toLowerCase();

        if (type === 'auto') {
          if (fileName.endsWith('.csv')) {
            return this.parseCSV(source).then(resolve).catch(reject);
          } else if (fileName.endsWith('.json')) {
            return this.parseJSON(source).then(resolve).catch(reject);
          } else {
            return reject(new Error('无法自动检测文件类型，请指定类型参数'));
          }
        } else if (type === 'csv') {
          return this.parseCSV(source).then(resolve).catch(reject);
        } else if (type === 'json') {
          return this.parseJSON(source).then(resolve).catch(reject);
        }
      }

      // 如果是字符串，尝试自动检测格式
      if (typeof source === 'string') {
        if (type === 'auto') {
          // 尝试解析为JSON
          try {
            const data = JSON.parse(source);
            return resolve(data);
          } catch (e) {
            // 不是有效的JSON，尝试解析为CSV
            return this.parseCSV(source).then(resolve).catch(reject);
          }
        } else if (type === 'csv') {
          return this.parseCSV(source).then(resolve).catch(reject);
        } else if (type === 'json') {
          try {
            const data = JSON.parse(source);
            return resolve(data);
          } catch (e) {
            return reject(new Error('无效的JSON格式'));
          }
        }
      }

      reject(new Error('不支持的数据源或类型'));
    });
  }

  /**
   * 将数据转换为网络图所需的格式
   * @param {Array} data - 原始数据数组
   * @param {Object} options - 转换选项
   * @returns {Object} 网络图数据（包含nodes和links）
   */
  static convertToNetworkData(data, options = {}) {
    const {
      nodeIdField = 'id',      // 节点ID字段
      nodeNameField = 'name',  // 节点名称字段
      nodeGroupField = 'group', // 节点分组字段
      sourceLinkField = 'source', // 连接源节点字段
      targetLinkField = 'target', // 连接目标节点字段
      valueLinkField = 'value'    // 连接权重字段
    } = options;

    // 如果数据已经是网络图格式（包含nodes和links），直接返回
    if (data.nodes && data.links) {
      return data;
    }

    // 从数据中提取唯一节点
    const nodesMap = new Map();
    const links = [];

    // 处理不同的数据格式
    if (Array.isArray(data)) {
      // 如果数据是数组，假设每个元素代表一个连接
      data.forEach((item, index) => {
        const sourceId = item[sourceLinkField];
        const targetId = item[targetLinkField];

        if (!sourceId || !targetId) return;

        // 添加源节点
        if (!nodesMap.has(sourceId)) {
          nodesMap.set(sourceId, {
            id: sourceId,
            name: item[nodeNameField] || sourceId,
            group: item[nodeGroupField] !== undefined ? item[nodeGroupField] : 0
          });
        }

        // 添加目标节点
        if (!nodesMap.has(targetId)) {
          nodesMap.set(targetId, {
            id: targetId,
            name: item[`target_${nodeNameField}`] || targetId,
            group: item[`target_${nodeGroupField}`] !== undefined ? item[`target_${nodeGroupField}`] : 0
          });
        }

        // 添加连接
        links.push({
          source: sourceId,
          target: targetId,
          value: item[valueLinkField] !== undefined ? item[valueLinkField] : 1
        });
      });
    }

    return {
      nodes: Array.from(nodesMap.values()),
      links: links
    };
  }

  /**
   * 将数据转换为柱状图所需的格式
   * @param {Array|Object} data - 原始数据
   * @param {Object} options - 转换选项
   * @returns {Array} 柱状图数据数组
   */
  static convertToBarChartData(data, options = {}) {
    const {
      categoryField = null,  // 分类字段
      valueFields = null     // 值字段数组
    } = options;

    // 如果数据已经是数组格式，检查是否包含必要的数值字段
    if (Array.isArray(data)) {
      // 如果没有指定值字段，尝试自动检测
      if (!valueFields && data.length > 0) {
        const sampleItem = data[0];
        const detectedValueFields = [];

        for (const key in sampleItem) {
          if (typeof sampleItem[key] === 'number') {
            detectedValueFields.push(key);
          }
        }

        // 如果找到数值字段，直接返回数据
        if (detectedValueFields.length > 0) {
          return data;
        }
      }

      // 如果指定了值字段，检查数据是否符合要求
      if (valueFields && data.length > 0) {
        const sampleItem = data[0];
        const hasValueField = valueFields.some(field => typeof sampleItem[field] === 'number');

        if (hasValueField) {
          return data;
        }
      }
    }

    // 如果数据是对象格式（如键值对），转换为数组格式
    if (typeof data === 'object' && !Array.isArray(data) && data !== null) {
      const result = [];

      for (const key in data) {
        if (typeof data[key] === 'number') {
          // 简单键值对转换为分类-值对
          result.push({
            category: key,
            value: data[key]
          });
        } else if (typeof data[key] === 'object') {
          // 嵌套对象，每个键作为一个分类，内部键值对作为多个值
          const item = { category: key };

          for (const subKey in data[key]) {
            if (typeof data[key][subKey] === 'number') {
              item[subKey] = data[key][subKey];
            }
          }

          if (Object.keys(item).length > 1) { // 至少有一个值字段
            result.push(item);
          }
        }
      }

      return result;
    }

    // 无法转换，返回空数组
    console.error('无法将数据转换为柱状图格式');
    return [];
  }

  /**
   * 将数据转换为表面图所需的格式
   * @param {Array|Object} data - 原始数据
   * @param {Object} options - 转换选项
   * @returns {Object} 表面图数据对象，包含values二维数组和可选的xLabels、yLabels
   */
  static convertToSurfaceData(data, options = {}) {
    // 如果数据已经是表面图格式（包含values二维数组），直接返回
    if (data.values && Array.isArray(data.values) && data.values.length > 0 && Array.isArray(data.values[0])) {
      return data;
    }

    // 如果数据是二维数组，转换为表面图格式
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      return {
        values: data
      };
    }

    // 如果数据是对象数组，尝试转换为二维网格
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const { xField, yField, valueField } = options;

      // 需要指定x、y和value字段
      if (!xField || !yField || !valueField) {
        console.error('转换为表面图需要指定xField、yField和valueField选项');
        return { values: [[]] };
      }

      // 提取唯一的x和y值
      const xValues = [...new Set(data.map(item => item[xField]))].sort();
      const yValues = [...new Set(data.map(item => item[yField]))].sort();

      // 创建二维网格
      const values = Array(yValues.length).fill().map(() => Array(xValues.length).fill(0));

      // 填充数据
      data.forEach(item => {
        const xIndex = xValues.indexOf(item[xField]);
        const yIndex = yValues.indexOf(item[yField]);

        if (xIndex !== -1 && yIndex !== -1) {
          values[yIndex][xIndex] = item[valueField];
        }
      });

      return {
        xLabels: xValues.map(String),
        yLabels: yValues.map(String),
        values: values
      };
    }

    // 无法转换，返回空表面图数据
    console.error('无法将数据转换为表面图格式');
    return { values: [[]] };
  }

  /**
   * 将数据转换为树状图所需的格式
   * @param {Array|Object} data - 原始数据
   * @param {Object} options - 转换选项
   * @returns {Object} 树状图数据对象，包含层次结构
   */
  static convertToTreeData(data, options = {}) {
    const {
      idField = 'id',
      nameField = 'name',
      parentField = 'parent',
      valueField = 'value',
      childrenField = 'children'
    } = options;

    // 如果数据已经是树状图格式（包含children属性或者是单个根节点），直接返回
    if (data[childrenField] || (typeof data === 'object' && !Array.isArray(data) && data[idField])) {
      return data;
    }

    // 如果数据是网络图格式（包含nodes和links），转换为树结构
    if (data.nodes && data.links) {
      return this.convertNetworkToTreeData(data, options);
    }

    // 如果数据是平面数组（包含父子关系），转换为树结构
    if (Array.isArray(data) && data.length > 0) {
      return this.convertFlatArrayToTreeData(data, options);
    }

    // 无法转换，返回默认树结构
    console.error('无法将数据转换为树状图格式');
    return {
      id: 'root',
      name: '根节点',
      value: 1,
      children: []
    };
  }

  /**
   * 将网络图数据转换为树状图数据
   * @param {Object} networkData - 网络图数据（包含nodes和links）
   * @param {Object} options - 转换选项
   * @returns {Object} 树状图数据
   */
  static convertNetworkToTreeData(networkData, options = {}) {
    const { nodes, links } = networkData;
    const { idField = 'id', nameField = 'name', valueField = 'value' } = options;

    // 创建节点映射
    const nodeMap = new Map();
    nodes.forEach(node => {
      nodeMap.set(node[idField], {
        id: node[idField],
        name: node[nameField] || node[idField],
        value: node[valueField] || 1,
        children: []
      });
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
    const rootNodes = nodes.filter(node => !childrenSet.has(node[idField]));

    if (rootNodes.length === 0) {
      console.warn('未找到根节点，使用第一个节点作为根节点');
      return nodeMap.get(nodes[0][idField]);
    }

    // 如果有多个根节点，创建一个虚拟根节点
    if (rootNodes.length > 1) {
      const virtualRoot = {
        id: 'virtual_root',
        name: '根节点',
        value: rootNodes.reduce((sum, node) => sum + (node[valueField] || 1), 0),
        children: rootNodes.map(node => nodeMap.get(node[idField]))
      };
      return virtualRoot;
    }

    return nodeMap.get(rootNodes[0][idField]);
  }

  /**
   * 将平面数组转换为树状图数据
   * @param {Array} flatData - 平面数组数据
   * @param {Object} options - 转换选项
   * @returns {Object} 树状图数据
   */
  static convertFlatArrayToTreeData(flatData, options = {}) {
    const {
      idField = 'id',
      nameField = 'name',
      parentField = 'parent',
      valueField = 'value'
    } = options;

    // 创建节点映射
    const nodeMap = new Map();
    const childrenMap = new Map();

    // 初始化所有节点
    flatData.forEach(item => {
      const nodeId = item[idField];
      const node = {
        id: nodeId,
        name: item[nameField] || nodeId,
        value: item[valueField] || 1,
        children: []
      };

      nodeMap.set(nodeId, node);
      childrenMap.set(nodeId, []);
    });

    // 构建父子关系
    let rootNode = null;
    flatData.forEach(item => {
      const nodeId = item[idField];
      const parentId = item[parentField];

      if (parentId && nodeMap.has(parentId)) {
        // 有父节点，添加到父节点的children中
        const parentNode = nodeMap.get(parentId);
        const childNode = nodeMap.get(nodeId);
        parentNode.children.push(childNode);
      } else {
        // 没有父节点或父节点不存在，可能是根节点
        if (!rootNode) {
          rootNode = nodeMap.get(nodeId);
        }
      }
    });

    // 如果没有找到根节点，使用第一个节点
    if (!rootNode && flatData.length > 0) {
      rootNode = nodeMap.get(flatData[0][idField]);
    }

    return rootNode || {
      id: 'empty_root',
      name: '空根节点',
      value: 0,
      children: []
    };
  }
}