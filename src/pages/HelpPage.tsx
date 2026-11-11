import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n';
import { navigate, type RouteName } from '../router';
import { PageHeader } from '../components/ui';
import { SCENES, sceneFacts, type StoryId } from './helpScenes';

/** Scenarioene på hjelpesiden, med siden i appen hvert steg viser. */
const STORIES: { id: StoryId; routes: RouteName[] }[] = [
  // Samme fire steg som hovedflyten i demoen: Scenario, Påvirkning, Hendelsesrom, Rapport.
  { id: 'incident', routes: ['scenario', 'analysis', 'incident', 'report'] },
  { id: 'change', routes: ['changes', 'changes', 'changes', 'changes'] },
  { id: 'suppliers', routes: ['overview', 'suppliers', 'suppliers', 'suppliers'] },
  { id: 'exercise', routes: ['scenario', 'incident', 'exercises', 'exercises'] },
];

/** Kilder for påstandene i «Nytte». Lenketekstene ligger i språkfilene. */
const SOURCES = {
  incident: 'https://www.finanstilsynet.no/nyhetsarkiv/rundskriv/2025/hendelsesrapportering-etter-dora/',
  ros: 'https://www.finanstilsynet.no/publikasjoner-og-analyser/risiko--og-sarbarhetsanalyse/risiko--og-sarbarhetsanalyse-2026/risiko--og-sarbarhetsanalyse-2026/risiko--og-sarbarhetsanalyse-2026',
  register: 'https://www.finanstilsynet.no/rapportering/fellesrapporteringer/dora-rapportering-av-register-over-ikt-tjenesteavtaler-roi/',
} as const;

/** Tempo for teksten som rulles ut: én bokstav av gangen, omtrent 22 tegn i sekundet, uten pauser. */
const CHAR_S = 0.045;
const TEXT_START_S = 0.3;
/** Skjermbildet spilles i rolig tempo: tidene i skjermbildene ganges med SLOW. */
const SLOW = 1.7;
/** Tid fra skjermbildet kommer fram til første handling, så pekeren rekker å komme inn. */
const LEAD_S = 1.2;
/** Tid fra skjermbildet kommer fram til animasjonen i det er ferdig. */
const SCENE_S = LEAD_S + 6.5 * SLOW;
const COUNTDOWN_MS = 10000;

type Phase = 'step' | 'countdown' | 'done';

const words = (s: string) => s.split(/\s+/).filter(Boolean);
/** Antall tegn som rulles ut, mellomrom mellom ordene medregnet. */
const rollLength = (s: string) => words(s).join(' ').length;
const delay = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

/**
 * Pekeren i skjermbildet. Den finner stedene som skal klikkes (data-hx-at, tid i sekunder) og glir rolig
 * fra sted til sted, med et lite trykk og en ring ved hvert klikk. Bevegelsen er en Web Animation, så den
 * fryses og fortsetter sammen med resten når brukeren trykker Pause og Start.
 */
type Clock = { elapsed: number; playing: boolean };

