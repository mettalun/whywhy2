import { TreeModel } from "../core/tree_model.js";
import { downloadJsonFile, parseJsonFileContent, promptJsonFile } from "../core/file_io.js";
import { layoutTree } from "../core/layout_engine.js";
import { renderMobileMapView } from "./mobile_map_view.js";
import { renderMobileNodeEditor } from "./mobile_node_editor.js";
import { createMobileBranchMenu } from "./mobile_branch_menu.js";

export function createMobileApp(
  rootElement,
  {
    initialSerializedTree = null,
    onEvaluate = null
  } = {}
) {
  const treeModel = new TreeModel();
  let selectedNodeId = treeModel.rootId;
  let activeScreen = "map";
  let loadButtonAnimationStopped = false;
  let evaluationInFlight = false;
  let destroyed = false;
  const stoppedProblemAnimationNodeIds = new Set();

  if (initialSerializedTree) {
    try {
      treeModel.replaceFromSerializedTree(initialSerializedTree);
      selectedNodeId = treeModel.rootId;
    } catch (error) {
      window.alert(error.message);
    }
  }

  function stopLoadAndProblemAnimations(nodeId = null) {
    loadButtonAnimationStopped = true;
    if (nodeId) {
      stoppedProblemAnimationNodeIds.add(nodeId);
      return;
    }

    for (const node of treeModel.getNodes()) {
      if (node.type === "problem") {
        stoppedProblemAnimationNodeIds.add(node.id);
      }
    }
  }

  function syncLayoutToModel() {
    const layout = layoutTree(treeModel.getNodes(), treeModel.rootId);
    treeModel.applyNodePositions(layout.nodes);
    return layout;
  }

  async function handleLoad(event) {
    event?.currentTarget?.classList?.remove("action-button-blink");
    stopLoadAndProblemAnimations();
    try {
      const selectedFile = await promptJsonFile();
      if (!selectedFile) {
        return;
      }

      const payload = parseJsonFileContent(selectedFile.text);
      treeModel.replaceFromSerializedTree(payload);
      selectedNodeId = treeModel.rootId;
      activeScreen = "map";
      render();
    } catch (error) {
      window.alert(error.message);
    }
  }

  function handleSave() {
    syncLayoutToModel();
    downloadJsonFile(treeModel.serialize());
  }

  async function handleEvaluate() {
    if (!onEvaluate || evaluationInFlight) {
      return;
    }

    try {
      evaluationInFlight = true;
      render();
      syncLayoutToModel();
      await onEvaluate(treeModel.serialize());
    } catch (error) {
      window.alert(error.message || "評価に失敗しました。");
    } finally {
      evaluationInFlight = false;
      if (!destroyed) {
        render();
      }
    }
  }

  function render() {
    if (activeScreen === "map") {
      const currentLayout = syncLayoutToModel();
      renderMobileMapView(rootElement, {
        layout: currentLayout,
        onLoad: handleLoad,
        onSave: handleSave,
        onEvaluate: handleEvaluate,
        isEvaluating: evaluationInFlight,
        shouldAnimateLoadButton: !loadButtonAnimationStopped,
        shouldAnimateProblemNode: (nodeId) => !stoppedProblemAnimationNodeIds.has(nodeId),
        onNodeSelect: (nodeId) => {
          selectedNodeId = nodeId;
          activeScreen = "editor";
          render();
        },
        onBranchAction: (nodeId) => {
          const branchMenu = createMobileBranchMenu({
            node: treeModel.getNodeSnapshot(nodeId),
            canCreateBranch: treeModel.canCreateBranchFromNode(nodeId),
            onCreateBranch: () => {
              const branchNode = treeModel.createBranchNode(nodeId);
              if (branchNode) {
                selectedNodeId = branchNode.id;
                activeScreen = "editor";
                render();
              }
            },
            onOpenEditor: () => {
              selectedNodeId = nodeId;
              activeScreen = "editor";
              render();
            }
          });

          branchMenu.open();
        },
        canBranchFromNode: (node) => treeModel.canCreateBranchFromNode(node.id)
      });
      return;
    }

    renderMobileNodeEditor(rootElement, {
      treeModel,
      nodeId: selectedNodeId,
      onLoad: handleLoad,
      onSave: handleSave,
      onEvaluate: handleEvaluate,
      isEvaluating: evaluationInFlight,
      shouldAnimateProblemNode: (currentNodeId) => !stoppedProblemAnimationNodeIds.has(currentNodeId),
      onProblemInput: (nodeId) => {
        stopLoadAndProblemAnimations(nodeId);
      },
      onBack: () => {
        activeScreen = "map";
        render();
      },
      onCreateNext: () => {
        stopLoadAndProblemAnimations(selectedNodeId);
        const nextNode = treeModel.createNextNode(selectedNodeId);
        if (nextNode) {
          selectedNodeId = nextNode.id;
          render();
        }
      },
      onCreateBranch: () => {
        const branchNode = treeModel.createSiblingBranchNode(selectedNodeId);
        if (branchNode) {
          selectedNodeId = branchNode.id;
          render();
        }
      },
      onFinalizeCountermeasure: () => {
        if (treeModel.finalizeAsCountermeasure(selectedNodeId)) {
          render();
        }
      },
      onDelete: () => {
        const node = treeModel.getNodeSnapshot(selectedNodeId);
        if (!node || !treeModel.isTerminalNode(selectedNodeId) || node.id === treeModel.rootId) {
          return;
        }

        if (
          window.confirm(
            `\u300c${node.text || "\u3053\u306e\u30ce\u30fc\u30c9"}\u300d\u3092\u524a\u9664\u3057\u307e\u3059\u304b\uff1f`
          )
        ) {
          const focusId = node.parentId ?? treeModel.rootId;
          if (treeModel.deleteNode(selectedNodeId)) {
            selectedNodeId = focusId;
            activeScreen = "map";
            render();
          }
        }
      }
    });
  }

  render();

  return {
    destroy() {
      destroyed = true;
      rootElement.__mobileEditorCleanup?.();
      rootElement.innerHTML = "";
    }
  };
}
