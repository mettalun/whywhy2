import { layoutTree } from "../core/layout_engine.js";
import { renderConnections } from "../core/renderer_svg.js";

const NODE_TEXT_ANCHOR_OFFSET = 56;

export class PcEditor {
  constructor({ treeModel, canvasElement, branchLayerElement, nodeLayerElement, connectionLayerElement, onRenderComplete = null }) {
    this.treeModel = treeModel;
    this.canvasElement = canvasElement;
    this.branchLayerElement = branchLayerElement;
    this.nodeLayerElement = nodeLayerElement;
    this.connectionLayerElement = connectionLayerElement;
    this.onRenderComplete = onRenderComplete;
    this.onNodeSubmit = null;
    this.onNodeBlur = null;
    this.onDeleteRequest = null;
    this.onFinalizeRequest = null;
    this.onNodeLayoutChange = null;
    this.onProblemInput = null;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleDeleteClick = this.handleDeleteClick.bind(this);
    this.handleFinalizeClick = this.handleFinalizeClick.bind(this);
    this.handleBranchButtonClick = this.handleBranchButtonClick.bind(this);
    this.onBranchCreate = null;
    this.onSiblingBranchCreate = null;
    this.onNodeEditStart = null;
    this.shouldAnimateProblemNode = null;
    this.shouldAnimateLoadButton = null;
  }

  autosizeTextarea(textarea) {
    textarea.style.height = "0px";
    void textarea.offsetHeight;
    textarea.style.height = `${Math.max(textarea.scrollHeight, 70)}px`;
  }

  syncMeasuredHeight(textarea) {
    const nodeId = textarea.dataset.nodeId;
    const card = textarea.closest(".why-node-card");
    const measuredHeight = card ? Math.ceil(card.getBoundingClientRect().height) : textarea.scrollHeight;
    return this.treeModel.updateNodeMeasuredHeight(nodeId, measuredHeight);
  }

