const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = "0.0.0.0";
const PORT = Number.parseInt(process.env.PORT || "3001", 10);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const ALLOWED_RATINGS = new Set(["適合", "一部適合", "不適合", "評価不能"]);
const ALLOWED_OVERALL_RATINGS = new Set(["A", "B", "C", "D"]);
const EXPECTED_ITEM_IDS = [
  "Y1",
  "Y2",
  "Y3",
  "Y4",
  "Y5",
  "Y6",
  "Y7",
  "Y8",
  "C1",
  "C2",
  "C3",
  "C4",
  "C5",
  "C6",
  "O1",
  "O2",
  "O3",
  "O4",
  "O5",
  "O6"
];

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

function buildWhyWhyEvaluationSystemPrompt() {
  return `あなたは「なぜなぜ分析」の評価専用AIです。
入力されたなぜなぜ分析を、指定された評価基準に従って厳密に評価してください。

【最重要ルール】
- 出力は必ずJSONのみ
- JSONの前後に説明文、補足、Markdown、コードブロックを一切付けない
- 全評価項目を必ず出力する
- 不明な項目も省略せず "評価不能" とする
- キー名は変更しない
- evaluations は指定順序どおりに出力する

【評価基準】
■要点
Y1 現象やなぜの主語が1つに絞られている
Y2 表現が短く簡潔である
Y3 なぜ①が現象発生部位に焦点を当てている
Y4 原理・原則、物理的・構造的観点で書かれている
Y5 逆読みで論理が通る
Y6 前のなぜが成立しなければ次が成立しない構造になっている
Y7 再発防止につながる要因まで掘り下げられている
Y8 現場・現物で検証可能である

■注意点
C1 不自然ななぜになっていない
C2 誰にでもわかる具体的な言葉を使っている
C3 基準とのズレや事実を追及している
C4 人間の心理面への原因追及になっていない
C5 一時的・場当たり的な説明で止まっていない
C6 推測や思い込みではなく事実ベースである

■運用基準
O1 主語が複数混在していない
O2 曖昧語を避けている
O3 位置・方向・距離など必要情報が具体的である
O4 設備・管理・仕組みなど再発防止観点まで到達している
O5 人の感情・性格・やる気を原因にしていない
O6 検証可能性がある

【評価値】
- 適合
- 一部適合
- 不適合
- 評価不能

【総合評価】
- A: ほぼ基準を満たし、再発防止に有効
- B: 概ね基準を満たすが、一部改善が必要
- C: 基準未達の項目が複数あり、分析の信頼性に課題
- D: なぜなぜ分析として不十分で、再分析が必要

【出力形式】
{
  "result": {
    "overall_rating": "A",
    "summary": "全体要約",
    "strengths": ["良い点1", "良い点2"],
    "issues": ["問題点1", "問題点2"],
    "recommendations": ["改善提案1", "改善提案2"]
  },
  "evaluations": [
    {
      "item_id": "Y1",
      "category": "要点",
      "item_name": "現象やなぜの主語が1つに絞られている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y2",
      "category": "要点",
      "item_name": "表現が短く簡潔である",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y3",
      "category": "要点",
      "item_name": "なぜ①が現象発生部位に焦点を当てている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y4",
      "category": "要点",
      "item_name": "原理・原則、物理的・構造的観点で書かれている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y5",
      "category": "要点",
      "item_name": "逆読みで論理が通る",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y6",
      "category": "要点",
      "item_name": "前のなぜが成立しなければ次が成立しない構造になっている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y7",
      "category": "要点",
      "item_name": "再発防止につながる要因まで掘り下げられている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "Y8",
      "category": "要点",
      "item_name": "現場・現物で検証可能である",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C1",
      "category": "注意点",
      "item_name": "不自然ななぜになっていない",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C2",
      "category": "注意点",
      "item_name": "誰にでもわかる具体的な言葉を使っている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C3",
      "category": "注意点",
      "item_name": "基準とのズレや事実を追及している",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C4",
      "category": "注意点",
      "item_name": "人間の心理面への原因追及になっていない",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C5",
      "category": "注意点",
      "item_name": "一時的・場当たり的な説明で止まっていない",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "C6",
      "category": "注意点",
      "item_name": "推測や思い込みではなく事実ベースである",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O1",
      "category": "運用基準",
      "item_name": "主語が複数混在していない",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O2",
      "category": "運用基準",
      "item_name": "曖昧語を避けている",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O3",
      "category": "運用基準",
      "item_name": "位置・方向・距離など必要情報が具体的である",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O4",
      "category": "運用基準",
      "item_name": "設備・管理・仕組みなど再発防止観点まで到達している",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O5",
      "category": "運用基準",
      "item_name": "人の感情・性格・やる気を原因にしていない",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    },
    {
      "item_id": "O6",
      "category": "運用基準",
      "item_name": "検証可能性がある",
      "rating": "適合",
      "reason": "評価理由",
      "evidence": "入力文中の該当箇所"
    }
  ]
}`;
}

