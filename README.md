# Bank Resilience Map 2.0

**Bank Resilience Map 2.0 – fra hendelse til forebygging** er en konseptdemo som viser hvordan en bank kan forstå følgene av en IT- eller leverandørforstyrrelse, og hvordan den kan forebygge at det skjer. Den kobler kritiske tjenester til systemer og leverandører og synliggjør påvirkningsstier. Scenario, usikkerhet og oppfølging samles i ett hendelsesrom.

> Selvstendig porteføljeprosjekt. Ikke et kommersielt produkt, og ikke laget på oppdrag fra noen bank eller leverandør. Den fiktive banken **Morild Bank** og alle systemer, leverandører og hendelser er oppdiktet (syntetiske data).

## Hovedflyt

1. **Scenario:** Velg svikt hos en leverandør eller feil etter en systemendring. Angi alvorlighet og varighet, og om scenarioet kjøres som hendelse eller øvelse.
2. **Påvirkning:** Se hvilke kanaler og tjenester som rammes. Hver påvirkning kan spores gjennom en synlig sti. Antatte, utdaterte og manglende data merkes som usikre.
3. **Hendelsesrom:** Følg status, tidslinje, oppgaver med ansvarlig rolle og en tidsstemplet beslutningslogg.
4. **Rapport:** Få en utskrivbar oppsummering med antakelser, datamangler og tiltak.

## Nytt i 2.0

- **Leverandører:** Register over leverandører og underleverandører i flere ledd, med exit-plan, når planen sist ble testet, og hvor lett leverandøren kan byttes ut. Eksport som CSV.
- **Endringer:** Se hva en planlagt endring kan ramme hvis den feiler, før den settes i drift, med sjekkliste og beslutningslogg.
- **Øvelser og funn:** Kjør scenarioene som øvelser og følg opp funnene til de er lukket.
- **Veiledning:** En animert gjennomgang i fire scenarioer viser hvordan appen brukes, og hva banken får ut av den.

## Kom i gang

```bash
npm install
npm run dev      # utviklingsserver
npm test         # tester for beregningene og lagringen
npm run build    # produksjonsbygg i dist/
```

## Struktur

| Mappe | Innhold |
|---|---|
| `src/data/` | Datamodell (`types.ts`) og syntetisk datasett (`morild-bank.json`) |
| `src/engine/` | Påvirkningsberegning og leverandørkjeder, med tester |
| `src/state/` | Demo-tilstand i nettleserfanen, med tester |
| `src/i18n/` | Språkfiler. All tekst i grensesnittet ligger i `no.ts` og `en.ts` |
| `src/pages/` | Skjermene: intro, tjenesteoversikt, leverandører, endringer, øvelser og funn, veiledning (med animerte skjermbilder), scenario, påvirkning (med kart), hendelsesrom, rapport, om |
| `src/components/` | Avhengighetskart (React Flow), detaljpanel, forklaringer |
| `src/lib/` | Regler for fritekst (lengde og tillatte tegn) |
| `scripts/build-dataset.py` | Genererer datasettet, med engelske tekster fra `translations-en.json` |

Kravene står i [`SPEC.md`](SPEC.md). Den er kilden til sannhet for produkt og omfang.

## Publisering

Appen ligger i repoet [steinwulvik/Bank-Resilience-Map-2.0](https://github.com/steinwulvik/Bank-Resilience-Map-2.0) og publiseres med Cloudflare Pages til **https://bank-resilience-map-2.pages.dev**. Cloudflare bygger appen automatisk ved hver endring i repoet.

Oppsett i Cloudflare Pages: prosjekt `bank-resilience-map-2`, byggkommando `npm run build`, utdatamappe `dist` og miljøvariabelen `NODE_VERSION=22`. Appen er statisk og bruker hash-ruting og relative stier, så direkte lenker og oppfrisking virker.

Versjon 1.0 ligger i repoet [steinwulvik/Bank-Resilience-Map-1.0](https://github.com/steinwulvik/Bank-Resilience-Map-1.0).

## Personvern

Demoen har ingen innlogging, sporing eller analyseverktøy. Valg, beslutninger, endringsvurderinger og funn lagres bare i `sessionStorage` i nettleserfanen og slettes med «Nullstill demo».

## Språk

Appen finnes på norsk og engelsk, med språkvelger øverst til høyre. Appen starter på engelsk. Valget huskes i nettleserfanen.

- Tekstene i grensesnittet ligger i `src/i18n/no.ts` og `src/i18n/en.ts`. Den engelske filen typesjekkes mot den norske, så ingen tekst kan mangle.
- Datasettets tekster oversettes i `scripts/translations-en.json`. `npm run dataset` stopper med en feilmelding hvis en norsk tekst mangler engelsk oversettelse.
