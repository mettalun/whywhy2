import { layoutTree } from "./layout_engine.js";
import { buildDatedWhywhyFilename } from "./file_io.js";

const EXPORT_ERROR_MESSAGE = "\u0050\u0044\u0046\u51fa\u529b\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002";
const ROW_TOLERANCE = 10;
const PRINT_MARGIN_MM = 4;
const PAGE_PADDING_LEFT = 12;
const PAGE_PADDING_TOP = 12;
const PAGE_PADDING_RIGHT = 12;
const PAGE_PADDING_BOTTOM = 12;
const PAPER_WIDTH_PX = Math.floor((400 / 25.4) * 96);
const PAPER_HEIGHT_PX = Math.floor((277 / 25.4) * 96);
const PRINT_MARGIN_PX = Math.floor((PRINT_MARGIN_MM / 25.4) * 96);
const PAGE_CONTENT_WIDTH = PAPER_WIDTH_PX - PRINT_MARGIN_PX * 2;
const PAGE_INNER_HEIGHT = PAPER_HEIGHT_PX - PRINT_MARGIN_PX * 2;
const PRINT_COLUMN_COUNT = 7;
const PRINT_HORIZONTAL_GAP = 20;
const PAGE_BREAK_SAFETY_PX = 28;
const NODE_RENDER_BUFFER_PX = 4;
const PAGE_CONNECTION_BLEED_PX = 240;
const NODE_TEXT_ANCHOR_OFFSET = 56;
const WHY_LEVEL_COLORS = {
  1: "#fff4d6",
  2: "#f8ebc6",
  3: "#f2dfb1",
  4: "#ebd198",
  5: "#e3bf7f"
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getNodeBackground(node) {
  if (node.type === "problem") {
    return "#f6c7d4";
  }

  if (node.type === "countermeasure") {
    return "#cfe7ff";
  }

  return WHY_LEVEL_COLORS[node.level] ?? WHY_LEVEL_COLORS[5];
}

function buildPrintNodeInnerMarkup(node) {
  const labelMarkup = node.displayLabel
    ? `<div class="print-node-label">${escapeHtml(node.displayLabel)}</div>`
    : "";
  const textMarkup = escapeHtml(node.printText ?? "").replaceAll("\n", "<br>");

  return `
    ${labelMarkup}
    <div class="print-node-body">${textMarkup}</div>
  `;
}

function buildConnections(nodes) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const connections = [];

  for (const node of nodes) {
    if (node.nextId && nodeMap.has(node.nextId)) {
      connections.push({
        fromNode: node,
        toNode: nodeMap.get(node.nextId),
        isBranch: false
      });
    }

    for (const childId of node.children) {
      if (nodeMap.has(childId)) {
        connections.push({
          fromNode: node,
          toNode: nodeMap.get(childId),
          isBranch: true
        });
      }
    }
  }

  return connections;
}

function getPageContentHeight(headerHeight) {
  return Math.max(0, PAGE_INNER_HEIGHT - Math.ceil(headerHeight));
}