function buildWhyWhyEvaluationUserPrompt(analysisText) {
  return `以下を評価してください。

【評価対象】
${analysisText}`;
}

function getOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.length > 0) {
    return payload.output_text;
  }

  if (!Array.isArray(payload?.output)) {
    return "";
  }

  return payload.output
    .flatMap((item) => item?.content || [])
    .map((content) => content?.text || "")
    .join("");
}

function extractJsonBlock(rawText) {
  const trimmedText = String(rawText || "").trim();
  if (!trimmedText) {
    throw new Error("API応答が空でした。");
  }

  try {
    JSON.parse(trimmedText);
    return trimmedText;
  } catch (_error) {
    // Fall through to bracket scan.
  }

  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < trimmedText.length; index += 1) {
    const character = trimmedText[index];

    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (character === "\\") {
        escaping = true;
      } else if (character === "\"") {
        inString = false;
      }
      continue;
    }

    if (character === "\"") {
      inString = true;
      continue;
    }

    if (character === "{") {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
      continue;
    }

    if (character === "}") {
      depth -= 1;
      if (depth === 0 && startIndex >= 0) {
        return trimmedText.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("API応答からJSONを抽出できませんでした。");
}

function assertStringArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} は配列である必要があります。`);
  }

  for (const item of value) {
    if (typeof item !== "string") {
      throw new Error(`${label} の要素は文字列である必要があります。`);
    }
  }
}

function validateEvaluationPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("評価JSONのルート構造が不正です。");
  }

  if (!payload.result || typeof payload.result !== "object" || Array.isArray(payload.result)) {
    throw new Error("result が存在しないか不正です。");
  }

  if (!ALLOWED_OVERALL_RATINGS.has(payload.result.overall_rating)) {
    throw new Error("overall_rating が想定値ではありません。");
  }

  for (const key of ["summary"]) {
    if (typeof payload.result[key] !== "string") {
      throw new Error(`result.${key} は文字列である必要があります。`);
    }
  }

  assertStringArray(payload.result.strengths, "result.strengths");
  assertStringArray(payload.result.issues, "result.issues");
  assertStringArray(payload.result.recommendations, "result.recommendations");

  if (!Array.isArray(payload.evaluations)) {
    throw new Error("evaluations が配列ではありません。");
  }

  if (payload.evaluations.length !== EXPECTED_ITEM_IDS.length) {
    throw new Error(`evaluations は ${EXPECTED_ITEM_IDS.length} 件必要です。`);
  }

  payload.evaluations.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`evaluations[${index}] の構造が不正です。`);
    }

    if (item.item_id !== EXPECTED_ITEM_IDS[index]) {
      throw new Error(`evaluations[${index}] の item_id が想定順と一致しません。`);
    }

    if (!ALLOWED_RATINGS.has(item.rating)) {
      throw new Error(`evaluations[${index}] の rating が想定値ではありません。`);
    }

    for (const key of ["category", "item_name", "reason", "evidence"]) {
      if (typeof item[key] !== "string") {
        throw new Error(`evaluations[${index}].${key} は文字列である必要があります。`);
      }
    }
  });

  return payload;
}

async function callOpenAI(analysisText) {
  if (!OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY が未設定です。");
    error.statusCode = 500;
    throw error;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.1,
      input: [
        {
          role: "system",
          content: buildWhyWhyEvaluationSystemPrompt()
        },
        {
          role: "user",
          content: buildWhyWhyEvaluationUserPrompt(analysisText)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const error = new Error(`OpenAI request failed: ${response.status} ${errorBody}`);
    error.statusCode = response.status;
    throw error;
  }

  const payload = await response.json();
  const rawResponseText = getOutputText(payload);
  let extractedJsonText = "";
  let evaluationResult;

  try {
    extractedJsonText = extractJsonBlock(rawResponseText);
    evaluationResult = validateEvaluationPayload(JSON.parse(extractedJsonText));
  } catch (error) {
    error.rawResponseText = rawResponseText;
    error.extractedJsonText = extractedJsonText;
    throw error;
  }

  return {
    model: OPENAI_MODEL,
    rawResponseText,
    extractedJsonText,
    result: evaluationResult
  };
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization"
  });
  response.end(JSON.stringify(payload));
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = "";

    request.on("data", (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 1024 * 1024) {
        reject(new Error("リクエスト本文が大きすぎます。"));
      }
    });

    request.on("end", () => resolve(rawBody));
    request.on("error", reject);
  });
}

async function handleEvaluationApi(request, response) {
  let rawResponseText = "";

  try {
    const rawBody = await readRequestBody(request);
    const payload = JSON.parse(rawBody || "{}");
    const analysisText = String(payload.analysisText || "").trim();

    if (!analysisText) {
      sendJson(response, 400, {
        error: "analysisText が空です。"
      });
      return;
    }

    const result = await callOpenAI(analysisText);
    rawResponseText = result.rawResponseText;
    sendJson(response, 200, result);
  } catch (error) {
    const statusCode = error.statusCode && Number.isInteger(error.statusCode) ? error.statusCode : 500;
    sendJson(response, statusCode, {
      error: error.message || "評価APIでエラーが発生しました。",
      rawResponseText: error.rawResponseText || rawResponseText,
      extractedJsonText: error.extractedJsonText || ""
    });
  }
}

function resolveStaticPath(urlPathname) {
  const relativePath = urlPathname === "/" ? "index.html" : urlPathname.replace(/^\/+/, "");
  const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  return path.resolve(__dirname, normalizedPath);
}

function serveStaticFile(urlPathname, response) {
  const filePath = resolveStaticPath(urlPathname);

  if (!filePath.startsWith(__dirname)) {
    sendJson(response, 403, { error: "アクセスできません。" });
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        response.end("Not Found");
        return;
      }

      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Internal Server Error");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
      response.writeHead(200, {
        "content-type": MIME_TYPES[extension] || "application/octet-stream",
        "cache-control": extension === ".html" ? "no-store" : "public, max-age=300"
      });
      response.end(response.req.method === "HEAD" ? undefined : data);
    });
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || `127.0.0.1:${PORT}`}`);

  if (request.method === "OPTIONS" && requestUrl.pathname.startsWith("/api/")) {
    response.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "Content-Type, Authorization",
      "access-control-max-age": "86400"
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/health") {
    sendJson(response, 200, {
      ok: true,
      model: OPENAI_MODEL,
      hasOpenAiKey: Boolean(OPENAI_API_KEY)
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/whywhy/evaluate") {
    await handleEvaluationApi(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(response, 405, { error: "Method Not Allowed" });
    return;
  }

  serveStaticFile(requestUrl.pathname, response);
});

server.listen(PORT, HOST, () => {
  console.log(`WhyWhy Education server listening on http://127.0.0.1:${PORT}`);
});