  render({
    focusNodeId = null,
    focusSelectionStart = null,
    focusSelectionEnd = null,
    onNodeSubmit,
    onNodeBlur,
    onNodeLayoutChange,
    onProblemInput,
    onBranchCreate,
    onSiblingBranchCreate,
    onDeleteRequest,
    onFinalizeRequest,
    shouldAnimateProblemNode,
    shouldAnimateLoadButton
  }) {
    this.onNodeSubmit = onNodeSubmit;
    this.onNodeBlur = onNodeBlur;
    this.onNodeLayoutChange = onNodeLayoutChange;
    this.onProblemInput = onProblemInput;
    this.onDeleteRequest = onDeleteRequest;
    this.onFinalizeRequest = onFinalizeRequest;
    this.onBranchCreate = onBranchCreate;
    this.onSiblingBranchCreate = onSiblingBranchCreate;
    this.shouldAnimateProblemNode = shouldAnimateProblemNode;
    this.shouldAnimateLoadButton = shouldAnimateLoadButton;

    const { nodes, metrics } = layoutTree(this.treeModel.getNodes(), this.treeModel.rootId);
    this.treeModel.applyNodePositions(nodes);

    this.canvasElement.style.width = `${metrics.width}px`;
    this.canvasElement.style.height = `${metrics.height}px`;
    this.branchLayerElement.innerHTML = "";
    this.nodeLayerElement.innerHTML = "";
    renderConnections(this.connectionLayerElement, nodes, metrics, {
      onBranchSlotClick: null,
      onSiblingBranchSlotClick: null,
      canBranchFromNode: (node) => Boolean(node.nextId),
      canCreateSiblingBranchFromNode: (node) => this.treeModel.canCreateSiblingBranchFromNode(node.id)
    });

    this.renderBranchButtons(nodes, metrics);

    for (const node of nodes) {
      const card = document.createElement("div");
      card.className = "why-node-card";
      card.dataset.type = node.type;
      if (node.type === "problem" && !this.shouldAnimateProblemNode?.(node.id)) {
        card.classList.add("why-node-card-animation-stopped");
      }
      card.style.left = `${node.x}px`;
      card.style.top = `${node.y}px`;

      const { baseLabel, branchSuffix } = this.treeModel.getDisplayLabelParts(node.id);
      const displayText = this.treeModel.getEditableText(node.id);
      const nodeLabel = document.createElement("div");
      nodeLabel.className = "why-node-label";
      nodeLabel.innerHTML = `${baseLabel}<span class="why-node-label-suffix">${branchSuffix}</span>`;
      card.appendChild(nodeLabel);

      const contentArea = document.createElement("div");
      contentArea.className = "why-node-content";

      const textarea = document.createElement("textarea");
      textarea.className = "why-node";
      textarea.dataset.nodeId = node.id;
      textarea.dataset.type = node.type;
      textarea.wrap = "soft";
      textarea.value = displayText;
      textarea.style.height = `${Math.max(node.height ?? 96, 96)}px`;
      textarea.placeholder = "";
      textarea.setAttribute("aria-label", `${this.treeModel.getDisplayLabel(node.id)}\u5165\u529b`);
      textarea.setAttribute(
        "title",
        "Enter: \u6b21\u306e\u30dc\u30c3\u30af\u30b9\u3092\u8ffd\u52a0 / Shift+Enter: \u6539\u884c"
      );
      textarea.addEventListener("keydown", this.handleKeyDown);
      textarea.addEventListener("input", this.handleInput);
      textarea.addEventListener("blur", this.handleBlur);
      textarea.addEventListener("focus", this.handleFocus);
      contentArea.appendChild(textarea);
      card.appendChild(contentArea);
      if (this.treeModel.isTerminalNode(node.id) && node.id !== this.treeModel.rootId) {
        const actionRow = document.createElement("div");
        actionRow.className = "node-action-row";

        if (node.type === "why") {
          const finalizeButton = document.createElement("button");
          finalizeButton.className = "node-finalize-button";
          finalizeButton.type = "button";
          finalizeButton.dataset.nodeId = node.id;
          finalizeButton.textContent = "\u5bfe\u7b56\u306b\u78ba\u5b9a";
          finalizeButton.setAttribute("aria-label", `${node.text || "\u30ce\u30fc\u30c9"}\u3092\u5bfe\u7b56\u306b\u78ba\u5b9a`);
          finalizeButton.addEventListener("click", this.handleFinalizeClick);
          actionRow.appendChild(finalizeButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.className = "node-delete-button";
        deleteButton.type = "button";
        deleteButton.dataset.nodeId = node.id;
        deleteButton.textContent = "\u524a\u9664";
        deleteButton.setAttribute("aria-label", `${node.text || "\u30ce\u30fc\u30c9"}\u3092\u524a\u9664`);
        deleteButton.addEventListener("click", this.handleDeleteClick);
        actionRow.appendChild(deleteButton);
        card.appendChild(actionRow);
      }

      this.nodeLayerElement.appendChild(card);
      this.autosizeTextarea(textarea);
      this.syncMeasuredHeight(textarea);
    }

    if (focusNodeId) {
      const nextField = this.nodeLayerElement.querySelector(`[data-node-id="${focusNodeId}"]`);
      if (nextField) {
        nextField.focus();
        const selectionStart = Number.isInteger(focusSelectionStart) ? focusSelectionStart : nextField.value.length;
        const selectionEnd = Number.isInteger(focusSelectionEnd) ? focusSelectionEnd : selectionStart;
        nextField.setSelectionRange(selectionStart, selectionEnd);
      }
    }

    if (this.onRenderComplete) {
      this.onRenderComplete({ nodes, metrics });
    }
  }

  renderBranchButtons(nodes, metrics) {
    for (const node of nodes) {
      if (this.onBranchCreate && node.type !== "countermeasure" && node.nextId) {
        const centerX = node.x + metrics.nodeWidth + metrics.horizontalGap / 2;
        const centerY = node.y + Math.min((node.height ?? metrics.nodeHeight) - 20, NODE_TEXT_ANCHOR_OFFSET);
        this.branchLayerElement.appendChild(this.createBranchButton(centerX, centerY, node.id, "branch"));
      }

      if (!this.onSiblingBranchCreate) {
        continue;
      }

      for (const childId of node.children) {
        const childNode = nodes.find((item) => item.id === childId);
        if (!childNode || !this.treeModel.canCreateSiblingBranchFromNode(childNode.id)) {
          continue;
        }

        const centerX = node.x + metrics.nodeWidth + metrics.horizontalGap / 2;
        const centerY = childNode.y + Math.min((childNode.height ?? metrics.nodeHeight) - 20, NODE_TEXT_ANCHOR_OFFSET);
        this.branchLayerElement.appendChild(this.createBranchButton(centerX, centerY, childNode.id, "sibling"));
      }
    }
  }

  createBranchButton(centerX, centerY, nodeId, branchKind) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "branch-slot-button";
    button.dataset.nodeId = nodeId;
    button.dataset.branchKind = branchKind;
    button.setAttribute("aria-label", branchKind === "sibling" ? "分枝を追加" : "分枝を追加");
    button.style.left = `${centerX}px`;
    button.style.top = `${centerY}px`;
    button.textContent = "+";
    button.addEventListener("click", this.handleBranchButtonClick);
    return button;
  }

  handleBranchButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const button = event.currentTarget;
    const nodeId = button.dataset.nodeId;
    const branchKind = button.dataset.branchKind;

    if (branchKind === "sibling") {
      this.onSiblingBranchCreate?.(nodeId);
      return;
    }

    this.onBranchCreate?.(nodeId);
  }

