import { TreeModel } from "./core/tree_model.js";

export const WHYWHY_EVALUATION_ITEMS = [
  { item_id: "Y1", category: "要点", item_name: "現象やなぜの主語が1つに絞られている" },
  { item_id: "Y2", category: "要点", item_name: "表現が短く簡潔である" },
  { item_id: "Y3", category: "要点", item_name: "なぜ①が現象発生部位に焦点を当てている" },
  { item_id: "Y4", category: "要点", item_name: "原理・原則、物理的・構造的観点で書かれている" },
  { item_id: "Y5", category: "要点", item_name: "逆読みで論理が通る" },
  { item_id: "Y6", category: "要点", item_name: "前のなぜが成立しなければ次が成立しない構造になっている" },
  { item_id: "Y7", category: "要点", item_name: "再発防止につながる要因まで掘り下げられている" },
  { item_id: "Y8", category: "要点", item_name: "現場・現物で検証可能である" },
  { item_id: "C1", category: "注意点", item_name: "不自然ななぜになっていない" },
  { item_id: "C2", category: "注意点", item_name: "誰にでもわかる具体的な言葉を使っている" },
  { item_id: "C3", category: "注意点", item_name: "基準とのズレや事実を追及している" },
  { item_id: "C4", category: "注意点", item_name: "人間の心理面への原因追及になっていない" },
  { item_id: "C5", category: "注意点", item_name: "一時的・場当たり的な説明で止まっていない" },
  { item_id: "C6", category: "注意点", item_name: "推測や思い込みではなく事実ベースである" },
  { item_id: "O1", category: "運用基準", item_name: "主語が複数混在していない" },
  { item_id: "O2", category: "運用基準", item_name: "曖昧語を避けている" },
  { item_id: "O3", category: "運用基準", item_name: "位置・方向・距離など必要情報が具体的である" },
  { item_id: "O4", category: "運用基準", item_name: "設備・管理・仕組みなど再発防止観点まで到達している" },
  { item_id: "O5", category: "運用基準", item_name: "人の感情・性格・やる気を原因にしていない" },
  { item_id: "O6", category: "運用基準", item_name: "検証可能性がある" }
];

function normalizeNodeText(model, node) {
  const editableText = model.getEditableText(node.id).trim();
  return editableText || "（未入力）";
}

function appendNodeLine(lines, model, node) {
  if (!node) {
    return;
  }

  if (node.type === "problem") {
    lines.push(`現象: ${normalizeNodeText(model, node)}`);
    return;
  }

  const label = node.type === "countermeasure" ? "対策" : model.getDisplayLabel(node.id);
  lines.push(`${label}: ${normalizeNodeText(model, node)}`);
}

function walkTree(lines, nodeMap, model, nodeId) {
  const node = nodeMap.get(nodeId);
  if (!node) {
    return;
  }

  appendNodeLine(lines, model, node);

  if (node.nextId) {
    walkTree(lines, nodeMap, model, node.nextId);
  }

  for (const childId of node.children) {
    walkTree(lines, nodeMap, model, childId);
  }
}

export function buildWhyWhyAnalysisText(serializedTree) {
  const model = TreeModel.createFromSerializedTree(serializedTree);
  const nodes = model.getNodes();
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const lines = [];
  walkTree(lines, nodeMap, model, model.rootId);

  const hasMeaningfulInput = nodes.some((node) => model.getEditableText(node.id).trim().length > 0);
  if (!hasMeaningfulInput) {
    throw new Error("評価対象の入力がありません。現象やなぜを入力してから評価してください。");
  }

  return lines.join("\n");
}

function isRetryableStatus(status) {
  return status === 404 || status === 405 || status === 501;
}

function getEvaluationApiCandidates() {
  const productionApiUrl = "https://api.rq-inn.com/whywhy2/api/whywhy/evaluate";
  const sameOriginRelativeUrl = "./api/whywhy/evaluate";
  const fallbackUrl = "http://127.0.0.1:3001/api/whywhy/evaluate";
  const isLocalEvaluationServer =
    window.location.hostname === "127.0.0.1" && window.location.port === "3001";
  const sameHostPort3001Url = `http://${window.location.hostname}:3001/api/whywhy/evaluate`;

  if (isLocalEvaluationServer) {
    return [sameOriginRelativeUrl];
  }

  if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    return [fallbackUrl];
  }

  if (window.location.protocol === "https:") {
    return [productionApiUrl, sameOriginRelativeUrl];
  }

  return [sameHostPort3001Url, fallbackUrl];
}

async function postEvaluationRequest(url, analysisText) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ analysisText })
  });

  const rawBody = await response.text();
  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch (_error) {
    payload = null;
  }

  window.__whywhyEvaluationDebug = {
    url,
    status: response.status,
    rawBody,
    parsedPayload: payload
  };

  return {
    response,
    rawBody,
    payload
  };
}

export async function requestWhyWhyEvaluation({ analysisText }) {
  const candidates = getEvaluationApiCandidates();
  let lastErrorMessage =
    "評価APIの呼び出しに失敗しました。`node server.js` で評価サーバーを起動してください。";

  for (const url of candidates) {
    try {
      const { response, payload } = await postEvaluationRequest(url, analysisText);

      if (!response.ok) {
        if (isRetryableStatus(response.status) && url !== candidates[candidates.length - 1]) {
          lastErrorMessage = payload?.error || `評価APIが ${response.status} を返しました。`;
          continue;
        }

        throw new Error(payload?.error || "評価APIの呼び出しに失敗しました。");
      }

      return payload;
    } catch (error) {
      if (error instanceof TypeError) {
        lastErrorMessage =
          "評価サーバーへ接続できませんでした。`/Users/mobu/inn-server/codex/20260415_なぜなぜ解析` で `node server.js` を起動してください。";
      } else {
        lastErrorMessage = error.message || lastErrorMessage;
      }
      if (url === candidates[candidates.length - 1]) {
        throw new Error(lastErrorMessage);
      }
    }
  }

  throw new Error(lastErrorMessage);
}