function Pointer({ start, clock }: { start: number; clock: { current: Clock } }) {
  const ref = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const stage = el?.parentElement;
    if (!el || !stage || typeof el.animate !== 'function') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let anims: Animation[] = [];
    let frame = 0;
    let tries = 0;
    let lastKey = '';
    let stable = 0;

    /**
     * Finner stedene pekeren skal klikke. Et sted kan peke på et annet element med data-hx-target
     * (for eksempel en boks i kartet, som tegnes litt etter at skjermbildet vises). Gir null hvis
     * et slikt element ikke finnes ennå.
     */
    const measure = () => {
      const box = stage.getBoundingClientRect();
      const stops: { x: number; y: number; t: number }[] = [];
      let missing = false;
      stage.querySelectorAll<HTMLElement>('[data-hx-at]').forEach((t) => {
        const target = t.dataset.hxTarget ? stage.querySelector<HTMLElement>(t.dataset.hxTarget) : t;
        if (!target) return void (missing = true);
        const r = target.getBoundingClientRect();
        if (!r.width) return void (missing = true);
        const x = r.left - box.left + Math.min(r.width * 0.6, r.width - 8);
        const y = r.top - box.top + r.height * 0.65;
        for (const at of (t.dataset.hxAt ?? '').split(',').map(Number).filter((n) => !Number.isNaN(n))) {
          stops.push({ x, y, t: LEAD_S + at * SLOW });
        }
      });
      return missing ? null : { box, stops, delayed: stage.querySelector('[data-hx-target]') !== null };
    };

    let old: Animation[] = [];
    const create = (late: boolean) => {
      const found = measure();
      // Steder i kart o.l. tegnes og plasseres litt etter at skjermbildet vises: vent til de har ligget stille en stund.
      if (found?.delayed) {
        const key = found.stops.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join('|');
        stable = key === lastKey ? stable + 1 : 0;
        lastKey = key;
      }
      if (!found || (found.delayed && stable < 12)) {
        // Prøv igjen litt senere, i høyst fem sekunder.
        if (tries++ < 300) frame = requestAnimationFrame(() => create(true));
        return;
      }
      const { box, stops } = found;
      if (!stops.length) return;
      stops.sort((a, b) => a.t - b.t);

      // Tidslinje i sekunder etter at skjermbildet kom fram.
      const from = { x: box.width - 24, y: box.height - 16 };
      const frames: { t: number; x: number; y: number; s: number; o: number }[] = [{ t: 0, ...from, s: 1, o: 0 }, { t: 0.4, ...from, s: 1, o: 1 }];
      const rings: { t: number; o: number; s: number }[] = [{ t: 0, o: 0, s: 0.4 }];
      let prev = { ...from, t: 0.4 };
      for (const p of stops) {
        const arrive = Math.max(prev.t + 0.2, p.t - 0.3);
        const leave = Math.max(prev.t + 0.2, arrive - 1.4); // rolig bevegelse, høyst 1,4 sekunder
        frames.push({ t: leave, x: prev.x, y: prev.y, s: 1, o: 1 });
        frames.push({ t: arrive, x: p.x, y: p.y, s: 1, o: 1 });
        frames.push({ t: p.t, x: p.x, y: p.y, s: 0.82, o: 1 });
        frames.push({ t: p.t + 0.18, x: p.x, y: p.y, s: 1, o: 1 });
        rings.push({ t: p.t - 0.01, o: 0, s: 0.4 }, { t: p.t, o: 1, s: 0.6 }, { t: p.t + 0.45, o: 0, s: 2.2 });
        prev = { x: p.x, y: p.y, t: p.t + 0.18 };
      }
      const end = prev.t + 1.6;
      frames.push({ t: end - 0.4, x: prev.x, y: prev.y, s: 1, o: 1 }, { t: end, x: prev.x, y: prev.y, s: 1, o: 0 });
      rings.push({ t: end, o: 0, s: 0.4 });

      const opts = { duration: end * 1000, delay: start * 1000, fill: 'both' as const };
      // Erstatter en tidligere bevegelse (når skjermbildet er tegnet på nytt og stedene har flyttet seg).
      old.forEach((a) => a.cancel());
      old = [];
      anims = [
        el.animate(
          frames.map((f) => ({
            offset: Math.min(1, f.t / end),
            transform: `translate(${f.x}px, ${f.y}px) scale(${f.s})`,
            opacity: f.o,
            easing: 'ease-in-out',
          })),
          opts,
        ),
      ];
      if (ringRef.current) {
        anims.push(
          ringRef.current.animate(
            rings.map((r) => ({ offset: Math.min(1, r.t / end), opacity: r.o, transform: `scale(${r.s})` })),
            opts,
          ),
        );
      }
      // Laget etter at steget startet: still klokken til steget og følg pause.
      if (late) {
        for (const a of anims) {
          a.currentTime = clock.current.elapsed;
          if (!clock.current.playing) a.pause();
        }
      }
    };

    create(false);
    // Når skjermbildet tegnes på nytt (data-hx-layout endres), måles stedene på nytt og bevegelsen lages om
    // fra der klokken står. Tidligere steder ligger der de lå, så pekeren fortsetter uten hopp.
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      old = anims;
      tries = 0;
      stable = 0;
      lastKey = '';
      frame = requestAnimationFrame(() => create(true));
    });
    observer.observe(stage, { attributes: true, attributeFilter: ['data-hx-layout'], subtree: true });
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      anims.forEach((a) => a.cancel());
      old.forEach((a) => a.cancel());
    };
  }, [start, clock]);
  return (
    <span ref={ref} className="hx-pointer" aria-hidden="true">
      <span ref={ringRef} className="hx-pointer-ring" />
      <svg viewBox="0 0 24 24" width="22" height="22">
        <path d="M4 2l14 9-6.2 1.3L15 20l-2.6 1.2-3.2-7.6L4 18z" />
      </svg>
    </span>
  );
}