  handleInput(event) {
    const textarea = event.currentTarget;
    const nodeId = textarea.dataset.nodeId;
    if (textarea.dataset.type === "problem") {
      textarea.closest(".why-node-card")?.classList.add("why-node-card-animation-stopped");
      this.onProblemInput?.(nodeId);
      const loadButton = document.querySelector('[data-action="load"].action-button-blink');
      if (loadButton && this.shouldAnimateLoadButton?.()) {
        loadButton.classList.remove("action-button-blink");
      }
    }
    this.treeModel.updateNodeText(nodeId, textarea.value);
    this.autosizeTextarea(textarea);
    const layoutChanged = this.syncMeasuredHeight(textarea);
    if (layoutChanged) {
      this.onNodeLayoutChange?.({
        nodeId,
        selectionStart: textarea.selectionStart,
        selectionEnd: textarea.selectionEnd
      });
    }
  }

  handleBlur(event) {
    const nodeId = event.currentTarget.dataset.nodeId;
    if (this.onNodeBlur) {
      this.onNodeBlur(nodeId);
    }
  }

  handleFocus(event) {
    const textarea = event.currentTarget;
    const nodeType = textarea.dataset.type;
    if (nodeType !== "problem") {
      return;
    }
  }

  handleKeyDown(event) {
    if (event.key !== "Enter" || event.isComposing) {
      return;
    }

    if (event.shiftKey) {
      return;
    }

    event.preventDefault();
    const currentNodeId = event.currentTarget.dataset.nodeId;
    if (this.onNodeSubmit) {
      this.onNodeSubmit(currentNodeId);
    }
  }

  handleDeleteClick(event) {
    const nodeId = event.currentTarget.dataset.nodeId;
    if (this.onDeleteRequest) {
      this.onDeleteRequest(nodeId);
    }
  }

  handleFinalizeClick(event) {
    const nodeId = event.currentTarget.dataset.nodeId;
    if (this.onFinalizeRequest) {
      this.onFinalizeRequest(nodeId);
    }
  }

  destroy() {
    this.branchLayerElement.innerHTML = "";
    this.nodeLayerElement.innerHTML = "";
    this.connectionLayerElement.innerHTML = "";
  }
}
