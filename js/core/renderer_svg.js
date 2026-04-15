const NODE_BASE_HEIGHT = 96;
const NODE_TEXT_ANCHOR_OFFSET = 56;

function createSvgElement(tagName) {
  return document.createElementNS("http://www.w3.org/2000/svg", tagName);
}

function getNodeAnchorY(node, nodeHeight, anchorMode = "offset") {
  return node.y + Math.min(nodeHeight - 20, NODE_TEXT_ANCHOR_OFFSET);
}

function buildConnectionPath(fromNode, toNode, metrics, anchorMode) {
  const startX = fromNode.x + metrics.nodeWidth;
  const startY = getNodeAnchorY(fromNode, fromNode.height ?? metrics.nodeHeight, anchorMode);
  const endX = toNode.x;
  const endY = getNodeAnchorY(toNode, toNode.height ?? metrics.nodeHeight, anchorMode);
  const elbowX = startX + metrics.horizontalGap / 2;

  return `M ${startX} ${startY} L ${elbowX} ${startY} L ${elbowX} ${endY} L ${endX} ${endY}`;
}

function buildBranchPath(fromNode, toNode, metrics, anchorMode) {
  const startX = fromNode.x + metrics.nodeWidth;
  const startY = getNodeAnchorY(fromNode, fromNode.height ?? metrics.nodeHeight, anchorMode);
  const endX = toNode.x;
  const endY = getNodeAnchorY(toNode, toNode.height ?? metrics.nodeHeight, anchorMode);
  const elbowX = startX + metrics.horizontalGap / 2;

  return `M ${startX} ${startY} L ${elbowX} ${startY} L ${elbowX} ${endY} L ${endX} ${endY}`;
}

function appendBranchButton(svgElement, centerX, centerY, nodeId, onClick) {
  const branchButton = createSvgElement("g");
  const handleBranchClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick(nodeId);
  };
  branchButton.classList.add("branch-slot");
  branchButton.dataset.nodeId = nodeId;
  branchButton.dataset.branchButton = "true";
  branchButton.style.pointerEvents = "all";
  branchButton.style.cursor = "pointer";

  const hitArea = createSvgElement("circle");
  hitArea.setAttribute("cx", `${centerX}`);
  hitArea.setAttribute("cy", `${centerY}`);
  hitArea.setAttribute("r", "22");
  hitArea.setAttribute("fill", "#ffffff");
  hitArea.setAttribute("fill-opacity", "0.001");
  hitArea.setAttribute("stroke", "none");
  hitArea.dataset.branchButton = "true";
  hitArea.style.pointerEvents = "all";
  hitArea.style.cursor = "pointer";

  const badge = createSvgElement("circle");
  badge.setAttribute("cx", `${centerX}`);
  badge.setAttribute("cy", `${centerY}`);
  badge.setAttribute("r", "11");
  badge.setAttribute("fill", "#fffaf5");
  badge.setAttribute("stroke", "#a28f82");
  badge.setAttribute("stroke-width", "1.5");
  badge.dataset.branchButton = "true";
  badge.style.pointerEvents = "all";
  badge.style.cursor = "pointer";

  const label = createSvgElement("text");
  label.setAttribute("x", `${centerX}`);
  label.setAttribute("y", `${centerY + 4}`);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "16");
  label.setAttribute("fill", "#6a5a4f");
  label.dataset.branchButton = "true";
  label.style.pointerEvents = "all";
  label.style.cursor = "pointer";
  label.textContent = "+";

  branchButton.append(hitArea, badge, label);
  branchButton.addEventListener("click", handleBranchClick);
  hitArea.addEventListener("click", handleBranchClick);
  badge.addEventListener("click", handleBranchClick);
  label.addEventListener("click", handleBranchClick);
  svgElement.appendChild(branchButton);
}

export function renderConnections(svgElement, nodes, metrics, options = {}) {
  const {
    onBranchSlotClick = null,
    onSiblingBranchSlotClick = null,
    canBranchFromNode = null,
    canCreateSiblingBranchFromNode = null,
    anchorMode = "offset"
  } = options;
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  svgElement.innerHTML = "";
  svgElement.setAttribute("width", `${metrics.width}`);
  svgElement.setAttribute("height", `${metrics.height}`);
  svgElement.setAttribute("viewBox", `0 0 ${metrics.width} ${metrics.height}`);

  for (const node of nodes) {
    if (node.nextId && nodeMap.has(node.nextId)) {
      const nextNode = nodeMap.get(node.nextId);
      const line = createSvgElement("path");
      line.setAttribute("d", buildConnectionPath(node, nextNode, metrics, anchorMode));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#7b6c62");
      line.setAttribute("stroke-width", "2.5");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.style.pointerEvents = "none";
      svgElement.appendChild(line);
    }

    for (const childId of node.children) {
      if (!nodeMap.has(childId)) {
        continue;
      }

      const childNode = nodeMap.get(childId);
      const endY = getNodeAnchorY(childNode, childNode.height ?? metrics.nodeHeight, anchorMode);
      const elbowX = node.x + metrics.nodeWidth + metrics.horizontalGap / 2;
      const line = createSvgElement("path");
      line.setAttribute("d", buildBranchPath(node, childNode, metrics, anchorMode));
      line.setAttribute("fill", "none");
      line.setAttribute("stroke", "#8d7b70");
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("stroke-linejoin", "round");
      line.style.pointerEvents = "none";
      svgElement.appendChild(line);

      if (
        onSiblingBranchSlotClick &&
        (!canCreateSiblingBranchFromNode || canCreateSiblingBranchFromNode(childNode))
      ) {
        appendBranchButton(svgElement, elbowX, endY, childNode.id, onSiblingBranchSlotClick);
      }
    }

    if (
      onBranchSlotClick &&
      node.type !== "countermeasure" &&
      (!canBranchFromNode || canBranchFromNode(node))
    ) {
      const centerX = node.x + metrics.nodeWidth + metrics.horizontalGap / 2;
      const centerY = getNodeAnchorY(node, node.height ?? metrics.nodeHeight, anchorMode);
      appendBranchButton(svgElement, centerX, centerY, node.id, onBranchSlotClick);
    }
  }
}
