import { useI18n } from '../i18n';
import { PageHeader } from '../components/ui';

/** Kilder på «Om demoen». Lenketekstene ligger i språkfilene. */
const SOURCES = [
  { key: 'source4', url: 'https://www.finanstilsynet.no/publikasjoner-og-analyser/risiko--og-sarbarhetsanalyse/risiko--og-sarbarhetsanalyse-2026/risiko--og-sarbarhetsanalyse-2026/risiko--og-sarbarhetsanalyse-2026' },
  { key: 'source3', url: 'https://eur-lex.europa.eu/eli/reg/2022/2554/oj' },
  { key: 'source1', url: 'https://www.bankingsupervision.europa.eu/framework/priorities/html/ssm.supervisory_priorities202511.en.html' },
  { key: 'source2', url: 'https://www.bankingsupervision.europa.eu/framework/priorities/html/ssm.supervisory_priorities202412~6f69ad032f.en.html' },
] as const;

export default function AboutPage() {
  const { m } = useI18n();
  const a = m.about;
  return (
    <div className="page page-narrow">
      <PageHeader title={a.title} />
      <section className="card card-notice">
        <p>{m.concept.disclaimer}</p>
        <p>{m.concept.noAdvice}</p>
      </section>
      <section className="prose">
        <h2>{a.whatTitle}</h2>
        <p>{a.what}</p>

        <h2>{a.flowTitle}</h2>
        <ol>
          {a.flow.map((s) => (
            <li key={s.title}>
              <strong>{s.title}:</strong> {s.text}
            </li>
          ))}
        </ol>

        <h2>{a.whyTitle}</h2>
        <p>{a.whyLead}</p>
        <ul>
          {a.why.map((s) => (
            <li key={s.title}>
              <strong>{s.title}.</strong> {s.text}
            </li>
          ))}
        </ul>
        <p>{a.whyEnd}</p>

        <h2>{a.supplierTitle}</h2>
        <ul>
          {a.supplier.map((t) => <li key={t}>{t}</li>)}
        </ul>

        <h2>{a.newTitle}</h2>
        <p>{a.newLead}</p>
        <ul>
          {a.news.map((s) => (
            <li key={s.title}>
              <strong>{s.title}:</strong> {s.text}
            </li>
          ))}
        </ul>

        <h2>{m.scenario.rulesTitle}</h2>
        <ol>
          {m.scenario.rules.map((r) => <li key={r}>{r}</li>)}
        </ol>
        <h2>{a.limitsTitle}</h2>
        <ul>
          {a.limits.map((l) => <li key={l}>{l}</li>)}
        </ul>
        <h2>{a.privacyTitle}</h2>
        <p>{a.privacy}</p>
        <h2>{a.techTitle}</h2>
        <p>{a.tech}</p>
        <h2>{a.sourcesTitle}</h2>
        <ul>
          {SOURCES.map((s) => (
            <li key={s.key}>
              <a href={s.url} rel="noopener noreferrer" target="_blank">
                {a[s.key]}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
