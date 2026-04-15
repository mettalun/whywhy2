export class PcInteraction {
  constructor({ treeModel, editor, confirmation }) {
    this.treeModel = treeModel;
    this.editor = editor;
    this.confirmation = confirmation;
    this.skipBlurNodeId = null;
    this.blurRenderHandle = null;
    this.inputRenderHandle = null;
    this.pendingInputFocus = null;
    this.stoppedProblemAnimationNodeIds = new Set();
    this.loadButtonAnimationStopped = false;
  }

  render(focusNodeId = null, focusSelectionStart = null, focusSelectionEnd = null) {
    this.editor.render({
      focusNodeId,
      focusSelectionStart,
      focusSelectionEnd,
      onNodeSubmit: (nodeId) => this.handleNodeSubmit(nodeId),
      onNodeBlur: (nodeId) => this.handleNodeBlur(nodeId),
      onProblemInput: (nodeId) => this.handleProblemInput(nodeId),
      onNodeLayoutChange: ({ nodeId, selectionStart, selectionEnd }) =>
        this.handleNodeLayoutChange(nodeId, selectionStart, selectionEnd),
      onBranchCreate: (nodeId) => this.handleBranchCreate(nodeId),
      onSiblingBranchCreate: (nodeId) => this.handleSiblingBranchCreate(nodeId),
      onDeleteRequest: (nodeId) => this.handleDeleteRequest(nodeId),
      onFinalizeRequest: (nodeId) => this.handleFinalizeRequest(nodeId),
      shouldAnimateProblemNode: (nodeId) => !this.stoppedProblemAnimationNodeIds.has(nodeId),
      shouldAnimateLoadButton: () => !this.loadButtonAnimationStopped
    });
  }

  handleProblemInput(nodeId) {
    this.stoppedProblemAnimationNodeIds.add(nodeId);
    this.loadButtonAnimationStopped = true;
  }

  stopLoadAndProblemAnimations() {
    this.loadButtonAnimationStopped = true;
    for (const node of this.treeModel.getNodes()) {
      if (node.type === "problem") {
        this.stoppedProblemAnimationNodeIds.add(node.id);
      }
    }
    const problemCards = document.querySelectorAll('.why-node-card[data-type="problem"]');
    for (const card of problemCards) {
      card.classList.add("why-node-card-animation-stopped");
    }
  }

  handleNodeSubmit(nodeId) {
    this.skipBlurNodeId = nodeId;
    const nextNode = this.treeModel.createNextNode(nodeId);
    if (nextNode) {
      this.render(nextNode.id);
      window.setTimeout(() => {
        if (this.skipBlurNodeId === nodeId) {
          this.skipBlurNodeId = null;
        }
      }, 0);
    }
  }

  handleNodeBlur(nodeId) {
    if (this.skipBlurNodeId === nodeId) {
      this.skipBlurNodeId = null;
      return;
    }

    if (this.blurRenderHandle) {
      window.clearTimeout(this.blurRenderHandle);
    }

    this.blurRenderHandle = window.setTimeout(() => {
      this.blurRenderHandle = null;
      const activeElement = document.activeElement;
      if (activeElement?.closest?.(".why-node, .node-delete-button, .node-finalize-button")) {
        return;
      }
      this.render(nodeId);
    }, 0);
  }

  handleNodeLayoutChange(nodeId, selectionStart, selectionEnd) {
    this.pendingInputFocus = { nodeId, selectionStart, selectionEnd };
    if (this.inputRenderHandle) {
      return;
    }

    this.inputRenderHandle = window.requestAnimationFrame(() => {
      this.inputRenderHandle = null;
      const focus = this.pendingInputFocus;
      this.pendingInputFocus = null;
      if (!focus) {
        return;
      }
      this.render(focus.nodeId, focus.selectionStart, focus.selectionEnd);
    });
  }

  handleBranchCreate(nodeId) {
    const branchNode = this.treeModel.createBranchNode(nodeId);
    if (branchNode) {
      this.render(branchNode.id);
    }
  }

  handleSiblingBranchCreate(nodeId) {
    const branchNode = this.treeModel.createSiblingBranchNode(nodeId);
    if (branchNode) {
      this.render(branchNode.id);
    }
  }

  handleDeleteRequest(nodeId) {
    const node = this.treeModel.getNodeSnapshot(nodeId);
    if (!node || !this.treeModel.isTerminalNode(nodeId) || node.id === this.treeModel.rootId) {
      return;
    }

    const confirmed = this.confirmation(
      `\u300c${node.text || "\u3053\u306e\u30ce\u30fc\u30c9"}\u300d\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f`
    );
    if (!confirmed) {
      return;
    }

    if (this.treeModel.deleteNode(nodeId)) {
      const focusId = node.parentId ?? this.treeModel.rootId;
      this.render(focusId);
    }
  }

  handleFinalizeRequest(nodeId) {
    if (this.treeModel.finalizeAsCountermeasure(nodeId)) {
      this.render(nodeId);
    }
  }
}
