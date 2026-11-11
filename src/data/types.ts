/**
 * Datamodell for Bank Resilience Map (SPEC §11).
 * Alle poster er syntetiske (`synthetic: true`). Brukerrettede tekster lagres
 * per språk slik at engelsk kan legges til senere (SPEC D-13).
 */

export type Lang = 'no' | 'en';

/** Tekst per språk. Norsk er påkrevd i første versjon. */
export type LocalizedText = { no: string; en?: string };

export type NodeKind = 'channel' | 'service' | 'system' | 'provider';
export type Criticality = 'critical' | 'high' | 'medium';
export type OperationalStatus = 'operational' | 'degraded' | 'maintenance';

interface BaseNode {
  id: string;
  kind: NodeKind;
  name: LocalizedText;
  description: LocalizedText;
  criticality: Criticality;
  /** Rolle med ansvar (tjenesteeier, teknisk eier eller leverandøransvarlig). */
  owner: LocalizedText;
  status: OperationalStatus;
  /** Kjente datamangler på selve objektet, vises alltid. */
  dataGaps?: LocalizedText[];
  synthetic: true;
}

/** Kundekanal, f.eks. mobilbank. */
export interface Channel extends BaseNode {
  kind: 'channel';
}

/** Forretningstjeneste med gjenopprettingsmål. */
export interface Service extends BaseNode {
  kind: 'service';
  /** Maksimal akseptabel nedetid i minutter (RTO). */
  rtoMinutes: number;
  /** Maksimalt akseptabelt datatap i minutter (RPO). */
  rpoMinutes: number;
}

export type Environment = 'onPrem' | 'cloud' | 'saas' | 'managed';

export interface System extends BaseNode {
  kind: 'system';
  environment: Environment;
}

export interface Provider extends BaseNode {
  kind: 'provider';
  serviceType: LocalizedText;
  /** Regioner leverandøren driver i (tom for ikke-regionale leverandører). */
  regions: string[];
  /** Kjente alternativer eller reserveløsninger. */
  alternatives: LocalizedText;
  /**
   * 2.0: false for underleverandører (fjerdeparter) som banken ikke har avtale med.
   * Exit-feltene under finnes bare når banken har direkte avtale.
   */
  directContract: boolean;
  /** 2.0: rolle som eier avtalen. */
  contractOwner?: LocalizedText;
  /** 2.0: status for exit-planen. */
  exitPlan?: ExitPlanStatus;
  /** 2.0: hvor lett leverandøren kan byttes ut. */
  substitutability?: Substitutability;
  /** 2.0: ISO-dato (YYYY-MM-DD) for siste vurdering av exit og byttbarhet, eller null hvis aldri. */
  lastAssessed?: string | null;
  /** 2.0: ISO-dato for siste test av exit-planen, eller null hvis den aldri er testet (DORA: planene skal testes). */
  exitTested?: string | null;
}

/** 2.0: exit-plan finnes, er under arbeid eller mangler. */
export type ExitPlanStatus = 'exists' | 'inProgress' | 'missing';
/** 2.0: lett, krevende eller ikke mulig å bytte ut. */
export type Substitutability = 'easy' | 'hard' | 'notPossible';

export type GraphNode = Channel | Service | System | Provider;

export type DependencyType =
  | 'uses' // kanal/tjeneste bruker tjeneste/system
  | 'runsOn' // system kjører hos leverandør
  | 'dataFeed' // dataleveranse
  | 'subcontractor'; // leverandør bruker underleverandør

/**
 * hard: bortfall i avhengigheten gir samme nivå oppover.
 * soft: avhengigheten gir bare redusert funksjon oppover.
 */
export type DependencyStrength = 'hard' | 'soft';

/**
 * confirmed: bekreftet av eier innen gyldighetsperioden.
 * assumed: antatt, ikke bekreftet.
 * stale: bekreftet, men for lenge siden (se STALE_AFTER_DAYS).
 */
export type Validity = 'confirmed' | 'assumed' | 'stale';

export interface Dependency {
  id: string;
  /** Objektet som er avhengig. */
  from: string;
  /** Objektet det er avhengig av. */
  to: string;
  type: DependencyType;
  strength: DependencyStrength;
  /**
   * Bare for avhengigheter til regionale leverandører:
   * regionene systemet faktisk kjører i. `undefined` betyr ukjent (datamangel).
   */
  regions?: string[];
  source: LocalizedText;
  /** ISO-dato (YYYY-MM-DD) for siste bekreftelse, eller null hvis aldri. */
  lastConfirmed: string | null;
  validity: Validity;
  note?: LocalizedText;
  synthetic: true;
}

