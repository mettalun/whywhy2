const NODE_WIDTH = 220;
const NODE_HEIGHT = 96;
const START_X = 48;
const START_Y = 88;
const HORIZONTAL_GAP = 120;
const VERTICAL_GAP = 80;
const TEXT_LINE_HEIGHT = 24;
const TEXTAREA_VERTICAL_PADDING = 96;
const TEXT_WRAP_CHAR_COUNT = 10;
const NODE_TEXT_ANCHOR_OFFSET = 56;
const TERMINAL_ACTION_ROW_HEIGHT = 44;
const RESERVED_CARD_HEIGHT = 180;
const BRANCH_START_ROW_GAP = 2;

function estimateNodeHeight(text) {
  const normalizedText = String(text ?? "").replaceAll("\r\n", "\n");
  const lines = normalizedText.split("\n");
  const visualLineCount = Math.max(
    1,
    lines.reduce((total, line) => total + Math.max(1, Math.ceil(Array.from(line).length / TEXT_WRAP_CHAR_COUNT)), 0)
  );

  return Math.max(NODE_HEIGHT, TEXTAREA_VERTICAL_PADDING + visualLineCount * TEXT_LINE_HEIGHT);
}

function resolveNodeHeight(node) {
  const estimatedHeight = estimateNodeHeight(node?.text);
  const measuredHeight =
    typeof node?.measuredHeight === "number" && Number.isFinite(node.measuredHeight) ? node.measuredHeight : 0;
  return Math.max(estimatedHeight, measuredHeight, NODE_HEIGHT);
}

function getNodeAnchorOffset(nodeHeight) {
  return Math.min(nodeHeight - 20, NODE_TEXT_ANCHOR_OFFSET);
}

function getNodeCardExtraHeight(node) {
  if (node && node.parentId && !node.nextId && (!Array.isArray(node.children) || node.children.length === 0)) {
    return TERMINAL_ACTION_ROW_HEIGHT;
  }

  return 0;
}

function getReservedCardHeight(node) {
  const actualHeight = resolveNodeHeight(node) + getNodeCardExtraHeight(node);
  return Math.max(RESERVED_CARD_HEIGHT, actualHeight);
}

function getColumnBottom(columnBottoms, columnKey) {
  return columnBottoms.get(columnKey) ?? START_Y - VERTICAL_GAP;
}

function assignNodeLayout(nodeId, nodeMap, x, anchorY, positionedNodes, layoutState) {
  const node = nodeMap.get(nodeId);
  if (!node) {
    return anchorY;
  }

  node.height = resolveNodeHeight(node);
  node.anchorOffset = getNodeAnchorOffset(node.height);
  node.x = x;

  const desiredTop = anchorY - node.anchorOffset;
  const minTop = getColumnBottom(layoutState.columnBottoms, x) + VERTICAL_GAP;
  node.y = Math.max(desiredTop, minTop);
  node.anchorY = node.y + node.anchorOffset;
  positionedNodes.push(node);

  const nodeBottom = node.y + node.height + getNodeCardExtraHeight(node);
  const reservedBottom = node.y + getReservedCardHeight(node);
  layoutState.columnBottoms.set(x, Math.max(getColumnBottom(layoutState.columnBottoms, x), reservedBottom));
  layoutState.globalBottom = Math.max(layoutState.globalBottom, reservedBottom);

  if (node.nextId) {
    assignNodeLayout(
      node.nextId,
      nodeMap,
      x + NODE_WIDTH + HORIZONTAL_GAP,
      node.anchorY,
      positionedNodes,
      layoutState
    );
  }

  const branchStartGap = node.nextId ? BRANCH_START_ROW_GAP : 1;
  let childTop = Math.max(
    node.y + getReservedCardHeight(node) + VERTICAL_GAP * branchStartGap,
    layoutState.globalBottom + VERTICAL_GAP
  );
  for (const childId of node.children) {
    const childNode = nodeMap.get(childId);
    const childHeight = resolveNodeHeight(childNode);
    const childAnchorY = childTop + getNodeAnchorOffset(childHeight);
    assignNodeLayout(
      childId,
      nodeMap,
      x + NODE_WIDTH + HORIZONTAL_GAP,
      childAnchorY,
      positionedNodes,
      layoutState
    );
    const placedChild = nodeMap.get(childId);
    if (!placedChild) {
      continue;
    }
    childTop = Math.max(
      placedChild.y + getReservedCardHeight(placedChild) + VERTICAL_GAP,
      layoutState.globalBottom + VERTICAL_GAP
    );
  }

  return nodeBottom;
}

export function layoutTree(nodes, rootId) {
  const nodeMap = new Map(nodes.map((node) => [node.id, { ...node, children: [...node.children] }]));
  const positionedNodes = [];
  const layoutState = {
    columnBottoms: new Map(),
    globalBottom: START_Y - VERTICAL_GAP
  };
  const rootNode = nodeMap.get(rootId);
  const rootHeight = resolveNodeHeight(rootNode);
  const rootAnchorY = START_Y + getNodeAnchorOffset(rootHeight);

  assignNodeLayout(rootId, nodeMap, START_X, rootAnchorY, positionedNodes, layoutState);

  const orderedNodes = positionedNodes.sort((left, right) => {
    if (left.y === right.y) {
      return left.x - right.x;
    }

    return left.y - right.y;
  });

  const maxRight = orderedNodes.reduce((value, node) => Math.max(value, node.x + NODE_WIDTH), START_X + NODE_WIDTH);
  const maxBottom = orderedNodes.reduce(
    (value, node) =>
      Math.max(value, node.y + getReservedCardHeight(node)),
    START_Y + NODE_HEIGHT
  );
  const width = maxRight + START_X;
  const height = maxBottom + START_Y;

  return {
    nodes: orderedNodes,
    metrics: {
      nodeWidth: NODE_WIDTH,
      nodeHeight: NODE_HEIGHT,
      width,
      height,
      horizontalGap: HORIZONTAL_GAP,
      verticalGap: VERTICAL_GAP
    }
  };
}
