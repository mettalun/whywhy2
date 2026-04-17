const JSON_MIME_TYPE = "application/json";
const TEXT_MIME_TYPE = "text/plain;charset=utf-8";

function getCurrentDateStamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function buildDatedWhywhyFilename(extension) {
  const ext = String(extension || "").replace(/^\./, "");
  return `${getCurrentDateStamp()}-whywhy-sheet.${ext}`;
}

export function buildDatedWhywhyDataFilename() {
  return `${getCurrentDateStamp()}-whywhy-sheet-data.json`;
}

function createHiddenFileInput() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,.js,application/json,text/javascript,application/javascript,text/plain";
  input.className = "sr-only";
  return input;
}

export function downloadJsonFile(payload, filename = buildDatedWhywhyDataFilename()) {
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: JSON_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadTextFile(text, filename, mimeType = TEXT_MIME_TYPE) {
  const blob = new Blob([String(text)], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function promptJsonFile() {
  return new Promise((resolve, reject) => {
    const input = createHiddenFileInput();
    let settled = false;
    let changeHandled = false;
    let focusTimerId = null;

    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      if (focusTimerId !== null) {
        window.clearTimeout(focusTimerId);
      }
      input.remove();
    };

    const finish = (callback) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      callback();
    };

    const handleWindowFocus = () => {
      if (focusTimerId !== null) {
        window.clearTimeout(focusTimerId);
      }

      // Mobile browsers, especially iOS Safari, can take noticeably longer
      // to dispatch the change event after the picker closes.
      focusTimerId = window.setTimeout(() => {
        if (
          !settled &&
          !changeHandled &&
          document.visibilityState === "visible" &&
          (!input.files || input.files.length === 0)
        ) {
          finish(() => resolve(null));
        }
      }, 1500);
    };

    input.addEventListener("cancel", () => {
      finish(() => resolve(null));
    });

    input.addEventListener("change", async () => {
      changeHandled = true;
      const [file] = Array.from(input.files ?? []);

      if (!file) {
        finish(() => resolve(null));
        return;
      }

      try {
        const text = await file.text();
        finish(() =>
          resolve({
            name: file.name,
            text
          })
        );
      } catch (error) {
        finish(() =>
          reject(new Error("JSON\u30d5\u30a1\u30a4\u30eb\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002"))
        );
      }
    });

    document.body.appendChild(input);
    window.addEventListener("focus", handleWindowFocus, { once: false });
    input.click();
  });
}

export function parseJsonFileContent(fileContent) {
  try {
    const normalizedContent = fileContent.replace(/^\uFEFF/, "");
    return JSON.parse(normalizedContent);
  } catch (error) {
    throw new Error("JSON\u5f62\u5f0f\u304c\u4e0d\u6b63\u3067\u3059\u3002");
  }
}