function getElementOuterHeight(element) {
  if (!element) {
    return 0;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  const marginTop = Number.parseFloat(style.marginTop) || 0;
  const marginBottom = Number.parseFloat(style.marginBottom) || 0;
  return Math.ceil(rect.height + marginTop + marginBottom);
}

function buildMeasurementNodeMarkup(nodes, metrics) {
  let measurementTop = PAGE_PADDING_TOP;

  return nodes
    .map((node) => {
      const top = measurementTop;
      measurementTop += metrics.nodeHeight + metrics.verticalGap;

      return `
        <div
          class="print-node node-box"
          data-measure-node-id="${escapeHtml(node.id)}"
          style="
            left:${PAGE_PADDING_LEFT}px;
            top:${top}px;
            width:${metrics.nodeWidth}px;
            min-height:${metrics.nodeHeight}px;
            background:${getNodeBackground(node)};
          "
        >
          ${buildPrintNodeInnerMarkup(node)}
        </div>
      `;
    })
    .join("");
}

function measurePrintLayout(nodes, metrics, title) {
  const measurementHost = document.createElement("div");
  measurementHost.setAttribute("aria-hidden", "true");
  measurementHost.style.position = "absolute";
  measurementHost.style.left = "-100000px";
  measurementHost.style.top = "0";
  measurementHost.style.width = `${PAGE_CONTENT_WIDTH}px`;
  measurementHost.style.visibility = "hidden";
  measurementHost.style.pointerEvents = "none";

  const canvasWidth = PAGE_CONTENT_WIDTH;
  const canvasHeight =
    PAGE_PADDING_TOP +
    PAGE_PADDING_BOTTOM +
    nodes.length * (metrics.nodeHeight + metrics.verticalGap) +
    NODE_RENDER_BUFFER_PX;

  measurementHost.innerHTML = `
    <div class="print-container print-sheet">
      <section class="print-page" style="width:${PAGE_CONTENT_WIDTH}px; overflow:visible;">
        <div class="print-page-inner">
          <div class="print-page-header print-header">
            <div class="print-title">${escapeHtml(title)}</div>
            <div class="print-page-number">Page 1</div>
          </div>
          <div
            class="print-page-canvas print-scene"
            style="
              width:${canvasWidth}px;
              height:${canvasHeight}px;
              overflow:visible;
            "
          >
            <div
              class="print-page-zoom"
              style="
                width:${canvasWidth}px;
                height:${canvasHeight}px;
              "
            >
              <div class="print-page-nodes">
                ${buildMeasurementNodeMarkup(nodes, metrics)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `;

  document.body.appendChild(measurementHost);

  try {
    const headerElement = measurementHost.querySelector(".print-page-header");
    const headerHeight = getElementOuterHeight(headerElement);
    const measuredElements = new Map(
      [...measurementHost.querySelectorAll("[data-measure-node-id]")].map((element) => [
        element.getAttribute("data-measure-node-id"),
        element
      ])
    );
    const measuredNodes = nodes.map((node) => {
      const nodeElement = measuredElements.get(node.id);
      const measuredHeight = nodeElement ? Math.ceil(nodeElement.getBoundingClientRect().height) : metrics.nodeHeight;
      return {
        ...node,
        height: Math.max(metrics.nodeHeight, measuredHeight)
      };
    });

    return {
      headerHeight,
      nodes: measuredNodes
    };
  } finally {
    measurementHost.remove();
  }
}

function buildPrintMetrics(layoutMetrics) {
  const usableWidth = PAGE_CONTENT_WIDTH - PAGE_PADDING_LEFT - PAGE_PADDING_RIGHT;
  const totalGap = PRINT_HORIZONTAL_GAP * (PRINT_COLUMN_COUNT - 1);
  const nodeWidth = Math.floor((usableWidth - totalGap) / PRINT_COLUMN_COUNT);

  return {
    ...layoutMetrics,
    nodeWidth,
    horizontalGap: PRINT_HORIZONTAL_GAP
  };
}

function prepareNodesForPrint(layout, printMetrics, title) {
  const positionedNodes = layout.nodes.map((node) => ({
    ...node,
    x: node.level * (printMetrics.nodeWidth + printMetrics.horizontalGap),
    width: printMetrics.nodeWidth
  }));

  const measurement = measurePrintLayout(positionedNodes, printMetrics, title);
  return {
    headerHeight: measurement.headerHeight,
    nodes: measurement.nodes
  };
}

function buildFlowRows(rows, metrics) {
  let currentTop = 0;

  return rows.map((row) => {
    const rowAnchorOffsets = row.nodes.map((node) => Number(node.anchorOffset ?? NODE_TEXT_ANCHOR_OFFSET));
    const rowHeights = row.nodes.map((node) => Number(node.height || metrics.nodeHeight));
    const rowMaxAbove = Math.max(...rowAnchorOffsets);
    const rowMaxBelow = Math.max(...rowHeights.map((height, index) => height - rowAnchorOffsets[index]));
    const rowHeight = Math.max(metrics.nodeHeight, rowMaxAbove + rowMaxBelow);
    const rowAnchorY = currentTop + rowMaxAbove;

    const nextRow = {
      ...row,
      top: rowAnchorY - rowMaxAbove,
      anchorY: rowAnchorY,
      height: rowHeight,
      bottom: currentTop + rowHeight
    };

    currentTop += rowHeight + metrics.verticalGap;
    return nextRow;
  });
}

function groupRows(nodes, metrics) {
  const sortedNodes = [...nodes].sort((left, right) => {
    const leftAnchorY = left.anchorY ?? left.y;
    const rightAnchorY = right.anchorY ?? right.y;
    if (Math.abs(leftAnchorY - rightAnchorY) < ROW_TOLERANCE) {
      return left.x - right.x;
    }

    return leftAnchorY - rightAnchorY;
  });

  const rows = [];

  for (const node of sortedNodes) {
    const currentRow = rows[rows.length - 1];
    const nodeAnchorY = node.anchorY ?? node.y;

    if (!currentRow || Math.abs(nodeAnchorY - currentRow.anchorY) >= ROW_TOLERANCE) {
      rows.push({
        y: node.y,
        anchorY: nodeAnchorY,
        nodes: [node]
      });
      continue;
    }

    currentRow.nodes.push(node);
    currentRow.y = Math.min(currentRow.y, node.y);
    currentRow.anchorY = Math.min(currentRow.anchorY, nodeAnchorY);
  }

  return rows
    .map((row, index) => {
      row.nodes.sort((left, right) => left.x - right.x);
      const rowBottom = Math.max(...row.nodes.map((node) => node.y + (node.height ?? metrics.nodeHeight)));
      const nextRow = rows[index + 1] ?? null;
      const nextRowY = nextRow ? nextRow.y : rowBottom;
      const rowHeight = nextRow ? Math.max(rowBottom - row.y, nextRowY - row.y) : rowBottom - row.y;

      return {
        y: row.y,
        anchorY: row.anchorY,
        height: rowHeight,
        nodes: row.nodes
      };
    })
    .sort((left, right) => left.y - right.y);
}

function paginateRows(rows, maxPageHeight) {
  const pages = [];
  let currentPageRows = [];
  let currentPageStart = 0;
  let currentPageBottom = 0;

  for (const row of rows) {
    const rowBottom = Math.max(
      row.bottom ?? row.top + row.height,
      ...row.nodes.map((node) => (node.printY ?? row.top) + (node.height ?? 0) + NODE_RENDER_BUFFER_PX)
    );

    if (currentPageRows.length === 0) {
      currentPageRows.push(row);
      currentPageStart = row.top;
      currentPageBottom = rowBottom;
      continue;
    }

    const nextPageBottom = Math.max(currentPageBottom, rowBottom);
    const nextPageHeight = nextPageBottom - currentPageStart;

    if (nextPageHeight > maxPageHeight) {
      pages.push(currentPageRows);
      currentPageRows = [];
      currentPageStart = 0;
      currentPageBottom = 0;
    }

    if (currentPageRows.length === 0) {
      currentPageRows.push(row);
      currentPageStart = row.top;
      currentPageBottom = rowBottom;
      continue;
    }

    currentPageRows.push(row);
    currentPageBottom = nextPageBottom;
  }

  if (currentPageRows.length > 0) {
    pages.push(currentPageRows);
  }

  return pages
    .filter((pageRows) => pageRows.length > 0 && pageRows.some((row) => row.nodes.length > 0))
    .map((pageRows) => {
      const pageNodes = pageRows.flatMap((row) => row.nodes);
      const pageStartY = Math.min(...pageRows.map((row) => row.top));
      const pageBottomY = Math.max(
        ...pageRows.map((row) =>
          Math.max(
            row.bottom ?? row.top + row.height,
            ...row.nodes.map((node) => (node.printY ?? 0) + (node.height ?? 0) + NODE_RENDER_BUFFER_PX)
          )
        )
      );
      const minNodeLeft = Math.min(...pageNodes.map((node) => node.x));
      const maxNodeRight = Math.max(...pageNodes.map((node) => node.x + (node.width ?? 220)));

      return {
        rows: pageRows,
        pageNodes,
        pageStartY,
        pageBottomY,
        pageHeight: pageBottomY - pageStartY,
        minNodeLeft,
        maxNodeRight
      };
    });
}

function getLocalX(node, page) {
  return node.x - page.minNodeLeft + PAGE_PADDING_LEFT;
}

function getLocalY(node, page) {
  return node.printY - page.pageStartY + PAGE_PADDING_TOP;
}

function getRowAnchorY(node, page, metrics) {
  const nodeHeight = node.height ?? metrics.nodeHeight;
  return getLocalY(node, page) + Math.min(nodeHeight - 20, NODE_TEXT_ANCHOR_OFFSET);
}

function getPageConnectionTop(page) {
  return -PAGE_CONNECTION_BLEED_PX;
}

function getPageConnectionBottom(page) {
  return page.canvasHeight + PAGE_CONNECTION_BLEED_PX;
}

function buildPathElement(pathData, isBranch) {
  return `
    <path
      d="${pathData}"
      fill="none"
      stroke="${isBranch ? "#8d7b70" : "#7b6c62"}"
      stroke-width="${isBranch ? 2 : 2.5}"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  `;
}

function buildPageConnections(pages, metrics) {
  const pageByNodeId = new Map();
  const pageNodeIdsByIndex = new Map();

  pages.forEach((page, pageIndex) => {
    const ids = new Set(page.pageNodes.map((node) => node.id));
    pageNodeIdsByIndex.set(pageIndex, ids);
    page.pageNodes.forEach((node) => {
      pageByNodeId.set(node.id, pageIndex);
    });
  });

  const allNodes = pages.flatMap((page) => page.pageNodes);
  const pathsByPage = new Map(pages.map((_, index) => [index, []]));

  for (const { fromNode, toNode, isBranch } of buildConnections(allNodes)) {
    const fromPageIndex = pageByNodeId.get(fromNode.id);
    const toPageIndex = pageByNodeId.get(toNode.id);
    if (fromPageIndex === undefined || toPageIndex === undefined) continue;

    const fromPage = pages[fromPageIndex];
    const toPage = pages[toPageIndex];
    const startX = getLocalX(fromNode, fromPage) + metrics.nodeWidth;
    const startY = getRowAnchorY(fromNode, fromPage, metrics);
    const endX = getLocalX(toNode, toPage);
    const endY = getRowAnchorY(toNode, toPage, metrics);
    const jointOffset = Math.max(18, Math.min(metrics.horizontalGap * 0.28, 42));
    const jointX = isBranch ? Math.max(startX + 12, endX - jointOffset) : endX;
    const fromPageBottomY = getPageConnectionBottom(fromPage);
    const toPageTopY = getPageConnectionTop(toPage);

    if (fromPageIndex === toPageIndex) {
      const pathData = isBranch
        ? `M ${startX} ${startY} L ${jointX} ${startY} L ${jointX} ${endY} L ${endX} ${endY}`
        : `M ${startX} ${startY} L ${endX} ${startY}`;
      pathsByPage.get(fromPageIndex).push(buildPathElement(pathData, isBranch));
      continue;
    }

    const downPath = isBranch
      ? `M ${startX} ${startY} L ${jointX} ${startY} L ${jointX} ${fromPageBottomY}`
      : `M ${startX} ${startY} L ${endX} ${startY} L ${endX} ${fromPageBottomY}`;
    pathsByPage.get(fromPageIndex).push(buildPathElement(downPath, isBranch));

    const upLineX = isBranch ? jointX : endX;
    const upPath = isBranch
      ? `M ${upLineX} ${toPageTopY} L ${upLineX} ${endY} L ${endX} ${endY}`
      : `M ${upLineX} ${toPageTopY} L ${upLineX} ${endY}`;
    pathsByPage.get(toPageIndex).push(buildPathElement(upPath, isBranch));
  }

  return pathsByPage;
}

function buildPageRows(page) {
  return page.rows
    .map((row) => {
      const localRowTop = row.top - page.pageStartY + PAGE_PADDING_TOP;
      const localRowHeight = row.height;

      return `
        <div
          class="print-row"
          style="
            top:${localRowTop}px;
            height:${localRowHeight}px;
          "
        ></div>
      `;
    })
    .join("");
}

function buildPageNodes(page, metrics) {
  return page.pageNodes
    .map((node) => {
      return `
        <div
          class="print-node node-box"
          style="
            left:${getLocalX(node, page)}px;
            top:${getLocalY(node, page)}px;
            width:${metrics.nodeWidth}px;
            min-height:${node.height}px;
            background:${getNodeBackground(node)};
          "
        >
          ${buildPrintNodeInnerMarkup(node)}
        </div>
      `;
    })
    .join("");
}

function buildPrintableMarkup(layout, title) {
  const printMetrics = buildPrintMetrics(layout.metrics);
  const preparedLayout = prepareNodesForPrint(layout, printMetrics, title);
  const preparedNodes = preparedLayout.nodes;
  const pageContentHeight = getPageContentHeight(preparedLayout.headerHeight);
  const globalMinNodeLeft = Math.min(...preparedNodes.map((node) => node.x));
  const globalMaxNodeRight = Math.max(...preparedNodes.map((node) => node.x + node.width));
  const rows = buildFlowRows(groupRows(preparedNodes, layout.metrics), layout.metrics).map((row) => ({
    ...row,
    nodes: row.nodes.map((node) => ({
      ...node,
      printY: (row.anchorY ?? row.top) - (node.anchorOffset ?? NODE_TEXT_ANCHOR_OFFSET)
    }))
  }));
  const maxPageHeight = Math.max(
    printMetrics.nodeHeight,
    pageContentHeight - PAGE_PADDING_TOP - PAGE_PADDING_BOTTOM - PAGE_BREAK_SAFETY_PX
  );
  const pages = paginateRows(rows, maxPageHeight);
  const normalizedPages = pages.map((page) => {
    const canvasWidth = globalMaxNodeRight - globalMinNodeLeft + PAGE_PADDING_LEFT + PAGE_PADDING_RIGHT;
    const requiredCanvasHeight = Math.max(
      page.pageHeight + PAGE_PADDING_TOP + PAGE_PADDING_BOTTOM + NODE_RENDER_BUFFER_PX,
      printMetrics.nodeHeight + PAGE_PADDING_TOP + PAGE_PADDING_BOTTOM + NODE_RENDER_BUFFER_PX
    );
    const canvasHeight = Math.max(pageContentHeight, requiredCanvasHeight);

    return {
      ...page,
      minNodeLeft: globalMinNodeLeft,
      maxNodeRight: globalMaxNodeRight,
      canvasWidth,
      canvasHeight
    };
  });
  const pageConnections = buildPageConnections(normalizedPages, printMetrics);

  return normalizedPages
    .map((page, pageIndex) => {
      if (page.pageNodes.length === 0) {
        return "";
      }

      return `
        <section class="print-page">
          <div class="print-page-inner">
            <div class="print-page-header print-header">
              <div class="print-title">${escapeHtml(title)}</div>
              <div class="print-page-number">Page ${pageIndex + 1}</div>
            </div>
            <div
              class="print-page-canvas print-scene"
              style="
                width:${page.canvasWidth}px;
                height:${page.canvasHeight}px;
              "
            >
              <div
                class="print-page-zoom"
                style="
                  width:${page.canvasWidth}px;
                  height:${page.canvasHeight}px;
                  transform-origin:top left;
                "
              >
                <svg
                  class="print-page-lines print-svg"
                  width="${page.canvasWidth}"
                  height="${page.canvasHeight + PAGE_CONNECTION_BLEED_PX * 2}"
                  viewBox="0 ${-PAGE_CONNECTION_BLEED_PX} ${page.canvasWidth} ${page.canvasHeight + PAGE_CONNECTION_BLEED_PX * 2}"
                  style="top:${-PAGE_CONNECTION_BLEED_PX}px;"
                  aria-hidden="true"
                >
                  ${(pageConnections.get(pageIndex) || []).join("")}
                </svg>
                ${buildPageRows(page)}
                <div class="print-page-nodes">
                  ${buildPageNodes(page, printMetrics)}
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");
}

function buildPrintShell(markup) {
  return `
    <div class="print-container print-sheet">
      ${markup}
    </div>
  `;
}

function cleanupPrintMode(printRoot, cleanupRef) {
  document.body.classList.remove("print-mode");
  printRoot.hidden = true;
  printRoot.innerHTML = "";
  window.removeEventListener("afterprint", cleanupRef);
}

function renumberRenderedPages(printRoot) {
  const pages = [...printRoot.querySelectorAll(".print-page")];

  pages.forEach((page, index) => {
    const pageNumber = page.querySelector(".print-page-number");
    if (pageNumber) {
      pageNumber.textContent = `Page ${index + 1}`;
    }
  });
}

function removeEmptyRenderedPages(printRoot) {
  const pages = [...printRoot.querySelectorAll(".print-page")];

  for (const page of pages) {
    const visibleNodes = [...page.querySelectorAll(".print-node, .node-box")].filter(
      (node) => node.textContent.trim().length > 0
    );
    const hasNodes = visibleNodes.length > 0;

    if (!hasNodes) {
      page.remove();
    }
  }

  renumberRenderedPages(printRoot);
}

export function exportTreeToPdf(treeModel, options = {}) {
  const { title = "WhyWhy Sheet" } = options;
  const printRoot = document.getElementById("print-root");

  if (!printRoot) {
    window.alert(EXPORT_ERROR_MESSAGE);
    return;
  }

  let cleanupRef = null;
  const previousTitle = document.title;

  try {
    const exportNodes = treeModel.getNodes().map((node) => ({
      ...node,
      displayLabel: treeModel.getDisplayLabel(node.id),
      printText: treeModel.getEditableText(node.id)
    }));
    const layout = layoutTree(exportNodes, treeModel.rootId);
    treeModel.applyNodePositions(layout.nodes);
    const printableMarkup = buildPrintableMarkup(layout, title);

    if (!printableMarkup.trim()) {
      throw new Error("No printable pages generated.");
    }

    printRoot.innerHTML = buildPrintShell(printableMarkup);
    removeEmptyRenderedPages(printRoot);

    const firstPageHasNodes = printRoot.querySelector(".print-page .print-node, .print-page .node-box");
    if (!firstPageHasNodes) {
      printRoot.innerHTML = "";
      throw new Error("No visible printable nodes found.");
    }

    printRoot.hidden = false;
    document.body.classList.add("print-mode");
    document.title = buildDatedWhywhyFilename("pdf");

    cleanupRef = () => {
      document.title = previousTitle;
      cleanupPrintMode(printRoot, cleanupRef);
    };

    window.addEventListener("afterprint", cleanupRef, { once: true });
    window.print();
  } catch (error) {
    if (cleanupRef) {
      window.removeEventListener("afterprint", cleanupRef);
    }

    document.title = previousTitle;
    document.body.classList.remove("print-mode");
    printRoot.hidden = true;
    printRoot.innerHTML = "";
    window.alert(EXPORT_ERROR_MESSAGE);
    console.error(error);
  }
}
