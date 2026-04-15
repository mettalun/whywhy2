import { renderConnections } from "../core/renderer_svg.js";

const PROBLEM_LABEL = "\u554f\u984c\u30fb\u73fe\u8c61";
const LOAD_LABEL = "\u8aad\u307f\u8fbc\u307f";
const SAVE_LABEL = "\u4fdd\u5b58";
const FOOTER_CAPTION =
  "WhyWhy Sheet\u306f\u3001\u306a\u305c\u306a\u305c\u5206\u6790\u3092\u30d6\u30e9\u30a6\u30b6\u3067\u7121\u6599\u4f5c\u6210\u3067\u304d\u308b\u539f\u56e0\u5206\u6790\u30c4\u30fc\u30eb\u3067\u3059\u3002 " +
  "\u30c9\u30e9\u30c3\u30b0\u64cd\u4f5c\u30675Why\u3092\u6574\u7406\u3001\u7d19\u3088\u308a\u901f\u304f\u66f8\u304d\u76f4\u3057\u30bc\u30ed\u3002 " +
  "PC\u30fb\u30b9\u30de\u30db\u5bfe\u5fdc\u3001\u30a4\u30f3\u30b9\u30c8\u30fc\u30eb\u4e0d\u8981\u3001for PC\u306f PDF\u51fa\u529b\u5bfe\u5fdc\u3002";

function getMobileNodeText(node) {
  const trimmedText = node.text.trim();
  if (trimmedText.length > 0) {
    return node.text;
  }

  if (node.type === "problem") {
    return PROBLEM_LABEL;
  }

  return node.text;
}

function getMobileNodeFontSize(nodeWidth, nodeHeight) {
  const widthBasedSize = nodeWidth * 0.145;
  const heightBasedSize = nodeHeight * 0.3;
  return Math.max(10, Math.min(17, widthBasedSize, heightBasedSize));
}