/**
 * Tekst som rulles ut bokstav for bokstav fra et gitt tidspunkt, i jevnt tempo også over mellomrom.
 * Hvilke bokstaver som vises, regnes ut fra klokken for steget («now», i sekunder), ikke med
 * CSS-animasjoner. Da kan ingen bokstav bli hengende usynlig etter pause og start, og pause fryser teksten.
 * Hvert ord holdes samlet, så linjene brytes mellom ord og ikke midt i et ord.
 */
function Rolled({ text, start, now }: { text: string; start: number; now: number }) {
  let i = 0;
  return (
    <>
      {words(text).map((w, n) => {
        const word = (
          <span className="hx-w">
            {[...w].map((c, k) => (
              <span key={k} className={start + (i + k) * CHAR_S <= now ? 'hx-char on' : 'hx-char'}>
                {c}
              </span>
            ))}
          </span>
        );
        i += [...w].length + 1;
        return (
          <Fragment key={n}>
            {word}{' '}
          </Fragment>
        );
      })}
    </>
  );
}

/**
 * «Veiledning» (2.0, SPEC P-22). Først en oversikt med fire scenarioer. Et valgt scenario vises alene, med faner
 * for stegene. I hvert steg rulles teksten og «Nytte» ut ord for ord, og deretter kommer et animert
 * skjermbilde med datasettets egne navn og tall. Brukeren går videre med «Neste». Når siste steg i en
 * scenario er ferdig, starter neste scenario etter en nedtelling på ti sekunder, eller med «Start nå».
 */
