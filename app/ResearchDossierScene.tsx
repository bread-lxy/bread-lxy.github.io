import './research-dossier.css';

/**
 * Non-interactive scenery behind the existing character, navigation and
 * dialogue. Keep the drop wrappers stable for the world-switch timeline;
 * their children own the static paper angles.
 */
export function ResearchDossierScene() {
  return <div className="research-dossier" aria-hidden="true">
    <div className="research-dossier-ground" />
    <div className="research-dossier-register" />
    <div className="research-dossier-index"><span>R / 01</span> RESEARCH ARCHIVE</div>

    <div className="research-drop research-drop-cities" data-research-drop data-drop-order="0" data-record="cities">
      <div className="research-main-paper">
        <div className="research-binder-holes"><i/><i/><i/></div>
        <div className="research-paper-inner">
          <div className="research-paper-head"><span>研究档案 / 01</span><span>CITIES · 2026</span></div>
          <div className="research-paper-rule" />
          <div className="research-paper-reading">
            <div className="research-paper-status">SSCI <span>·</span> JCR Q1</div>
            <div className="research-paper-jcr"><i>Cities</i> 期刊收录与分区 · 2025 JCR 数据</div>
            <h2>住房价格预期中的<br/>赌徒谬误</h2>
            <p className="research-paper-finding">房价上涨 <span>↑</span> / 看涨预期 <span>↓</span></p>
            <p className="research-paper-method">CHFS · Logit / Probit / 2SLS</p>
          </div>
          <figure className="research-paper-photo">
            {/* A pre-sized local WebP is part of the scene's timed paper reveal. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/album/research-housing.webp" alt="" loading="eager" decoding="async" />
            <figcaption>EDITORIAL IMAGE / CHONGQING</figcaption>
          </figure>
          <div className="research-paper-foot"><span>The gambler&apos;s fallacy in housing price expectations: Evidence from China</span><span><i>Cities</i> 171 · 106853 · 2026 / 共同第一作者</span></div>
        </div>
      </div>
    </div>

    <div className="research-drop research-drop-worldquant" data-research-drop data-drop-order="1" data-record="worldquant">
      <div className="research-backtest-record">
        <div className="research-record-head"><span>02 / ALPHA LOG</span><span>WQ BRAIN</span></div>
        <strong>WorldQuant<br/>因子研究</strong>
        <p>3,000+ α <span>/</span> 金奖</p>
        <div className="research-record-tail">BACKTEST / RESEARCH</div>
      </div>
    </div>

    <div className="research-drop research-drop-tennis" data-research-drop data-drop-order="2" data-record="tennis">
      <div className="research-contact-record">
        <div className="research-contact-perforation" />
        <div className="research-record-head"><span>03 / MATCH TRACE</span><span>0 — 1</span></div>
        <strong>网球动量预测</strong>
        <p>Binary Swing <span>/</span> AUC 0.90</p>
        <div className="research-contact-frame" aria-hidden="true"><i>0</i><i>1</i><i>0</i><i>1</i><i>1</i></div>
      </div>
    </div>

    <div className="research-drop research-drop-pricing" data-research-drop data-drop-order="3" data-record="pricing">
      <div className="research-receipt-record">
        <div className="research-record-head"><span>04 / PURCHASE</span><span>RECEIPT</span></div>
        <strong>商超采购与定价</strong>
        <p>32 SKU <span>/</span> Apriori → TOPSIS</p>
        <div className="research-receipt-rule" />
        <small>REPLENISHMENT STUDY</small>
      </div>
    </div>

    <div className="research-mobile-identifier">
      <strong>住房价格预期中的赌徒谬误</strong>
      <span>SSCI · JCR Q1 <i>/ Cities · 2025 JCR 数据</i></span>
    </div>
  </div>;
}

/** The narrow-cover continuation is mounted by the homepage, not the scene. */
export function ResearchDossierContinuation() {
  return <section className="research-continuation" aria-labelledby="research-continuation-title">
    <div className="research-continuation-label"><span>RESEARCH ARCHIVE</span><span>01 — 04 / CONTINUED</span></div>
    <div className="research-continuation-paper">
      <div className="research-continuation-holes" aria-hidden="true"><i/><i/><i/></div>
      <div className="research-continuation-head"><span>研究档案 / 01</span><span><i>Cities</i> 171 · 106853 · 2026</span></div>
      <div className="research-continuation-lead">
        <div>
          <p className="research-continuation-status">SSCI · JCR Q1</p>
          <p className="research-continuation-jcr"><i>Cities</i> 期刊收录与分区 · 2025 JCR 数据</p>
          <h2 id="research-continuation-title">住房价格预期中的<br/>赌徒谬误</h2>
          <p className="research-continuation-finding">房价上涨 ↑ / 看涨预期 ↓</p>
        </div>
        <figure>
          {/* Same locally optimized editorial photograph, below the fold here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/album/research-housing.webp" alt="重庆住宅楼的黑白编辑配图；非论文研究样本" loading="lazy" decoding="async" />
          <figcaption>EDITORIAL IMAGE / CHONGQING</figcaption>
        </figure>
      </div>
      <div className="research-continuation-citation">The gambler&apos;s fallacy in housing price expectations: Evidence from China<br/><span>CHFS · Logit / Probit / 2SLS / 共同第一作者</span></div>
      <div className="research-continuation-register">ADDITIONAL RECORDS / 02—04</div>
      <div className="research-continuation-entry"><span>02 / ALPHA LOG</span><h3>WorldQuant 因子研究</h3><p>3,000+ α / 金奖</p></div>
      <div className="research-continuation-entry"><span>03 / MATCH TRACE</span><h3>网球动量预测</h3><p>Binary Swing / AUC 0.90</p></div>
      <div className="research-continuation-entry"><span>04 / PURCHASE</span><h3>商超采购与定价</h3><p>32 SKU / Apriori → TOPSIS</p></div>
      <div className="research-continuation-end">END OF COVER FILE <span>完整项目请点击首页「进入」</span></div>
    </div>
  </section>;
}