export function renderMobileMapView(
  rootElement,
  {
    layout,
    onLoad,
    onSave,
    onEvaluate,
    isEvaluating,
    onNodeSelect,
    onBranchAction,
    canBranchFromNode,
    shouldAnimateLoadButton,
    shouldAnimateProblemNode
  }
) {
  const { nodes, metrics } = layout;
  const viewportWidth = Math.max(320, window.innerWidth || document.documentElement.clientWidth || 320);
  const viewportHeight = Math.max(480, window.innerHeight || document.documentElement.clientHeight || 480);
  const horizontalSafeArea =
    (window.visualViewport ? Math.max(0, viewportWidth - window.visualViewport.width) : 0);
  const verticalSafeArea =
    (window.visualViewport ? Math.max(0, viewportHeight - window.visualViewport.height) : 0);
  const shellPadding = Math.min(24, Math.max(14, viewportWidth * 0.04));
  const panelPadding = 18;
  const availableStageWidth = Math.max(
    220,
    viewportWidth - shellPadding * 2 - panelPadding * 2 - horizontalSafeArea
  );
  const previewTopInset = 18;
  const headerReserveHeight = Math.round(viewportHeight * 0.24);
  const footerReserveHeight = 56;
  const availableStageHeight = Math.max(
    220,
    viewportHeight - shellPadding * 2 - headerReserveHeight - footerReserveHeight - verticalSafeArea
  );
  const widthScale = availableStageWidth / metrics.width;
  const heightScale = Math.max(0.12, (availableStageHeight - previewTopInset) / metrics.height);
  const baseScale = Math.min(0.38, widthScale, heightScale);
  const previewWidth = Math.max(220, Math.round(metrics.width * baseScale));
  const previewHeight = Math.max(240, Math.round(metrics.height * baseScale));
  const previewFrameHeight = previewHeight + previewTopInset;
  const stageViewportHeight = Math.min(
    previewFrameHeight,
    Math.max(260, Math.round(window.innerHeight * 0.42))
  );

  rootElement.innerHTML = `
    <main class="app-shell mobile-flow mobile-map-screen">
      <header class="mobile-header">
        <div class="mobile-title-group">
          <img class="mobile-title-icon" src="./image/icom64.png" alt="" aria-hidden="true">
          <h1>WhyWhy Sheet&#12288;<span class="app-title-suffix">for SP</span></h1>
        </div>
        <div class="mobile-toolbar">
          <button class="action-button${shouldAnimateLoadButton ? " action-button-blink" : ""}" type="button" data-action="load">${LOAD_LABEL}</button>
          <button class="action-button" type="button" data-action="save">${SAVE_LABEL}</button>
          <button class="action-button action-button-danger" type="button" data-action="evaluate" ${isEvaluating ? "disabled" : ""}>${isEvaluating ? "評価中..." : "評価"}</button>
        </div>
      </header>
      <section class="mobile-map-panel">
        <div class="mobile-map-stage" style="height:${stageViewportHeight}px;">
          <div class="mobile-map-scaler" style="width:${previewWidth}px;height:${previewFrameHeight}px;">
            <div class="mobile-map-preview" style="width:${previewWidth}px;height:${previewHeight}px; margin-top:${previewTopInset}px;">
              <svg class="mobile-map-lines" aria-hidden="true"></svg>
              <div class="mobile-map-nodes"></div>
            </div>
          </div>
        </div>
      </section>
      <div class="mobile-footer-caption" aria-hidden="true">${FOOTER_CAPTION}</div>
    </main>
  `;

  const stage = rootElement.querySelector(".mobile-map-stage");
  const scaler = rootElement.querySelector(".mobile-map-scaler");
  const preview = rootElement.querySelector(".mobile-map-preview");
  const lineLayer = rootElement.querySelector(".mobile-map-lines");
  const nodeLayer = rootElement.querySelector(".mobile-map-nodes");
  rootElement.querySelector('[data-action="load"]').addEventListener("click", onLoad);
  rootElement.querySelector('[data-action="save"]').addEventListener("click", onSave);
  rootElement.querySelector('[data-action="evaluate"]').addEventListener("click", onEvaluate);

  let zoomScale = 1;
  let pinchState = null;

  function clampZoom(nextZoom) {
    return Math.min(3, Math.max(1, nextZoom));
  }

  function applyZoom(nextZoom) {
    zoomScale = clampZoom(nextZoom);
    scaler.style.width = `${previewWidth * zoomScale}px`;
    scaler.style.height = `${previewFrameHeight * zoomScale}px`;
    preview.style.transform = `scale(${zoomScale})`;
  }

  function getTouchDistance(firstTouch, secondTouch) {
    return Math.hypot(secondTouch.clientX - firstTouch.clientX, secondTouch.clientY - firstTouch.clientY);
  }

  function getTouchCenter(firstTouch, secondTouch) {
    return {
      x: (firstTouch.clientX + secondTouch.clientX) / 2,
      y: (firstTouch.clientY + secondTouch.clientY) / 2
    };
  }

  function startPinch(firstTouch, secondTouch) {
    const stageBounds = stage.getBoundingClientRect();
    const center = getTouchCenter(firstTouch, secondTouch);
    pinchState = {
      distance: getTouchDistance(firstTouch, secondTouch),
      zoomScale,
      anchorX: (stage.scrollLeft + center.x - stageBounds.left) / zoomScale,
      anchorY: (stage.scrollTop + center.y - stageBounds.top) / zoomScale
    };
  }

  function updatePinch(firstTouch, secondTouch) {
    if (!pinchState) {
      startPinch(firstTouch, secondTouch);
      return;
    }

    const nextDistance = getTouchDistance(firstTouch, secondTouch);
    if (nextDistance <= 0) {
      return;
    }

    const center = getTouchCenter(firstTouch, secondTouch);
    const stageBounds = stage.getBoundingClientRect();
    const nextZoom = clampZoom(pinchState.zoomScale * (nextDistance / pinchState.distance));
    applyZoom(nextZoom);
    stage.scrollLeft = pinchState.anchorX * nextZoom - (center.x - stageBounds.left);
    stage.scrollTop = pinchState.anchorY * nextZoom - (center.y - stageBounds.top);
  }

  stage.addEventListener(
    "touchstart",
    (event) => {
      if (event.touches.length === 2) {
        startPinch(event.touches[0], event.touches[1]);
      }
    },
    { passive: true }
  );

  stage.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length !== 2) {
        return;
      }

      event.preventDefault();
      updatePinch(event.touches[0], event.touches[1]);
    },
    { passive: false }
  );

  stage.addEventListener("touchend", (event) => {
    if (event.touches.length < 2) {
      pinchState = null;
    }
  });

  stage.addEventListener("touchcancel", () => {
    pinchState = null;
  });

  applyZoom(1);
  stage.scrollLeft = 0;
  stage.scrollTop = 0;

  renderConnections(lineLayer, nodes, metrics, {
    onBranchSlotClick: onBranchAction,
    canBranchFromNode
  });
  lineLayer.style.transform = `scale(${baseScale})`;
  lineLayer.style.transformOrigin = "top left";
  lineLayer.style.pointerEvents = "all";

  for (const node of nodes) {
    const nodeButton = document.createElement("button");
    nodeButton.className = "mobile-map-node";
    nodeButton.type = "button";
    nodeButton.dataset.type = node.type;
    const renderedNodeWidth = metrics.nodeWidth * baseScale;
    const renderedNodeHeight = metrics.nodeHeight * baseScale;
    if (node.type === "problem" && !shouldAnimateProblemNode?.(node.id)) {
      nodeButton.classList.add("mobile-problem-animation-stopped");
    }
    nodeButton.style.left = `${node.x * baseScale}px`;
    nodeButton.style.top = `${node.y * baseScale}px`;
    nodeButton.style.width = `${renderedNodeWidth}px`;
    nodeButton.style.height = `${renderedNodeHeight}px`;
    nodeButton.style.fontSize = `${getMobileNodeFontSize(renderedNodeWidth, renderedNodeHeight)}px`;
    nodeButton.textContent = getMobileNodeText(node);
    nodeButton.addEventListener("click", () => onNodeSelect(node.id));
    nodeLayer.appendChild(nodeButton);
  }
}