export default function HelpPage() {
  const i18n = useI18n();
  const { m, f } = i18n;
  const h = m.help;

  const [story, setStory] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [phase, setPhase] = useState<Phase>('step');
  // Animert: steget spilles fra start. Ikke animert: steget vises ferdig.
  const [animated, setAnimated] = useState(false);
  const [run, setRun] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  // Etter teksten venter steget på «Fortsett» før skjermbildet vises.
  const [continued, setContinued] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // Tid (ms) skjermbildet skal hoppe til når «Start» spiller et ferdig steg på nytt.
  const seekRef = useRef<number | null>(null);
  // Klokken for steget, lest av pekeren når den lages etter at steget startet.
  const clockRef = useRef<Clock>({ elapsed: 0, playing: false });
  clockRef.current = { elapsed, playing };
  // Når den siste animasjonen i skjermbildet er ferdig (ms fra steget startet), målt når steget vises.
  const [sceneEnd, setSceneEnd] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = stageRef.current;
    // Skjermbildet er bare en illustrasjon: ingenting i det (for eksempel kartets zoomknapper) skal kunne fokuseres.
    el?.setAttribute('inert', '');
    if (!el || typeof el.getAnimations !== 'function') return setSceneEnd(null);
    // Pekeren blir stående litt etter siste klikk; den skal ikke holde igjen «Fortsett».
    const ends = el
      .getAnimations({ subtree: true })
      .filter((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target;
        return !(target instanceof Element && target.closest('.hx-pointer'));
      })
      .map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0));
    setSceneEnd(ends.length ? Math.max(...ends) : null);
  }, [run]);

  const facts = sceneFacts(i18n);

  const goTo = useCallback((nextStory: number, nextStep: number, animate: boolean) => {
    setStory(nextStory);
    setStep(nextStep);
    setPhase('step');
    setElapsed(0);
    setAnimated(animate);
    setRun((r) => r + 1);
    setContinued(false);
  }, []);

  // Klokken går bare mens animasjonen spiller, så pause fryser både tekst, skjermbilde og nedtelling.
  useEffect(() => {
    if (!playing) return;
    let prev = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = now - prev;
      prev = now;
      setElapsed((e) => e + dt);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Tidslinjen for steget: tekst, «Nytte», så skjermbildet.
  const s = story === null ? null : STORIES[story];
  const texts = s ? h.stories[s.id] : null;
  const text = texts ? texts.steps[step] : null;
  // Steg 1 innledes med hva scenarioet viser og hvorfor. Deretter kommer hvordan det vises.
  const intro = texts && step === 0 ? texts.intro : '';
  const benefitText = text?.benefit ?? '';
  // Steg 1: «Om scenarioet» med innledningen og så nytten. De andre stegene: bare nytten.
  const benefitStart = intro ? TEXT_START_S + rollLength(intro) * CHAR_S + 0.3 : TEXT_START_S;
  const textEnd = benefitStart + rollLength(benefitText) * CHAR_S;
  const sourceAt = benefitStart + rollLength(benefitText) * CHAR_S + 0.1;
  const sceneStart = textEnd + 0.6;
  // Steget er ferdig litt etter at den siste animasjonen i skjermbildet er ferdig.
  const stepDone = sceneEnd !== null ? Math.max(sceneEnd, sceneStart * 1000) + 300 : (sceneStart + SCENE_S) * 1000;
  const gateAt = (sceneStart - 0.3) * 1000;
  const last = s ? s.routes.length - 1 : 0;

  useEffect(() => {
    if (!playing || story === null) return;
    if (phase === 'step' && !continued && elapsed >= gateAt) {
      setPlaying(false);
    } else if (phase === 'step' && elapsed >= stepDone) {
      // Stegene byttes med «Neste». Bare etter siste steg går det videre av seg selv.
      if (step < last) setPlaying(false);
      else if (story < STORIES.length - 1) {
        setPhase('countdown');
        setElapsed(0);
      } else {
        setPhase('done');
        setPlaying(false);
      }
    } else if (phase === 'countdown' && elapsed >= COUNTDOWN_MS) {
      goTo(story + 1, 0, true);
    }
  }, [elapsed, playing, phase, step, story, last, stepDone, gateAt, continued, goTo]);

  // Pause fryser animasjonene der de er.
  useLayoutEffect(() => {
    const el = playerRef.current;
    if (!el || typeof el.getAnimations !== 'function') return;
    const seek = seekRef.current;
    seekRef.current = null;
    for (const a of el.getAnimations({ subtree: true })) {
      if (seek !== null) a.currentTime = seek;
      // Ferdige animasjoner (for eksempel teksten som er rullet ut) skal ikke spilles på nytt.
      if (a.playState === 'finished') continue;
      if (playing) a.play();
      else a.pause();
    }
  }, [playing, run, phase]);

  // Et scenario åpnes med teksten for steg 1, som rulles ut med en gang.
  const openStory = (n: number) => {
    goTo(n, 0, true);
    setPlaying(true);
  };
  const toOverview = () => {
    setPlaying(false);
    setStory(null);
  };

  // Oversikten over scenarioene.
  if (s === null || story === null || texts === null || text === null) {
    return (
      <div className="page page-narrow">
        <PageHeader title={h.title} lead={h.lead} />
        <ul className="help-stories" aria-label={h.storiesLabel}>
          {STORIES.map((x, n) => (
            <li key={x.id}>
              <button type="button" className="help-story" onClick={() => openStory(n)}>
                <span className="help-tab-num" aria-hidden="true">{n + 1}</span>
                <span className="help-story-body">
                  <span className="help-story-title">{h.stories[x.id].tab}</span>
                  <span className="help-story-text">{h.stories[x.id].summary}</span>
                  <span className="help-story-meta">{f(h.stepsCount, { n: x.routes.length })}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const stepFinished = !animated || elapsed >= stepDone;
  const showControls = continued || !animated || phase !== 'step';
  // Tid i skjermbildet, i samme enhet som tidene i skjermbildene (data-hx-at). Uendelig når steget vises ferdig.
  const sceneT = animated && phase === 'step' ? (elapsed / 1000 - sceneStart - LEAD_S) / SLOW : Infinity;
  // Klokken for teksten. Et steg som vises ferdig, eller brukere som har slått av bevegelse, får all tekst med en gang.
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rollNow = !animated || phase !== 'step' || reducedMotion ? Infinity : elapsed / 1000;
  const waiting = animated && phase === 'step' && !continued && elapsed >= gateAt;
  // «Hopp frem» vises mens teksten rulles ut, og hopper til der teksten er ferdig og «Fortsett» vises.
  const rolling = animated && phase === 'step' && !continued && elapsed < gateAt;
  const skipText = () => {
    seekRef.current = gateAt;
    setElapsed(gateAt);
    setPlaying(false);
  };
  const proceed = () => {
    setContinued(true);
    setPlaying(true);
  };
  // «Start» på et ferdig steg spiller bare skjermbildet på nytt; teksten står som den er.
  const replayScene = () => {
    const seek = Math.max(0, sceneStart * 1000 - 200);
    seekRef.current = seek;
    goTo(story, step, true);
    setContinued(true);
    setElapsed(seek);
    setPlaying(true);
  };
  const play = () => {
    if (waiting) return proceed();
    if (phase === 'done') return goTo(0, 0, true), setPlaying(true);
    if (phase === 'countdown') return setPlaying(true);
    // «Se på nytt» spiller skjermbildet i steget fra start; teksten står som den er.
    if (phase === 'step') return replayScene();
    setPlaying(true);
  };
  const pause = () => setPlaying(false);
  // Stopp holder scenarioet der den er. «Start» fortsetter derfra.
  // Forrige, Neste og stegfanene åpner steget og ruller ut teksten. Knappene og fanene skjules til «Fortsett».
  const openStep = (nextStory: number, nextStep: number) => {
    goTo(nextStory, nextStep, true);
    setPlaying(true);
  };
  const next = () => {
    if (phase === 'countdown') return openStep(story + 1, 0);
    if (step < last) openStep(story, step + 1);
  };
  const prev = () => {
    if (phase !== 'step') return openStep(story, last);
    if (step > 0) openStep(story, step - 1);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('a, select, input, textarea')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  };

  const route = s.routes[step];
  // Bare navnet på siden i appen, uten «Trinn n», så det ikke blandes med stegene i veiledningen.
  const pageLabel = m.nav[route];
  const Scene = SCENES[s.id][step];
  const source = text.source as keyof typeof SOURCES | '';
  // Nytten står som eget avsnitt uten overskrift: under «Om scenarioet» i steg 1, ellers etter teksten for steget.
  const benefitPara = (
    <p className="help-benefit">
      <Rolled text={text.benefit} start={benefitStart} now={rollNow} />
      {source && (
        <a className="hx-word" style={delay(sourceAt)} href={SOURCES[source]} rel="noopener noreferrer" target="_blank">
          {h.source}: {h.sources[source]}
        </a>
      )}
    </p>
  );
  const secondsLeft = Math.max(0, Math.ceil((COUNTDOWN_MS - elapsed) / 1000));
  const nextTab = STORIES[story + 1] ? h.stories[STORIES[story + 1].id].tab : '';

  return (
    <div className="page page-narrow">
      {/* Ingressen trengs bare i oversikten. */}
      <PageHeader title={h.title} />

      <section className="card help-player" aria-labelledby="help-story-title" onKeyDown={onKey}>
        <div className="help-story-head">
          <button type="button" className="link-button" onClick={toOverview}>
            ← {h.allStories}
          </button>
          <div className="help-title-row">
            <h2 id="help-story-title">
              <span className="help-tab-num" aria-hidden="true">{story + 1}</span>
              {texts.tab}
            </h2>
            {rolling && (
              <button type="button" className="btn btn-primary" onClick={skipText}>
                {h.skip} <span aria-hidden="true">»</span>
              </button>
            )}
          </div>
        </div>

        <div ref={playerRef} key={run} className={animated ? '' : 'help-static'} style={{ '--t0': `${sceneStart + LEAD_S}s`, '--slow': SLOW } as CSSProperties}>
          <div className="help-caption" aria-live="polite">
            {intro && (
              <>
                <p>
                  <Rolled text={intro} start={TEXT_START_S} now={rollNow} />
                </p>
                {benefitPara}
              </>
            )}
            {!intro && benefitPara}
          </div>

          {waiting && (
            <div className="help-continue">
              <button type="button" className="btn btn-primary" onClick={proceed}>
                {h.continue} <span aria-hidden="true">▶</span>
              </button>
            </div>
          )}

          {/* Knappene og stegfanene vises når brukeren har trykket «Fortsett» etter teksten. */}
          {showControls && (
            <>
            <div className="help-buttons">
              <button type="button" className="btn btn-small" onClick={prev} disabled={step === 0 && phase === 'step'}>
                <span aria-hidden="true">◀ </span>
                {h.prev}
              </button>
              {playing ? (
                <button type="button" className="btn btn-primary btn-small help-play" onClick={pause}>
                  <span aria-hidden="true">❚❚ </span>
                  {h.pause}
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-small help-play" onClick={play}>
                  <span aria-hidden="true">▶ </span>
                  {h.play}
                </button>
              )}
              <button type="button" className="btn btn-small" onClick={next} disabled={step === last && phase === 'step'}>
                {h.next}
                <span aria-hidden="true"> ▶</span>
              </button>
            </div>

            {/* Stegene vises som trinnene i demoen (flow-steps): ferdige, gjeldende (oransje) og kommende. */}
            <ol className="flow-steps help-flow" aria-label={h.stepsLabel}>
              {texts.steps.map((t, n) => (
                <li key={n} className={n === step ? 'current' : n < step ? 'done' : ''}>
                  <button
                    type="button"
                    className="flow-step"
                    aria-current={n === step ? 'step' : undefined}
                    onClick={() => openStep(story, n)}
                  >
                    <span className="flow-num" aria-hidden="true">{n + 1}</span>
                    {t.title}
                  </button>
                </li>
              ))}
            </ol>

            </>
          )}

          <div className="help-screen hx-word" style={delay(sceneStart - 0.2)}>
            <div className="help-screen-bar" aria-hidden="true">
              <span className="help-screen-brand">Morild Bank</span>
              <span className="help-screen-page">{pageLabel}</span>
            </div>
            <div className="help-stage" aria-hidden="true" ref={stageRef}>
              <Scene facts={facts} t={sceneT} />
              {animated && <Pointer start={sceneStart} clock={clockRef} />}
            </div>

            {phase === 'countdown' && (
              <div className="help-overlay">
                <div className="help-overlay-card" role="status">
                  <p className="help-overlay-title">{f(h.storyDone, { story: texts.tab })}</p>
                  <p>{f(h.nextStory, { story: nextTab })}</p>
                  <div className="help-clock" aria-hidden="true">
                    <svg viewBox="0 0 44 44" width="72" height="72">
                      <circle cx="22" cy="22" r="19" className="help-clock-track" />
                      <circle
                        cx="22"
                        cy="22"
                        r="19"
                        className="help-clock-fill"
                        strokeDasharray={119.4}
                        strokeDashoffset={119.4 * Math.min(1, elapsed / COUNTDOWN_MS)}
                      />
                    </svg>
                    <span>
                      {secondsLeft}
                      <small> {h.seconds}</small>
                    </span>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => (goTo(story + 1, 0, true), setPlaying(true))}>
                    {h.startNow}
                  </button>
                </div>
              </div>
            )}

            {phase === 'done' && (
              <div className="help-overlay">
                <div className="help-overlay-card" role="status">
                  <p className="help-overlay-title">{h.allDone}</p>
                  <p>{h.allDoneText}</p>
                  <div className="card-actions">
                    <button type="button" className="btn btn-primary" onClick={toOverview}>
                      {h.allStories}
                    </button>
                    <button type="button" className="btn" onClick={() => navigate('scenario')}>
                      {h.toDemo}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Når steget er ferdig spilt, går «Fortsett» videre til neste steg og spiller det. */}
          {stepFinished && phase === 'step' && step < last && (
            <div className="help-continue help-continue-after">
              <button type="button" className="btn btn-primary" onClick={() => openStep(story, step + 1)}>
                {h.continue} <span aria-hidden="true">▶</span>
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
