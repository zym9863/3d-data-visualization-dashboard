/**
 * 树状图示例数据
 * 包含层次结构的组织架构数据
 */

const sampleTreeData = {
  id: "CEO",
  name: "首席执行官",
  value: 100,
  children: [
    {
      id: "CTO",
      name: "首席技术官",
      value: 85,
      children: [
        {
          id: "DEV_MANAGER",
          name: "开发经理",
          value: 75,
          children: [
            {
              id: "FRONTEND_LEAD",
              name: "前端负责人",
              value: 65,
              children: [
                { id: "FRONTEND_DEV1", name: "前端开发1", value: 55 },
                { id: "FRONTEND_DEV2", name: "前端开发2", value: 50 },
                { id: "UI_DESIGNER", name: "UI设计师", value: 60 }
              ]
            },
            {
              id: "BACKEND_LEAD",
              name: "后端负责人",
              value: 70,
              children: [
                { id: "BACKEND_DEV1", name: "后端开发1", value: 60 },
                { id: "BACKEND_DEV2", name: "后端开发2", value: 58 },
                { id: "DATABASE_ADMIN", name: "数据库管理员", value: 65 }
              ]
            }
          ]
        },
        {
          id: "QA_MANAGER",
          name: "质量保证经理",
          value: 70,
          children: [
            { id: "QA_ENGINEER1", name: "测试工程师1", value: 55 },
            { id: "QA_ENGINEER2", name: "测试工程师2", value: 52 },
            { id: "AUTOMATION_ENGINEER", name: "自动化工程师", value: 60 }
          ]
        }
      ]
    },
    {
      id: "CFO",
      name: "首席财务官",
      value: 80,
      children: [
        {
          id: "ACCOUNTING_MANAGER",
          name: "会计经理",
          value: 65,
          children: [
            { id: "ACCOUNTANT1", name: "会计师1", value: 50 },
            { id: "ACCOUNTANT2", name: "会计师2", value: 48 }
          ]
        },
        {
          id: "FINANCE_MANAGER",
          name: "财务经理",
          value: 70,
          children: [
            { id: "FINANCIAL_ANALYST", name: "财务分析师", value: 55 },
            { id: "BUDGET_ANALYST", name: "预算分析师", value: 52 }
          ]
        }
      ]
    },
    {
      id: "CMO",
      name: "首席营销官",
      value: 78,
      children: [
        {
          id: "MARKETING_MANAGER",
          name: "市场经理",
          value: 68,
          children: [
            { id: "DIGITAL_MARKETER", name: "数字营销专员", value: 55 },
            { id: "CONTENT_CREATOR", name: "内容创作者", value: 50 },
            { id: "SEO_SPECIALIST", name: "SEO专员", value: 52 }
          ]
        },
        {
          id: "SALES_MANAGER",
          name: "销售经理",
          value: 72,
          children: [
            { id: "SALES_REP1", name: "销售代表1", value: 58 },
            { id: "SALES_REP2", name: "销售代表2", value: 56 },
            { id: "ACCOUNT_MANAGER", name: "客户经理", value: 62 }
          ]
        }
      ]
    },
    {
      id: "CHRO",
      name: "首席人力资源官",
      value: 75,
      children: [
        {
          id: "HR_MANAGER",
          name: "人力资源经理",
          value: 65,
          children: [
            { id: "RECRUITER", name: "招聘专员", value: 50 },
            { id: "HR_GENERALIST", name: "人力资源专员", value: 48 }
          ]
        },
        {
          id: "TRAINING_MANAGER",
          name: "培训经理",
          value: 60,
          children: [
            { id: "TRAINER1", name: "培训师1", value: 45 },
            { id: "TRAINER2", name: "培训师2", value: 43 }
          ]
        }
      ]
    }
  ],
  
  // 元数据（可选）
  metadata: {
    title: "公司组织架构图",
    description: "展示公司的层次结构和各部门人员配置",
    source: "人力资源部门"
  }
};

// 另一个示例：项目结构树
const sampleProjectTreeData = {
  id: "PROJECT_ROOT",
  name: "Web应用项目",
  value: 100,
  children: [
    {
      id: "FRONTEND",
      name: "前端模块",
      value: 40,
      children: [
        {
          id: "COMPONENTS",
          name: "组件库",
          value: 20,
          children: [
            { id: "HEADER", name: "头部组件", value: 5 },
            { id: "SIDEBAR", name: "侧边栏组件", value: 8 },
            { id: "FOOTER", name: "底部组件", value: 3 },
            { id: "MODAL", name: "弹窗组件", value: 4 }
          ]
        },
        {
          id: "PAGES",
          name: "页面",
          value: 15,
          children: [
            { id: "HOME", name: "首页", value: 6 },
            { id: "DASHBOARD", name: "仪表盘", value: 9 }
          ]
        },
        {
          id: "STYLES",
          name: "样式",
          value: 5,
          children: [
            { id: "CSS", name: "CSS文件", value: 2 },
            { id: "THEMES", name: "主题", value: 3 }
          ]
        }
      ]
    },
    {
      id: "BACKEND",
      name: "后端模块",
      value: 35,
      children: [
        {
          id: "API",
          name: "API接口",
          value: 20,
          children: [
            { id: "USER_API", name: "用户API", value: 8 },
            { id: "DATA_API", name: "数据API", value: 12 }
          ]
        },
        {
          id: "DATABASE",
          name: "数据库",
          value: 15,
          children: [
            { id: "MODELS", name: "数据模型", value: 8 },
            { id: "MIGRATIONS", name: "数据迁移", value: 7 }
          ]
        }
      ]
    },
    {
      id: "DEVOPS",
      name: "运维配置",
      value: 25,
      children: [
        {
          id: "DOCKER",
          name: "Docker配置",
          value: 10,
          children: [
            { id: "DOCKERFILE", name: "Dockerfile", value: 5 },
            { id: "COMPOSE", name: "Docker Compose", value: 5 }
          ]
        },
        {
          id: "CI_CD",
          name: "CI/CD",
          value: 15,
          children: [
            { id: "GITHUB_ACTIONS", name: "GitHub Actions", value: 8 },
            { id: "DEPLOYMENT", name: "部署脚本", value: 7 }
          ]
        }
      ]
    }
  ],
  
  metadata: {
    title: "项目结构树",
    description: "展示Web应用项目的模块化结构",
    source: "项目架构文档"
  }
};

// 将示例数据添加到全局window对象，以便在main.js中访问
window.sampleTreeData = sampleTreeData;
window.sampleProjectTreeData = sampleProjectTreeData;

export { sampleTreeData, sampleProjectTreeData };
export default sampleTreeData;
