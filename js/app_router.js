import { detectDevice } from "./device_detector.js";
import { createPcApp } from "./pc/pc_app.js";
import { createMobileApp } from "./mobile/mobile_app.js";
import { buildWhyWhyAnalysisText, requestWhyWhyEvaluation } from "./evaluation.js";
import { downloadTextFile } from "./core/file_io.js";
import { PRESENTATION_TEST_DATA } from "./presentation_test_data.js";

const PRESENTATION_PASSWORD = "431830";

export class AppRouter {
  constructor(rootElement) {
    this.rootElement = rootElement;
    this.currentDevice = null;
    this.currentApp = null;
    this.currentScreen = "start";
    this.serializedTree = null;
    this.evaluationResult = null;
    this.evaluationMeta = null;
    this.passwordError = "";
  }

  start() {
    this.render();
  }

  destroyCurrentApp() {
    if (this.currentApp && typeof this.currentApp.destroy === "function") {
      this.currentApp.destroy();
    }
    this.currentApp = null;
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  render() {
    this.destroyCurrentApp();
    this.rootElement.innerHTML = "";
    document.body.dataset.screen = this.currentScreen;

    if (this.currentScreen === "start") {
      this.renderStartScreen();
      return;
    }

    if (this.currentScreen === "guidance") {
      this.renderGuidanceScreen();
      return;
    }

    if (this.currentScreen === "evaluation") {
      this.renderEvaluationScreen();
      return;
    }

    this.renderForDevice(detectDevice());
  }

  renderForDevice(nextDevice) {
    document.body.dataset.device = nextDevice;
    this.currentDevice = nextDevice;
    this.currentApp =
      nextDevice === "pc"
        ? createPcApp(this.rootElement, {
            initialSerializedTree: this.serializedTree,
            onEvaluate: (serializedTree) => this.handleEvaluate(serializedTree)
          })
        : createMobileApp(this.rootElement, {
            initialSerializedTree: this.serializedTree,
            onEvaluate: (serializedTree) => this.handleEvaluate(serializedTree)
          });
  }

  renderStartScreen() {
    document.body.dataset.device = detectDevice();
    this.rootElement.innerHTML = `
      <main class="education-screen">
        <section class="education-card education-card-start">
          <img class="education-hero-icon" src="./image/icom512.png" alt="なぜなぜ分析 アイコン">
          <p class="education-subtitle">教育システム</p>
          <h1>なぜなぜ分析</h1>
          <div class="education-password-form">
            <input
              class="education-password-input"
              type="password"
              inputmode="numeric"
              autocomplete="current-password"
              placeholder="パスワードを入力"
              aria-label="パスワード"
              data-password-input
            >
            ${this.passwordError ? `<p class="education-error-message">${this.escapeHtml(this.passwordError)}</p>` : ""}
            <button class="action-button education-primary-button" type="button" data-action="start">送信</button>
          </div>
        </section>
      </main>
    `;

    const passwordInput = this.rootElement.querySelector("[data-password-input]");
    const submitPassword = () => {
      const password = passwordInput.value.trim();
      if (password !== PRESENTATION_PASSWORD) {
        this.passwordError = "パスワードが違います。";
        this.render();
        return;
      }

      this.passwordError = "";
      this.currentScreen = "guidance";
      this.render();
    };

    passwordInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        submitPassword();
      }
    });
    this.rootElement.querySelector('[data-action="start"]').addEventListener("click", submitPassword);
    passwordInput?.focus();
  }

  renderGuidanceScreen() {
    document.body.dataset.device = detectDevice();

    this.rootElement.innerHTML = `
      <main class="education-screen">
        <section class="education-card education-card-guidance">
          <div class="education-card-header">
            <img class="education-card-icon" src="./image/icom64.png" alt="" aria-hidden="true">
            <div>
              <p class="education-subtitle">プレゼン版</p>
              <h1>使い方説明</h1>
            </div>
          </div>
          <p class="education-lead">
            これは、なぜなぜ分析 教育システムのプレゼン版です。<br>
            本システムは、なぜなぜ分析の習得と定着を目的としています。<br>
            「はじめる」ボタンを押すと、テスト用データがダウンロードされ、体験画面へ移動します。<br>
            体験画面では、メイン画面の「読み込み」ボタンを押して、ダウンロードしたテストデータを読み込んでください。<br>
            その後、「評価」ボタンを押すことで、なぜなぜ分析の評価結果が表示されます。<br>
            評価結果は、約1分ほどで表示されます。
          </p>
          <div class="education-action-row">
            <button class="action-button education-primary-button" type="button" data-action="begin">はじめる</button>
          </div>
        </section>
      </main>
    `;

    this.rootElement.querySelector('[data-action="begin"]').addEventListener("click", () => {
      downloadTextFile(JSON.stringify(PRESENTATION_TEST_DATA, null, 2), "test-data.json", "application/json");
      this.serializedTree = null;
      this.evaluationResult = null;
      this.currentScreen = "analysis";
      this.render();
    });
  }

  renderEvaluationScreen() {
    document.body.dataset.device = detectDevice();

    if (!this.evaluationResult) {
      this.currentScreen = "analysis";
      this.render();
      return;
    }

    const summary = this.evaluationResult.result;
    this.rootElement.innerHTML = `
      <main class="education-screen">
        <section class="education-card education-card-evaluation">
          <div class="education-card-header">
            <img class="education-card-icon" src="./image/icom64.png" alt="" aria-hidden="true">
            <div>
              <p class="education-subtitle">評価結果</p>
              <h1>なぜなぜ分析の評価</h1>
            </div>
          </div>

          <section class="evaluation-overview">
            <div class="evaluation-overall">
              <span class="evaluation-overall-label">総合評価</span>
              <span class="evaluation-overall-grade" data-grade="${this.escapeHtml(summary.overall_rating)}">${this.escapeHtml(summary.overall_rating)}</span>
            </div>
            <div class="evaluation-summary-block">
              <h2>summary</h2>
              <p>${this.escapeHtml(summary.summary)}</p>
            </div>
          </section>

          <section class="evaluation-list-grid">
            ${this.renderStringList("strengths", summary.strengths)}
            ${this.renderStringList("issues", summary.issues)}
            ${this.renderStringList("recommendations", summary.recommendations)}
          </section>

          <section class="evaluation-details">
            <h2>evaluations（20項目）</h2>
            <div class="evaluation-table">
              ${this.evaluationResult.evaluations
                .map(
                  (item) => `
                    <article class="evaluation-row">
                      <div class="evaluation-row-heading">
                        <div>
                          <div class="evaluation-item-meta">${this.escapeHtml(item.item_id)} / ${this.escapeHtml(item.category)}</div>
                          <h3>${this.escapeHtml(item.item_name)}</h3>
                        </div>
                        <span class="evaluation-rating-badge" data-rating="${this.escapeHtml(item.rating)}">${this.escapeHtml(item.rating)}</span>
                      </div>
                      <dl class="evaluation-row-body">
                        <div>
                          <dt>reason</dt>
                          <dd>${this.escapeHtml(item.reason)}</dd>
                        </div>
                        <div>
                          <dt>evidence</dt>
                          <dd>${this.escapeHtml(item.evidence)}</dd>
                        </div>
                      </dl>
                    </article>
                  `
                )
                .join("")}
            </div>
          </section>

          <div class="evaluation-footer">
            <button class="action-button" type="button" data-action="back-to-analysis">戻る</button>
          </div>
        </section>
      </main>
    `;

    this.rootElement.querySelector('[data-action="back-to-analysis"]').addEventListener("click", () => {
      this.currentScreen = "analysis";
      this.render();
    });
  }

  renderStringList(title, values) {
    return `
      <section class="evaluation-side-card">
        <h2>${this.escapeHtml(title)}</h2>
        <ul>
          ${values.map((value) => `<li>${this.escapeHtml(value)}</li>`).join("")}
        </ul>
      </section>
    `;
  }

  async handleEvaluate(serializedTree) {
    this.serializedTree = serializedTree;
    const analysisText = buildWhyWhyAnalysisText(serializedTree);
    const payload = await requestWhyWhyEvaluation({ analysisText });
    this.evaluationResult = payload.result;
    this.evaluationMeta = {
      analysisText,
      rawResponseText: payload.rawResponseText,
      extractedJsonText: payload.extractedJsonText,
      model: payload.model
    };
    this.currentScreen = "evaluation";
    this.render();
  }
}
