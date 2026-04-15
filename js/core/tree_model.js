const NODE_LABELS = {
  problem: "\u554f\u984c\u30fb\u73fe\u8c61",
  why: "\u306a\u305c",
  countermeasure: "\u5bfe\u7b56"
};

const APP_NAME = "whywhy-sheet";
const APP_VERSION = "3.0.0";
const NODE_TYPES = new Set(["problem", "why", "countermeasure"]);

function cloneNode(node) {
  return {
    ...node,
    children: [...node.children]
  };
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

export class TreeModel {
  constructor() {
    this.sequence = 1;
    this.nodes = [];
    this.rootId = null;
    this.createRootNode();
  }

  static validateSerializedTree(payload) {
    if (!isPlainObject(payload)) {
      throw new Error("JSON\u306e\u30eb\u30fc\u30c8\u69cb\u9020\u304c\u4e0d\u6b63\u3067\u3059\u3002");
    }

    if (payload.app !== APP_NAME) {
      throw new Error("\u3053\u306e\u30a2\u30d7\u30ea\u306eJSON\u30d5\u30a1\u30a4\u30eb\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002");
    }

    if (typeof payload.version !== "string" || payload.version.length === 0) {
      throw new Error("version\u304c\u4e0d\u6b63\u3067\u3059\u3002");
    }

    if (typeof payload.rootId !== "string" || payload.rootId.length === 0) {
      throw new Error("rootId\u304c\u4e0d\u6b63\u3067\u3059\u3002");
    }

    if (!Array.isArray(payload.nodes) || payload.nodes.length === 0) {
      throw new Error("nodes\u304c\u4e0d\u6b63\u3067\u3059\u3002");
    }

    const nodeIds = new Set();
    for (const node of payload.nodes) {
      if (!isPlainObject(node)) {
        throw new Error("\u30ce\u30fc\u30c9\u69cb\u9020\u304c\u4e0d\u6b63\u3067\u3059\u3002");
      }

      const requiredKeys = ["id", "type", "level", "text", "parentId", "nextId", "children", "x", "y"];
      for (const key of requiredKeys) {
        if (!(key in node)) {
          throw new Error(`\u30ce\u30fc\u30c9\u306b\u5fc5\u9808\u9805\u76ee ${key} \u304c\u3042\u308a\u307e\u305b\u3093\u3002`);
        }
      }

      if (typeof node.id !== "string" || node.id.length === 0 || nodeIds.has(node.id)) {
        throw new Error("\u30ce\u30fc\u30c9ID\u304c\u4e0d\u6b63\u307e\u305f\u306f\u91cd\u8907\u3057\u3066\u3044\u307e\u3059\u3002");
      }

      if (!NODE_TYPES.has(node.type)) {
        throw new Error(`\u672a\u5bfe\u5fdc\u306e\u30ce\u30fc\u30c9\u7a2e\u5225\u3067\u3059: ${node.type}`);
      }

      if (!Number.isInteger(node.level) || node.level < 0) {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e level \u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      if (typeof node.text !== "string") {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e text \u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      if (node.parentId !== null && typeof node.parentId !== "string") {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e parentId \u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      if (node.nextId !== null && typeof node.nextId !== "string") {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e nextId \u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      if (!Array.isArray(node.children) || !node.children.every((childId) => typeof childId === "string")) {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e children \u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e\u5ea7\u6a19\u304c\u4e0d\u6b63\u3067\u3059\u3002`);
      }

      nodeIds.add(node.id);
    }

    if (!nodeIds.has(payload.rootId)) {
      throw new Error("rootId\u306b\u5bfe\u5fdc\u3059\u308b\u30ce\u30fc\u30c9\u304c\u5b58\u5728\u3057\u307e\u305b\u3093\u3002");
    }

    const nodeMap = new Map(payload.nodes.map((node) => [node.id, node]));
    for (const node of payload.nodes) {
      if (node.parentId !== null && !nodeMap.has(node.parentId)) {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e parentId \u304c\u5b58\u5728\u3057\u307e\u305b\u3093\u3002`);
      }

      if (node.nextId !== null && !nodeMap.has(node.nextId)) {
        throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e nextId \u304c\u5b58\u5728\u3057\u307e\u305b\u3093\u3002`);
      }

      for (const childId of node.children) {
        if (!nodeMap.has(childId)) {
          throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u306e children \u306b\u5b58\u5728\u3057\u306a\u3044ID\u304c\u3042\u308a\u307e\u3059\u3002`);
        }
      }

      if (node.id === payload.rootId && node.parentId !== null) {
        throw new Error("\u30eb\u30fc\u30c8\u30ce\u30fc\u30c9\u306e parentId \u306f null \u3067\u3042\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002");
      }

      if (node.parentId !== null) {
        const parentNode = nodeMap.get(node.parentId);
        const isLinkedFromParent = parentNode.nextId === node.id || parentNode.children.includes(node.id);
        if (!isLinkedFromParent) {
          throw new Error(`\u30ce\u30fc\u30c9 ${node.id} \u3068 parentId \u306e\u95a2\u4fc2\u304c\u4e0d\u6574\u5408\u3067\u3059\u3002`);
        }
      }
    }

    const rootNode = nodeMap.get(payload.rootId);
    if (rootNode.type !== "problem") {
      throw new Error("\u30eb\u30fc\u30c8\u30ce\u30fc\u30c9\u306f problem \u5f62\u5f0f\u3067\u3042\u308b\u5fc5\u8981\u304c\u3042\u308a\u307e\u3059\u3002");
    }

    return true;
  }

  static createFromSerializedTree(payload) {
    TreeModel.validateSerializedTree(payload);

    const model = new TreeModel();
    model.rootId = payload.rootId;
    model.nodes = payload.nodes.map((node) => cloneNode(node));
    model.sequence =
      model.nodes.reduce((maxValue, node) => {
        const match = /^node-(\d+)$/.exec(node.id);
        const numericId = match ? Number.parseInt(match[1], 10) : 0;
        return Math.max(maxValue, numericId);
      }, 0) + 1;
    return model;
  }

  createRootNode() {
    const rootNode = this.buildNode({
      type: "problem",
      level: 0,
      text: "",
      parentId: null
    });

    this.nodes.push(rootNode);
    this.rootId = rootNode.id;
  }

  buildNode({ type, level, text, parentId }) {
    return {
      id: `node-${this.sequence++}`,
      type,
      level,
      text,
      parentId,
      nextId: null,
      children: [],
      measuredHeight: null,
      x: 0,
      y: 0
    };
  }

  replaceFromSerializedTree(payload) {
    const restoredModel = TreeModel.createFromSerializedTree(payload);
    this.sequence = restoredModel.sequence;
    this.nodes = restoredModel.nodes;
    this.rootId = restoredModel.rootId;
  }

  serialize() {
    return {
      app: APP_NAME,
      version: APP_VERSION,
      rootId: this.rootId,
      nodes: this.getNodes()
    };
  }

  getNodes() {
    return this.nodes.map(cloneNode);
  }

  applyNodePositions(layoutNodes) {
    const positionMap = new Map(layoutNodes.map((node) => [node.id, node]));
    for (const node of this.nodes) {
      const layoutNode = positionMap.get(node.id);
      if (layoutNode) {
        node.x = layoutNode.x;
        node.y = layoutNode.y;
      }
    }
  }

  getNodeById(nodeId) {
    return this.nodes.find((node) => node.id === nodeId) ?? null;
  }

  getNodeSnapshot(nodeId) {
    const node = this.getNodeById(nodeId);
    return node ? cloneNode(node) : null;
  }

  updateNodeText(nodeId, text) {
    const targetNode = this.getNodeById(nodeId);
    if (targetNode) {
      targetNode.text = text;
    }
  }

  updateNodeMeasuredHeight(nodeId, measuredHeight) {
    const targetNode = this.getNodeById(nodeId);
    if (!targetNode) {
      return false;
    }

    if (typeof measuredHeight === "number" && Number.isFinite(measuredHeight) && measuredHeight > 0) {
      if (targetNode.measuredHeight === measuredHeight) {
        return false;
      }
      targetNode.measuredHeight = measuredHeight;
      return true;
    }

    return false;
  }

  getNextDefinition(sourceNode) {
    if (!sourceNode || sourceNode.type === "countermeasure") {
      return null;
    }

    const nextLevel = sourceNode.level + 1;
    const nextType = nextLevel >= 6 ? "countermeasure" : "why";
    const nextText =
      nextType === "countermeasure" ? NODE_LABELS.countermeasure : `${NODE_LABELS.why}${nextLevel}`;

    return {
      level: nextLevel,
      type: nextType,
      text: nextText
    };
  }

  getLabelForNode(type, level) {
    if (type === "problem") {
      return NODE_LABELS.problem;
    }

    if (type === "countermeasure") {
      return NODE_LABELS.countermeasure;
    }

    return `${NODE_LABELS.why}${level}`;
  }

  getBranchOrder(parentNode, nodeId) {
    if (!parentNode) {
      return -1;
    }

    if (parentNode.nextId === nodeId) {
      return 1;
    }

    const branchIndex = parentNode.children.indexOf(nodeId);
    if (branchIndex >= 0) {
      return branchIndex + 2;
    }

    return -1;
  }

  getDisplayLabelParts(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return { baseLabel: "", branchSuffix: "" };
    }

    const baseLabel = this.getLabelForNode(node.type, node.level);
    const parentNode = node.parentId ? this.getNodeById(node.parentId) : null;
    const branchOrder = node.type === "why" ? this.getBranchOrder(parentNode, node.id) : -1;
    const branchSuffix = branchOrder >= 0 ? `-${branchOrder}` : "";

    return { baseLabel, branchSuffix };
  }

  getDisplayLabel(nodeId) {
    const { baseLabel, branchSuffix } = this.getDisplayLabelParts(nodeId);
    return `${baseLabel}${branchSuffix}`;
  }

  getEditableText(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return "";
    }

    if (node.type === "problem") {
      return node.text;
    }

    return node.text === this.getLabelForNode(node.type, node.level) ? "" : node.text;
  }

  hasCompletedText(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node) {
      return false;
    }

    const trimmedText = node.text.trim();
    if (trimmedText.length === 0) {
      return false;
    }

    return trimmedText !== this.getLabelForNode(node.type, node.level);
  }

  canCreateBranchFromNode(nodeId) {
    const node = this.getNodeById(nodeId);
    return Boolean(node) && node.type !== "countermeasure" && Boolean(node.nextId);
  }

  canCreateSiblingBranchFromNode(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node || node.type !== "why" || !node.parentId) {
      return false;
    }

    return this.canCreateBranchFromNode(node.parentId);
  }

  getBranchDefinition(sourceNode) {
    if (!sourceNode) {
      return null;
    }
    return this.getNextDefinition(sourceNode);
  }

  createNextNode(currentNodeId) {
    const currentNode = this.getNodeById(currentNodeId);
    if (!currentNode) {
      return null;
    }

    if (currentNode.nextId) {
      return this.getNodeSnapshot(currentNode.nextId);
    }

    const nextDefinition = this.getNextDefinition(currentNode);
    if (!nextDefinition) {
      return null;
    }

    const nextNode = this.buildNode({
      ...nextDefinition,
      parentId: currentNode.id
    });

    currentNode.nextId = nextNode.id;
    this.nodes.push(nextNode);
    return cloneNode(nextNode);
  }

  createBranchNode(sourceNodeId) {
    const sourceNode = this.getNodeById(sourceNodeId);
    if (!sourceNode || !this.canCreateBranchFromNode(sourceNodeId)) {
      return null;
    }

    const branchDefinition = this.getBranchDefinition(sourceNode);
    if (!branchDefinition) {
      return null;
    }

    const branchParent = this.getNodeById(sourceNode.id);
    if (!branchParent) {
      return null;
    }

    const branchNode = this.buildNode({
      ...branchDefinition,
      parentId: branchParent.id
    });

    branchParent.children.push(branchNode.id);
    this.nodes.push(branchNode);
    return cloneNode(branchNode);
  }

  createSiblingBranchNode(sourceNodeId) {
    const sourceNode = this.getNodeById(sourceNodeId);
    if (!sourceNode || !this.canCreateSiblingBranchFromNode(sourceNodeId)) {
      return null;
    }

    const branchParent = this.getNodeById(sourceNode.parentId);
    if (!branchParent) {
      return null;
    }

    const branchDefinition = this.getBranchDefinition(branchParent);
    if (!branchDefinition) {
      return null;
    }

    const branchNode = this.buildNode({
      ...branchDefinition,
      parentId: branchParent.id
    });

    branchParent.children.push(branchNode.id);
    this.nodes.push(branchNode);
    return cloneNode(branchNode);
  }

  finalizeAsCountermeasure(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node || node.type !== "why" || !this.isTerminalNode(nodeId)) {
      return false;
    }

    node.type = "countermeasure";
    if (node.text.trim().length === 0 || node.text === this.getLabelForNode("why", node.level)) {
      node.text = NODE_LABELS.countermeasure;
    }

    return true;
  }

  isTerminalNode(nodeId) {
    const node = this.getNodeById(nodeId);
    return Boolean(node) && !node.nextId && node.children.length === 0;
  }

  deleteNode(nodeId) {
    const node = this.getNodeById(nodeId);
    if (!node || !this.isTerminalNode(nodeId) || node.id === this.rootId) {
      return false;
    }

    const parentNode = node.parentId ? this.getNodeById(node.parentId) : null;
    if (parentNode) {
      if (parentNode.nextId === node.id) {
        parentNode.nextId = null;
      }

      parentNode.children = parentNode.children.filter((childId) => childId !== node.id);
    }

    this.nodes = this.nodes.filter((item) => item.id !== node.id);
    return true;
  }
}
