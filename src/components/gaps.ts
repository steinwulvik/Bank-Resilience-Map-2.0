import { dependenciesById, nodesById } from '../data';
import type { DataGap } from '../engine/impact';
import { createI18n, type I18n } from '../i18n';
import type { CustomTask } from '../state/demo';

/** Gjør en datamangel om til et konkret kontrollspørsmål. */
export function gapQuestion(gap: DataGap, i: I18n): string {
  const dep = dependenciesById[gap.dependencyId];
  const vars = {
    from: i.lt(nodesById[dep.from].name),
    to: i.lt(nodesById[dep.to].name),
    type: i.m.depType[dep.type],
    date: dep.lastConfirmed ? i.date(dep.lastConfirmed) : i.m.validity.neverConfirmed,
  };
  return i.f(i.m.analysis.gapQuestion[gap.reason], vars);
}

export function gapTaskId(gap: DataGap) {
  return `gap-${gap.reason}-${gap.dependencyId}`;
}

/** Oppgave med ansvar hos eieren av objektet som har den usikre relasjonen. */
/** Oppgaveteksten lagres på begge språk, så den følger språkvelgeren også etterpå. */
export function gapToTask(gap: DataGap): CustomTask {
  const dep = dependenciesById[gap.dependencyId];
  return {
    id: gapTaskId(gap),
    title: { no: gapQuestion(gap, createI18n('no')), en: gapQuestion(gap, createI18n('en')) },
    role: nodesById[dep.from].owner,
    fromGap: gap.dependencyId,
  };
}
