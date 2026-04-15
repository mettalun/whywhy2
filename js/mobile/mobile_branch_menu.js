function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createMobileBranchMenu({ node, canCreateBranch, onCreateBranch, onOpenEditor }) {
  function close(menuElement) {
    menuElement.remove();
  }

  return {
    open() {
      const canBranch = Boolean(node) && canCreateBranch;
      const menu = document.createElement("div");
      menu.className = "mobile-branch-menu";
      menu.innerHTML = `
        <div class="mobile-branch-backdrop"></div>
        <div class="mobile-branch-sheet">
          <p class="mobile-eyebrow">Branch menu</p>
          <h2>${node ? escapeHtml(node.text) : "Node"}</h2>
          <button class="action-button" type="button" data-action="edit">\u30ce\u30fc\u30c9\u3092\u7de8\u96c6</button>
          <button class="action-button" type="button" data-action="branch" ${canBranch ? "" : "disabled"}>\u5206\u5c90\u3092\u8ffd\u52a0</button>
          ${
            canBranch
              ? ""
              : '<p class="mobile-inline-hint">\u6b21\u306e\u30ce\u30fc\u30c9\u3092\u8ffd\u52a0\u3057\u305f\u3042\u3068\u3067\u3001\u5206\u5c90\u3092\u8ffd\u52a0\u3067\u304d\u307e\u3059\u3002</p>'
          }
          <button class="action-button" type="button" data-action="close">\u9589\u3058\u308b</button>
        </div>
      `;

      menu.querySelector(".mobile-branch-backdrop").addEventListener("click", () => close(menu));
      menu.querySelector('[data-action="close"]').addEventListener("click", () => close(menu));
      menu.querySelector('[data-action="edit"]').addEventListener("click", () => {
        close(menu);
        onOpenEditor();
      });
      menu.querySelector('[data-action="branch"]').addEventListener("click", () => {
        if (!canBranch) {
          return;
        }

        close(menu);
        onCreateBranch();
      });

      document.body.appendChild(menu);
    }
  };
}