/** Parametre som brukeren kan justere i scenarioverkstedet. */
export interface ScenarioParams {
  /** Komponenten som feiler. */
  targetId: string;
  /** Berørte regioner (bare for regionale leverandører). */
  regions: string[];
  /** Hvor alvorlig feilen er i komponenten selv. */
  severity: 'outage' | 'degraded';
  /** Forventet varighet i minutter. */
  durationMinutes: number;
}

export interface TimelineTemplate {
  /** Minutter etter start. */
  offsetMinutes: number;
  text: LocalizedText;
}

export interface TaskTemplate {
  id: string;
  title: LocalizedText;
  role: LocalizedText;
  /** Frist i minutter etter start. */
  dueMinutes: number;
}

export interface DecisionTemplate {
  offsetMinutes: number;
  text: LocalizedText;
  role: LocalizedText;
  /** Oppgaven beslutningen gjelder. Mangler den, gjelder beslutningen hele hendelsen. */
  taskId?: string;
}

export interface ScenarioTemplate {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  failureType: 'regionalProviderOutage' | 'failedChange';
  /**
   * Hvilke komponenter brukeren kan velge, avledes av feiltypen: alle leverandører ved
   * leverandørsvikt og alle systemer ved mislykket endring (se ScenarioPage).
   */
  defaults: ScenarioParams;
  durationOptions: number[];
  /** Fast starttidspunkt for den syntetiske hendelsen (ISO). */
  startTime: string;
  /** Faste antakelser i scenarioet. */
  assumptions: LocalizedText[];
  controlQuestions: LocalizedText[];
  timeline: TimelineTemplate[];
  tasks: TaskTemplate[];
  decisions: DecisionTemplate[];
  synthetic: true;
}

/** 2.0: planlagt endring som vurderes mot kartet før driftssetting (siden «Endringer»). */
export type ChangeRisk = 'low' | 'medium' | 'high';
export type ChangeOutcome = 'approved' | 'rejected';

export interface ChangeDecision {
  outcome: ChangeOutcome;
  reason: LocalizedText;
  role: LocalizedText;
  /** ISO-tidspunkt for beslutningen. */
  decidedAt: string;
}

export interface PlannedChange {
  /** Endringsnummer, f.eks. CHG-2026-121. */
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  /** Systemet som endres. Forventet påvirkning beregnes med samme motor som scenarioene. */
  systemId: string;
  /** ISO-tidspunkt for start av vedlikeholdsvinduet. */
  plannedStart: string;
  /** Lengden på vedlikeholdsvinduet i minutter. */
  windowMinutes: number;
  risk: ChangeRisk;
  rollbackTested: boolean;
  /** Rolle som er ansvarlig for endringen. */
  owner: LocalizedText;
  /** Sjekkpunkter som må vurderes før beslutning. */
  checkpoints: LocalizedText[];
  /** Fast beslutning i datasettet (eksempel). Mangler den, venter endringen på vurdering. */
  decision?: ChangeDecision;
  synthetic: true;
}

/** 2.0: øvelse der et scenario er kjørt (siden «Øvelser og funn»). */
export interface Exercise {
  id: string;
  /** Scenarioet som ble øvd på. */
  scenarioId: string;
  title: LocalizedText;
  /** ISO-dato (YYYY-MM-DD). */
  date: string;
  /** Roller som deltok. */
  participants: LocalizedText[];
  /** Leverandører som deltok i øvelsen. Kritiske leverandører bør delta i relevante øvelser. */
  providerIds: string[];
  summary: LocalizedText;
  synthetic: true;
}

export type FindingStatus = 'open' | 'inProgress' | 'closed';
export type FindingSource = 'exercise' | 'incident';

/** 2.0: funn fra en øvelse eller en hendelse, fulgt opp til det er lukket. */
export interface Finding {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  source: FindingSource;
  /** Øvelsens id når kilden er en øvelse. */
  exerciseId?: string;
  /** Navn på hendelsen når kilden er en hendelse. */
  incident?: LocalizedText;
  /** Rolle som er ansvarlig for oppfølgingen. */
  role: LocalizedText;
  /** ISO-dato (YYYY-MM-DD). */
  due: string;
  status: FindingStatus;
  /** Objekter i kartet funnet gjelder. */
  nodeIds: string[];
  synthetic: true;
}

export interface Bank {
  name: string;
  description: LocalizedText;
  synthetic: true;
}

export interface Dataset {
  bank: Bank;
  /** Referansedato for vurdering av «utdatert» (datasettet er en fast demo). */
  asOf: string;
  /** Visningsnavn for land/regioner som leverandører driver i (f.eks. «no» → Norge). */
  regionNames: Record<string, LocalizedText>;
  staleAfterDays: number;
  nodes: GraphNode[];
  dependencies: Dependency[];
  scenarios: ScenarioTemplate[];
  /** 2.0 */
  plannedChanges: PlannedChange[];
  /** 2.0 */
  exercises: Exercise[];
  /** 2.0 */
  findings: Finding[];
}
