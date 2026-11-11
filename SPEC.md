# Bank Resilience Map
## Kravspesifikasjon – versjon 2.0 «fra hendelse til forebygging»

## 1. Kort om konseptet

Bank Resilience Map er en interaktiv demonstrator for å forstå hvordan bankens viktige tjenester avhenger av interne systemer og eksterne IT-leverandører. Brukeren kan simulere en driftsforstyrrelse og se hvilke tjenester som kan bli påvirket, hvilke avhengigheter som må undersøkes, og hvilke oppfølgingsoppgaver som bør vurderes. Versjon 2.0 hjelper også banken med å forebygge, gjennom leverandørregister, vurdering av planlagte endringer og øvelser med oppfølging av funn.

Demonstratoren bruker oppdiktede banker, systemer, leverandører og hendelser. Den viser en arbeidsflyt og et produktkonsept, og gir ikke en formell risikovurdering eller dokumenterer faktisk DORA-etterlevelse.

### 1.1 Versjoner

| Versjon | Lenke | Innhold |
|---|---|---|
| Bank Resilience Map 1.0 | https://bank-resilience-map.pages.dev | Hendelsesflyten: Scenario → Påvirkning → Hendelsesrom → Rapport, Tjenesteoversikt, Om demoen, norsk og engelsk |
| Bank Resilience Map 2.0 «fra hendelse til forebygging» | https://bank-resilience-map-2.pages.dev | Alt i 1.0, pluss Leverandører, Endringer og Øvelser og funn (§2.3) |

Versjonsnummeret er en del av appnavnet og forkortes ikke. Kravene for 1.0 gjelder også i 2.0 med mindre en 2.0-del sier noe annet.

## 2. Målbilde for sluttproduktet

Bank Resilience Map skal være et arbeidsverktøy som gir bankens ansatte et oppdatert, etterprøvbart bilde av hvordan kritiske tjenester avhenger av teknologi, interne team og eksterne leverandører. Når en forstyrrelse oppstår – eller når banken planlegger en endring – skal brukeren kunne gå fra et forretningsmessig spørsmål til en forståelig konsekvensanalyse og videre til koordinert oppfølging.

Sluttproduktet skal gi brukeren denne sammenhengende opplevelsen:

1. **Forstå utgangspunktet:** Se kritiske banktjenester, eiere, driftsstatus, gjenopprettingsmål og datadekning i en samlet oversikt.
2. **Utforske avhengigheter:** Følge en tjeneste gjennom applikasjoner, infrastruktur, dataflyt, interne team og leverandører. Hver relasjon skal ha kilde, eier og sist bekreftet dato.
3. **Vurdere endring eller hendelse:** Velge en faktisk hendelse eller planlagt endring og angi omfang, varighet, område og berørte komponenter.
4. **Se konsekvenser og usikkerhet:** Se direkte og indirekte påvirkning på tjenester, kanaler og kundereiser. Resultatet skal vise hva som støtter vurderingen, hva som er antatt, og hvor bildet er ufullstendig.
5. **Koordinere respons:** Følge opp oppgaver med ansvarlig rolle, frist og status, og føre en tidsstemplet beslutningslogg.
6. **Dokumentere og lære:** Eksportere en sporbar oppsummering og registrere forbedringstiltak etter hendelsen.

Et produksjonsprodukt skal kunne hente informasjon fra bankens autoritative kilder for tjenestekatalog, system- og ressursdata, leverandørregister, overvåking og hendelseshåndtering. Integrasjoner skal vise dataeier, oppdateringsstatus, tilgang og feilhåndtering. Manglende eller utdaterte data skal aldri se ut som et komplett risikobilde.

Demonstratoren er et avgrenset, syntetisk uttrykk for dette målbildet og er ikke et produksjonsklart produkt.

### 2.1 Selvbetjent demonstrasjon

Demonstratoren er en offentlig webapp med en stabil lenke. En besøkende skal kunne åpne lenken og forstå verdien uten at noen viser appen:

- Introsiden forklarer kort hvilket bankproblem appen belyser, hvem den er laget for, og hva demonstrasjonen viser. Den har ingen menyfaner, et kort «Forebygging» med lenker til de nye sidene, og en synlig «Gå til demoen»-knapp nederst som starter eksempelbank-flyten uten konto eller personlig informasjon.
- Demoen starter i Scenario. Hovedflyten navigeres med trinnene 1–4: Scenario, Påvirkning, Hendelsesrom og Rapport.
- Avhengighetskartet ligger i Påvirkning, med Kart som standardvisning og Liste som alternativ. Objektene i kartet kan klikkes, og detaljene vises under kartet.
- Oppslagssidene «Tjenesteoversikt», «Leverandører», «Endringer», «Øvelser og funn», «Veiledning» og «Om demoen» ligger som lenker øverst til høyre ved «Nullstill demo», og har en lenke tilbake til flyten.
- På skjermer smalere enn 1100 px samles oppslagslenkene og «Nullstill demo» bak knappen «Meny», som åpner en liste under toppfeltet. Listen lukkes ved navigasjon, med Esc og ved klikk utenfor. I listen markeres linjen musen står over med en oransje strek til venstre. Språkvelgeren står alltid synlig.
- Merket «Syntetiske data» står på samme sted på alle sider etter introsiden, øverst til høyre under språkvelgeren.
- Siden «Veiledning» (adresse `#/veiledning`) viser med en animert gjennomgang hvordan appen brukes, og hva banken får ut av den (P-22, §12 punkt 9). Introsiden har en knapp til den ved siden av «Gå til demoen». Tilbakelenken på siden går til siden brukeren kom fra, med sidens navn (for eksempel «Tilbake til startsiden»). Er siden åpnet direkte, lenker den tilbake til flyten.
- Brukeren kan nullstille demoen og komme tilbake til en forståelig standardvisning.
- Et banner øverst på alle sider sier «Demonstrasjon med syntetiske data · Uavhengig konseptdemo». Appen nevner ingen navngitte selskaper.
- Grensesnittet finnes på norsk og engelsk, med språkvelger.
- Appen er responsiv, tilgjengelig og tåler direkte åpning av lenke og oppfrisking av siden.
- Demoen samler ikke inn besøksdata og har ingen ekte bankintegrasjoner.

Eventuelle reelle bankdata, integrasjoner, brukeradministrasjon eller interne arbeidsflyter krever separat tilgangsstyring og sikkerhetsdesign før produksjonsbruk.

### 2.2 White-label-merkevare

Demonstratoren bruker den fiktive banken **Morild Bank** som white-label-kunde. Bankens merkevare er synlig i produktgrensesnittet, mens Bank Resilience Map beskriver produktkonseptet bak løsningen. Morild Bank er oppdiktet og framstilles ikke som en faktisk bank eller kunde av noen leverandør.

Logoen består av tre blågrønne bølger med samme farge, et ravgult lyspunkt og ordmerket «MORILD BANK», der «MORILD» har bølgenes blågrønne farge og «BANK» er ravgult.

![Morild Bank-logo](morild-bank-wordmark-color.png)

### 2.3 Versjon 2.0: fra hendelse til forebygging

Versjon 1.0 hjelper banken når noe allerede har gått galt. Versjon 2.0 hjelper også banken med å unngå at det skjer, og svarer på svakhetene Finanstilsynet peker på i risiko- og sårbarhetsanalysen for 2026: leverandør- og verdikjederisiko og konsentrasjon hos få leverandører og fellesløsninger, mangler i endringshåndteringen, beredskapstester som ikke alltid bygger på realistiske scenarioer, og funn som ikke alltid følges opp systematisk. Alle nye deler bruker samme datasett, avhengighetskart og påvirkningsberegning som 1.0.

| Side | Hva den gjør | Krav og funn den svarer på |
|---|---|---|
| Leverandører | Register over leverandører og underleverandører i flere ledd, med kritikalitet, tjenestene de understøtter, land, kilde, sist bekreftet, exit-plan og hvor lett leverandøren kan byttes ut. Eksport av registeret i et forenklet format, merket som demo. Klikk på en leverandør åpner detaljene. | DORAs register over IKT-leverandører og exit-planer; konsentrasjonsrisiko |
| Endringer | Vurdering av en planlagt endring før driftssetting: se forventet påvirkning i kartet, gå gjennom en sjekkliste og godkjenn eller avvis med begrunnelse i loggen. | Mangler i endringshåndteringen funnet ved tilsyn |
| Øvelser og funn | Et scenario kan startes som øvelse i stedet for hendelse. Hendelsesrommet og rapporten merkes «Øvelse». Funn registreres med ansvarlig, frist og status, og siden samler alle funn og viser hvilke som er åpne. | DORAs krav til testing; lite helhetlige øvelser og svak oppfølging av funn |

## 3. Problem og begrunnelse

Banker driver stadig flere kritiske tjenester gjennom digitale systemer og eksterne leverandører. Det kan være krevende å få ett samlet bilde av avhengigheter, konsekvenser og gjenopprettingsarbeid når en komponent svikter. ECBs tilsynsprioriteringer peker blant annet på tredjeparts- og skyrisiko, hendelseshåndtering, cybersikkerhet, endringsstyring og svakheter i risikodata og rapportering.

Konseptet viser hvordan et visuelt avhengighetskart kombinert med scenarioanalyse kan gjøre dette arbeidet mer oversiktlig.

### 3.1 Regulatorisk grunnlag

Påstander om myndighetskrav i appen holder seg innenfor det primærkildene sier:

- DORA, EUs forordning om digital operasjonell motstandsdyktighet, har gjeldt i Norge siden 1. juli 2025. Bankene skal blant annet føre et register over IKT-leverandører og underleverandørene deres, ha exit-planer og teste beredskapen. Registeret over IKT-tjenesteavtaler rapporteres til Finanstilsynet, og neste frist er 15. mars 2027. DORA-begrepet for hendelser som skal rapporteres, er «alvorlige IKT-relaterte hendelser».
- Etter Finanstilsynets veileder om hendelsesrapportering etter DORA skal et innledende varsel om en alvorlig IKT-relatert hendelse sendes innen 4 timer etter at hendelsen er klassifisert som alvorlig, og senest 24 timer etter at den ble oppdaget.
- Finanstilsynets risiko- og sårbarhetsanalyse 2026 omtaler leverandør- og verdikjederisiko blant de mest kritiske sårbarhetene, konsentrasjon hos få leverandører og fellesløsninger, mangler i endringshåndtering funnet ved tilsyn, beredskapstester som ikke alltid bygger på realistiske scenarioer, funn som ikke er fulgt opp systematisk, og at exit-planer skal testes. Analysen beskriver den felles eID-løsningen bankene bruker til innlogging og signering som et tydelig enkeltpunkt for svikt.
- Norske banker får som regel kjernebanksystemet levert og driftet av én av noen få eksterne leverandører.

Kilder:

- [ECB – Supervisory priorities 2026–28](https://www.bankingsupervision.europa.eu/framework/priorities/html/ssm.supervisory_priorities202511.en.html)
- [ECB – Supervisory priorities 2025–27](https://www.bankingsupervision.europa.eu/framework/priorities/html/ssm.supervisory_priorities202412~6f69ad032f.en.html)
- DORA-forordningen og Finanstilsynets risiko- og sårbarhetsanalyse 2026 (lenket fra «Om demoen»)

## 4. Produktmål

Demonstratoren skal:

1. Gjøre avhengigheter mellom banktjenester, systemer og leverandører forståelige.
2. La brukeren velge en simulert hendelse og se mulige konsekvenser på tvers av avhengighetskjeden.
3. Samle hendelsesstatus, beslutninger, ansvar og oppgaver i én kortfattet, oversiktlig, konkret og lesbar arbeidsflate.
4. Vise hvor datagrunnlag eller dokumentasjon mangler, uten å late som usikkerhet er bekreftet risiko.
5. Hjelpe banken å forebygge gjennom leverandørregister, vurdering av planlagte endringer og øvelser med oppfølging av funn.
6. Være selvforklarende, slik at den kan forstås uten presentatør.

## 5. Utenfor omfang

Demonstratoren skal ikke:

- kobles til reelle banker, kontoer, produksjonssystemer eller leverandør-API-er
- inneholde ekte kunde-, transaksjons-, sikkerhets- eller personopplysninger
- foreta automatisk risikoklassifisering eller hevde DORA-etterlevelse
- erstatte bankens beredskaps-, CMDB-, GRC-, overvåkings- eller hendelsessystemer
- utføre endringer, omstart eller failover i faktiske systemer
- la brukeren endre avhengighetskartet
- levere leverandørregisteret i et offisielt tilsynsformat

## 6. Brukere og hovedoppgaver

**Primær bruker:** Operativ risiko- eller teknologimedarbeider som undersøker en mulig driftsforstyrrelse.

**Sekundære brukere:** Beredskapsleder, tjenesteeier, leverandøransvarlig, endringsansvarlig eller leder som trenger et raskt konsekvensbilde.

Hovedoppgaver:

- finne en kritisk tjeneste og forstå hva den er avhengig av
- velge en hendelse, for eksempel bortfall hos skyleverandør eller feil etter systemendring
- undersøke hvilke tjenester og kanaler som kan rammes
- følge anbefalte kontrollspørsmål og registrere beslutninger
- se hvem som har ansvar for oppfølging, og hva som gjenstår
- lage en kort rapport med scenario, antakelser, påvirkning og tiltak
- se leverandørkjeder, exit-planer og hvor lett leverandører kan byttes ut
- vurdere en planlagt endring før den settes i drift
- kjøre en øvelse og følge opp funnene til de er lukket

## 7. Demonstratorflyt

1. Brukeren åpner introsiden og går til demoen.
2. Brukeren velger scenario: **Svikt hos leverandør** (hovedscenario) eller **Feil etter systemendring**, og hvilken leverandør eller hvilket system som feiler. Berørte land er forhåndsbestemt av leverandøren. Brukeren velger om scenarioet kjøres som hendelse eller øvelse.
3. Brukeren velger alvorlighet og varighet og beregner påvirkningen.
4. Påvirkning viser sammendrag og kartet, der direkte og indirekte avhengigheter er farget etter tilstand. Påvirkningen forklares som en beregnet demonstrasjon basert på oppgitte relasjoner.
5. Brukeren åpner et objekt for å se avhengighetskjede, eier, gjenopprettingsmål og datamangler.
6. Hendelsesrommet viser status, oppgaver, beslutningslogg, konsekvenser, kontrollspørsmål og tidslinje. En øvelse er merket «Øvelse» og har lenke for å registrere funn.
7. Brukeren kan vise og skrive ut en rapport («Øvelsesrapport» for øvelser).
8. Fra oppslagssidene kan brukeren gå gjennom leverandørregisteret, vurdere planlagte endringer og følge opp funn.

## 8. Produktkrav

«Målbilde» viser hvilken del av brukeropplevelsen i §2 kravet støtter. «Demonstratorens bevis» viser hvordan demonstratoren oppfyller det.

| ID | Sluttproduktkrav | Målbilde | Demonstratorens bevis | Prioritet |
|---|---|---|---|---|
| P-01 | Tjenester, systemer, team og leverandører skal ha synlig eier og kritikalitet | 1–2 | Syntetisk tjeneste- og avhengighetsregister | Må |
| P-02 | Avhengigheter skal kunne utforskes begge veier og vise kilde og aktualitet | 2 | Navigerbart kart med relasjonsmetadata | Må |
| P-03 | Analyse skal vise direkte og indirekte påvirkning på tjenester og kanaler | 3–4 | Forklarbar grafberegning for to scenarioer | Må |
| P-04 | Resultatet skal skille fakta fra antakelser, mangler og usikre relasjoner | 4 | Merking av syntetiske, antatte og manglende data | Må |
| P-05 | Hendelser og planlagte endringer skal kunne følges gjennom status og tidslinje | 3, 5 | Simulert hendelsesrom | Må |
| P-06 | Oppfølging skal ha ansvarlig rolle, frist, status og beslutningsgrunnlag | 5 | Oppgaver i demoen, uten ekstern arbeidsflytintegrasjon | Bør |
| P-07 | Beslutninger og endringer i vurderingen skal kunne etterprøves | 5–6 | Tidsstemplet demonstrasjonslogg | Bør |
| P-08 | Rapport skal oppsummere omfang, påvirkning, datagrunnlag, usikkerhet og tiltak | 6 | Utskrivbar rapport | Bør |
| P-09 | Data skal komme fra autoritative kilder med eierskap, tilgang og oppdateringsstatus | Sluttproduktfundament | Arkitekturkrav; ikke ekte integrasjon i demoen | Senere |
| P-10 | Tilgang til informasjon og handlinger skal styres etter rolle og minste privilegium | Alle | Krav før produksjonsbruk | Senere |
| P-11 | Brukeren skal kunne sammenligne scenarioer og tiltak | 4, 6 | Enkel scenario-sammenligning | Kan |
| P-12 | Besøkende skal kunne forstå og fullføre hoveddemoen uten presentatør eller konto | 2.1 | Selvforklarende start og guidet scenarioflyt | Må |
| P-13 | Demoen skal tydelig vise at konseptet er selvstendig, uten å nevne navngitte selskaper, og bruke bare syntetiske data | 2.1 | Synlig konsept-/syntetisk-data-merking | Må |
| P-14 | Lenken skal fungere ved direkte åpning, oppfrisking og mobilvisning | 2.1 | Responsiv demonstrator | Må |
| P-15 | Besøksdata skal ikke samles inn uten nødvendig formål og synlig informasjon | 2.1 | Ingen analyse- eller sporingsverktøy | Må |
| P-16 | Grensesnitt og innhold skal tilbys på norsk og engelsk | 2.1 | Språkvelger, med all tekst i språkfiler og oversatte tekstfelt i datasettet | Bør |
| P-17 | Leverandører og underleverandører i flere ledd skal kunne vises som et register med kritikalitet, understøttede tjenester, land, kilde og aktualitet | 1–2 | Siden «Leverandører» bygget på datasettet | Må |
| P-18 | Hver kritisk leverandør skal ha en exit-plan med status og en vurdering av hvor lett den kan byttes ut | 2, 4 | Exit-status og alternativer i leverandørregisteret | Må |
| P-19 | En planlagt endring skal kunne vurderes mot avhengighetskartet før driftssetting, med sporbar beslutning | 3–5 | Siden «Endringer» med forventet påvirkning, sjekkliste og godkjenning | Må |
| P-20 | Scenarioer skal kunne kjøres som øvelser, og funn skal følges opp til de er lukket | 5–6 | Øvelsesmodus og siden «Øvelser og funn» | Må |
| P-21 | Leverandørregisteret skal kunne eksporteres i et maskinlesbart format | 6 | Forenklet CSV-eksport merket som demo, ikke et offisielt tilsynsformat | Bør |
| P-22 | Brukeren skal kunne lære hvordan appen brukes, og hva den gir banken, uten presentatør | 2.1 | Animert veiledning med fire scenarioer som dekker alle delene av appen | Bør |

### 8.1 Demonstratorkrav

| ID | Demonstratorkrav | Knytning |
|---|---|---|
| D-01 | Bruke kun syntetiske bank-, system-, leverandør- og hendelsesdata | P-01, P-04 |
| D-02 | Vise minst 6 tjenester, 10 systemer og 4 leverandører | P-01, P-02 |
| D-03 | La brukeren følge relasjoner fra tjeneste til underliggende systemer og leverandører | P-02 |
| D-04 | Tilby scenario for leverandørsvikt og mislykket systemendring | P-03 |
| D-05 | Forklare påvirkning med relasjonssti, antakelser og datamangler | P-03, P-04 |
| D-06 | Vise hendelsesstatus, tidslinje og oppgaver samlet | P-05, P-06, P-07 |
| D-07 | Lage utskrivbar oppsummering av scenarioet | P-08 |
| D-08 | Merke alle data og beregninger som demonstrasjonsinnhold | P-04 |
| D-09 | Starte uten konto og tilby en synlig eksempelbank og scenarioflyt | P-12 |
| D-10 | Ha en kort selvforklarende introduksjon og kunne nullstille demonstrasjonen | P-12 |
| D-11 | Merke løsningen som selvstendig konsept og data som syntetiske | P-13 |
| D-12 | Unngå unødvendig innsamling av besøksdata | P-15 |
| D-13 | Vise grensesnittet på norsk og engelsk via språkvelger, med tekst samlet i språkfiler og datasettets tekstfelt strukturert per språk (`{ no: "…", en: "…" }`) | P-16 |
| D-14 | Vise alle leverandører i datasettet, med underleverandørkjeder og exit-status | P-17, P-18 |
| D-15 | Vise minst tre planlagte endringer, der minst én bør avvises fordi den rammer kritiske tjenester uten reserveløsning | P-19 |
| D-16 | Kjøre begge scenarioene som øvelse, med forhåndsutfylte funn og mulighet til å legge til egne | P-20 |
| D-17 | Lagre nye endringsvurderinger og funn bare i nettleserfanen, som resten av demoen | P-15, P-19, P-20 |
| D-18 | Eksportere leverandørregisteret som CSV | P-21 |
| D-19 | Vise en oversikt over fire scenarioer (leverandør svikter, planlagt endring, leverandørkontroll, øvelse og funn) og en animert gjennomgang av hvert, med datasettets egne navn og tall, faner for stegene og knappene Forrige, Se på nytt, Pause og Neste | P-22 |

## 9. Funksjonelle krav

| ID | Krav | Prioritet |
|---|---|---|
| F-01 | Vise fiktive kritiske banktjenester, interne systemer og eksterne leverandører | Må |
| F-02 | Vise relasjoner som et navigerbart avhengighetskart | Må |
| F-03 | Tilby minst to scenarioer: leverandør-/skysvikt og mislykket systemendring | Må |
| F-04 | Beregne og forklare direkte og indirekte påvirkning ut fra registrerte relasjoner | Må |
| F-05 | Skille tydelig mellom bekreftede demo-inputs, antakelser og manglende informasjon | Må |
| F-06 | Vise hendelsesstatus, tidslinje, ansvarlig rolle og oppgaver | Må |
| F-07 | Tillate justering av scenarioets omfang og varighet | Bør |
| F-08 | Eksportere en kort rapport med scenario, påvirkning, antakelser og tiltak | Bør |
| F-09 | Filtrere kartet etter tjeneste, leverandør, kritikalitet og status | Bør |
| F-10 | Vise sammenligning mellom to scenarioer | Kan |
| F-11 | Vise et leverandørregister med underleverandører i flere ledd | Må |
| F-12 | Vise exit-plan, status og byttbarhet per leverandør | Må |
| F-13 | Vurdere en planlagt endring mot kartet og registrere beslutning med begrunnelse | Må |
| F-14 | Starte et scenario som øvelse og merke hendelsesrom og rapport deretter | Må |
| F-15 | Registrere funn med ansvarlig, frist og status, og vise alle åpne funn samlet | Må |
| F-16 | Eksportere leverandørregisteret som CSV | Bør |

### 9.1 Regler for de nye sidene

- **Leverandører:** Nøkkeltall viser leverandører med avtale, underleverandører uten avtale, leverandører som mangler exit-plan og exit-planer som aldri er testet. Registeret viser ledd 1 og 2, der underleverandører står rett under leddet over, og tjenester som avhenger av leverandøren beregnes med påvirkningsmotoren. Exit-data vises bare i ledd 1, der avtalen er; en leverandør som også står lavere i en kjede, henviser til ledd 1. En vurdering eldre enn ett år merkes som utdatert.
- **CSV-eksport:** Semikolon som skilletegn og UTF-8 med BOM, så fila åpnes riktig i regneark med norske innstillinger. Kolonnene følger registeret: leverandør, ledd, leverandør i leddet over, kritikalitet, tjenestetype, land, tjenester som avhenger, kontraktseier, exit-plan, byttbarhet, sist vurdert, exit-plan sist testet og syntetiske data. Fila er merket som demo i filnavnet.
- **Endringer:** Nøkkeltall viser planlagte, ventende, godkjente og avviste endringer. Vurderingen viser fakta, hva som rammes hvis endringen feiler (bortfall i systemet gjennom hele vedlikeholdsvinduet, med samme beregning og sammendrag som Påvirkning), kartet, sjekkliste, åpne funn for systemet og beslutningslogg. En endring kan bare godkjennes når alle sjekkpunkter er kontrollert; avvisning kan alltid registreres. Utfallet er ikke forhåndsvalgt, og valgt endring ligger i adressen.
- **Øvelser og funn:** Nøkkeltall viser gjennomførte øvelser og åpne, pågående og lukkede funn. Øvelsene vises med scenario, dato, deltakere (roller), leverandører som deltok og antall funn. Funn vises med kilde, ansvarlig, frist og status, kan filtreres på «Ikke lukket» og «Alle», og status endres i listen. Hver øvelse som startes, legges til i listen.
- **Lagring:** Sjekklister, beslutninger, øvelser og funn lagres i nettleserfanen og nullstilles med «Nullstill demo».

## 10. Ikke-funksjonelle krav

- **Sikkerhet:** Ingen hemmeligheter eller sensitive opplysninger i klientkode eller demo-data.
- **Personvern:** Ingen innlogging; ingen brukerdata samles inn. Valg lagres bare i nettleserfanen (sessionStorage).
- **Tilgjengelighet:** Tastaturnavigasjon, synlige fokusmarkører (også på knapper med skygge), kontrast minst 4.5:1 for tekst og tekstalternativer til fargekoding. Tabeller som ruller sideveis kan nås med tastaturet.
- **Responsivitet:** Brukbar fra 360 px mobil til stor skjerm uten at siden ruller sideveis; kartet har en alternativ liste-/detaljvisning på små skjermer, og brede tabeller ruller inne i kortet.
- **Inndata:** Alle fritekstfelt har grenser og tegnfilter. Søk i kartet: maks 60 tegn, bokstaver, tall, mellomrom og enkle skilletegn. Beslutning og begrunnelse: 3–500 tegn. Funn: maks 120 tegn. Tillatt er bokstaver (alle språk), tall, linjeskift og vanlig tegnsetting; kontrolltegn, emoji og markup fjernes også ved innliming. Tekst vises alltid som ren tekst. Lagret tilstand valideres felt for felt ved innlasting, slik at gammel eller ødelagt lagring aldri krasjer appen.
- **Bufring:** Produksjonsbygget gir filnavn med innholdshash, slik at nye versjoner alltid lastes etter publisering. Biblioteker ligger i egne filer som kan gjenbrukes fra nettleserens cache når bare appkoden endres.
- **Sporbarhet:** Påvirkningsberegningen skal kunne forklares gjennom synlige relasjoner og regler.
- **Forståelighet:** Scenario og alle verdier er merket som syntetiske, også på utskrift av rapporten. Samme begreper brukes på alle sider (Bortfall, Redusert, Mulig bortfall, Over gjenopprettingsmål).
- **Språk:** Ingen brukerrettet tekst skrives direkte i komponentkoden; datoer og tall formateres etter valgt språk.
- **Robusthet:** Tomme, manglende eller motstridende relasjoner vises som datamangler og skjules ikke. Ukjente lenker, objekter og endringer gir en forståelig side, ikke en feil.
- **Navngitte selskaper:** Ingen virkelige selskaper nevnes i grensesnitt, data, dokumentasjon eller sidemetadata.

## 11. Data og demonstrasjonsmodell

Objekter:

- **Tjeneste:** navn, kritikalitet, tjenesteeier, kanaler, gjenopprettingsmål
- **System:** navn, miljø, driftsstatus, teknisk eier
- **Leverandør:** navn, tjenestetype, land/regioner, kritikalitet, alternativer, direkte avtale (ja/nei), kontraktseier, exit-plan (finnes, under arbeid, mangler), byttbarhet (lett, krevende, ikke mulig), sist vurdert, exit-plan sist testet. Ledd i leverandørkjeden (1 = direkte avtale, 2 = underleverandør osv.) beregnes fra underleverandørkoblingene, slik DORA-registeret krever for tjenester som støtter kritiske eller viktige funksjoner.
- **Avhengighet:** fra-objekt, til-objekt, type, kritikalitet, datakilde/gyldighetsstatus, regioner
- **Scenario:** feiltype, starttid, omfang, varighet, berørte komponenter
- **Hendelse:** status, tidslinje, beslutninger, oppgaver og ansvarlig rolle
- **Planlagt endring:** id, system som endres, planlagt tidspunkt, risiko, tilbakerulling testet, sjekkpunkter, beslutning og begrunnelse
- **Øvelse:** scenario, dato, deltakere (roller), leverandører som deltok, funn
- **Funn:** tittel, kilde (øvelse eller hendelse), ansvarlig rolle, frist, status (åpen, under arbeid, lukket)

Innhold i datasettet for Morild Bank:

- **Leverandører:** Åtte leverandører med direkte avtale, blant dem en kjernebankleverandør som leverer og drifter kjernebanksystemet og en felles eID-løsning for innlogging. To underleverandører uten avtale med banken (fjerdeparter) viser kjeder i flere ledd. Koblingene til dem er «myke», fordi leverandørene over har andre plattformer eller land i reserve. Én vurdering er utdatert og én er aldri gjort. Exit-planene er testet for to leverandører.
- **Planlagte endringer:** Fire endringer. Én er godkjent som eksempel, én (integrasjonsplattformen, høy risiko, tilbakerulling ikke testet) bør avvises, og to venter på vurdering. Forventet påvirkning beregnes med samme motor som scenarioene.
- **Øvelser og funn:** To bordøvelser, én per scenario, og åtte funn. Sju kommer fra øvelsene og ett fra en tidligere hendelse etter en endring. Ett funn gjelder at skyleverandøren ikke deltok i øvelsen. Funnene har status åpen, under arbeid eller lukket, og peker på objekter i kartet.
- Rapporteringsoppgaven i hendelsesrommet bruker DORA-begrepet «alvorlig IKT-relatert hendelse».

Alle poster merkes `synthetic: true`. Brukerrettede tekstfelt (navn, beskrivelser, scenario- og oppgavetekster) lagres per språk (`no` og `en`). Rapporten gjentar at dataene er oppdiktede.

## 12. Skjermer

1. **Tjenesteoversikt:** tjenestestatus og indikatorer for datakvalitet.
2. **Scenario:** valg av feiltype, komponent, alvorlighet, varighet og om scenarioet kjøres som hendelse eller øvelse.
3. **Påvirkning:** sammendrag, avhengighetskart med filter og søk (eller liste), detaljer og usikkerheter i datagrunnlaget.
4. **Hendelsesrom:** status, oppgaver, beslutningslogg, konsekvenser, kontrollspørsmål og tidslinje.
5. **Rapport:** kort, utskrivbar oppsummering av simuleringen.
6. **Leverandører:** register med underleverandørkjeder, exit-status og eksport.
7. **Endringer:** liste over planlagte endringer, vurdering med forventet påvirkning og beslutning.
8. **Øvelser og funn:** øvelser som er kjørt, og alle funn med status.
9. **Veiledning:** først en oversikt med fire kort, ett per scenario (tittel, én setning og antall steg):
   - *Leverandør svikter* (4 steg, de samme som hovedflyten): Scenario, Påvirkning (kartet med «Bare berørte», klikk på leverandøren og detaljer), Hendelsesrom og Rapport.
   - *Planlagt endring* (4 steg): velg endring, se hva den kan ramme, gå gjennom sjekklisten, avvis med begrunnelse.
   - *Leverandørkontroll* (4 steg): kritiske tjenester, leverandørkjeden i ledd 1 og 2, hull i exit-planene, last ned CSV.
   - *Øvelse og funn* (4 steg): kjør som øvelse, hendelsesrom merket «Øvelse», registrer funn, følg opp til lukket.

   Et valgt scenario vises alene, med «← Alle scenarioer» og scenarioets navn øverst. Under navnet rulles teksten for steget ut bokstav for bokstav, omtrent 22 tegn i sekundet. I steg 1 innledes scenarioet med hva det viser og hvorfor det er viktig. I alle stegene følger nytten for banken, koblet til krav og funn fra Finanstilsynet med kildelenke der det finnes. Nytten har ingen egen overskrift og står ikke i en boks. Mens teksten rulles ut, står knappen «Hopp frem» til høyre for navnet; den viser hele teksten med en gang. Når teksten er ferdig, vises «Fortsett». Først da vises knappene (Forrige, Se på nytt, Pause, Neste) og stegfanene, og en forenklet utgave av siden i appen spilles i rolig tempo: én musepeker glir fra sted til sted, klikker på knapper og valg og fyller ut feltene. Linjen øverst i skjermbildet viser bare navnet på siden i appen. Steg 2 i «Leverandør svikter» viser det samme kartet som «Påvirkning», med filtre, tegnforklaring og detaljpanel.

   Et steg går ikke videre av seg selv. Når skjermbildet er ferdig spilt, vises «Fortsett» under det; den går til neste steg og spiller det. «Neste», «Forrige» og stegfanene åpner et steg uten å spille det. «Se på nytt» spiller skjermbildet i steget fra start, og «Pause» fryser avspillingen. Når siste steg i et scenario er ferdig, viser en klokke at neste scenario starter om 10 sekunder, med knappen «Start nå». Etter siste scenario vises en avslutning med lenke til demoen. Piltastene går fram og tilbake, teksten leses opp av skjermlesere, og skjermbildene kan ikke fokuseres med tastaturet. Med redusert bevegelse vises hvert steg ferdig.
10. **Om demoen:** beregningsregler, begrensninger, personvern, teknologi, bakgrunn og kilder (§14).

## 13. Teknisk løsning

Statisk webapp med et lite JSON-datasett og beregning av påvirkning i nettleseren.

- **Rammeverk:** React, Vite og TypeScript.
- **Graf:** React Flow (`@xyflow/react`) med et eget båndoppsett: én kolonne per objekttype (leverandører → systemer → tjenester → kanaler). Rekkefølgen velges for å gi færrest kryssende piler, oppsettet strekkes til kartrammens høyde, og hver boks flyttes dit færrest mulig streker går gjennom bokser. Nodene er vanlige DOM-elementer, noe som gir tastaturfokus, skjermleserstøtte, språkfiler og egen styling.
- **Ruting:** Hash-baserte URL-er, slik at direkte lenker og oppfrisking fungerer på statisk hosting.
- **Språk:** i18n-oppsett med norsk og engelsk språkfil.
- **Hosting:** Statisk hosting på Cloudflare Pages. Bygg med `npm run build`, utdata i `dist`.
- **Tester:** Enhetstester for påvirkningsberegningen, leverandørkjedene og lagringen av demotilstanden.

Et produksjonsprodukt kan utvides med API, database, tilgangsstyring, import av kundens tjeneste- og leverandørregistre, revisjonsspor og integrasjoner.

## 14. Innhold på «Om demoen»

Teksten ligger i språkfilene (`no.ts` og `en.ts`); den norske versjonen står her.

**Hva er dette?** Bank Resilience Map er en uavhengig konseptdemo som viser hvordan en bank raskt kan forstå følgene når en IT-leverandør eller et system svikter, og hvordan den kan forebygge at det skjer. Den kobler bankens kritiske tjenester og kundekanaler til systemene og leverandørene de er avhengige av, og viser hvordan en feil sprer seg gjennom kjeden.

**Slik er demoen bygget opp**

1. **Scenario:** Velg svikt hos en leverandør eller feil etter en systemendring, med alvorlighet og varighet.
2. **Påvirkning:** Se hvilke tjenester og kanaler som rammes, hvorfor, og hvilke som er nede lenger enn gjenopprettingsmålet. Usikre og utdaterte avhengighetsdata merkes tydelig i stedet for å bli skjult.
3. **Hendelsesrom:** Følg status, oppgaver med ansvarlig rolle, beslutningslogg og tidslinje på ett sted.
4. **Rapport:** Få en utskrivbar oppsummering med antakelser, datamangler og tiltak.

**Hvorfor dette området?** Bankene må kunne dokumentere hvordan de tåler svikt hos IKT-leverandører, og mange mangler verktøy for å se sammenhengene.

- **Krav fra myndighetene.** DORA har gjeldt i Norge siden 1. juli 2025. Bankene skal blant annet føre et register over IKT-leverandører og underleverandørene deres, ha exit-planer og teste beredskapen. Registeret skal rapporteres til Finanstilsynet, og neste frist er 15. mars 2027.
- **Finanstilsynets funn.** I risiko- og sårbarhetsanalysen for 2026 trekker Finanstilsynet fram leverandør- og verdikjederisiko blant de mest kritiske sårbarhetene, og peker på konsentrasjon hos få leverandører og fellesløsninger. Den felles løsningen for elektronisk identifisering beskrives som et tydelig enkeltpunkt for svikt. Tilsyn har avdekket mangler i endringshåndteringen. Beredskapstester bygger ikke alltid på realistiske scenarioer, og funn fra tester og øvelser er ikke alltid fulgt opp systematisk.
- **Behovet i bankene.** Når noe svikter, må ledelsen raskt vite hvilke kunder og tjenester som rammes, og hvor sikkert bildet er. Den informasjonen ligger ofte spredt i ulike registre og hos enkeltpersoner.

Konseptet er derfor ikke et nytt rapporteringskrav, men et arbeidsverktøy som gjør dataene bankene uansett må samle inn etter DORA, nyttige i en reell hendelse.

**Hvem kan tilby dette?**

- Leverandører av kjernebank, betaling og driftstjenester støtter ofte bankenes kritiske funksjoner og må derfor med i bankenes leverandørregister. De kjenner allerede kundenes systemlandskap.
- Bankene må hente opplysninger om underleverandørene fra leverandørene sine. En slik leverandør kan levere disse opplysningene ferdig strukturert, rett inn i bankenes register, i stedet for at hver bank samler dem inn for hånd.
- Konseptet kan leveres som en felles tjeneste for mange banker, på samme måte som andre delte banktjenester.

**Nytt i versjon 2.0 – fra hendelse til forebygging.** Tre nye deler bygger på samme avhengighetskart og beregning:

- **Leverandører:** Register over leverandører og underleverandører i flere ledd, med exit-plan, når planen sist ble testet, og hvor lett leverandøren kan byttes ut.
- **Endringer:** Viser hvilke tjenester og kunder en planlagt endring kan ramme, før den settes i drift, med sjekkliste og godkjenning.
- **Øvelser og funn:** Kjør scenarioer som øvelser og følg opp funnene til de er lukket.

I tillegg har siden delene Slik beregnes påvirkningen, Begrensninger, Personvern, Teknologi og Bakgrunn (kilder: ECB-prioriteringer 2025–27 og 2026–28, DORA-forordningen og Finanstilsynets risiko- og sårbarhetsanalyse 2026).

## 15. Akseptansekriterier

1. Brukeren kan gå fra scenario til berørte tjenester uten hjelp.
2. Hver markert påvirkning kan spores gjennom synlige avhengigheter.
3. Manglende data og antakelser er synlige og påvirker ikke resultatet stilltiende.
4. Brukeren kan følge hendelsens tidslinje og se ansvar og oppgaver.
5. Rapporten viser scenario, påvirkede tjenester, antakelser og syntetisk datamerking.
6. Hovedflyten fungerer på mobil og med tastatur.
7. Alle leverandører i datasettet vises i registeret, med underleverandørkjede, exit-status og byttbarhet, og registeret kan eksporteres som CSV.
8. Brukeren kan vurdere en planlagt endring, se forventet påvirkning i kartet og registrere en beslutning med begrunnelse.
9. Brukeren kan kjøre et scenario som øvelse, registrere funn og se alle åpne funn samlet.
10. Tallene og begrepene i de nye sidene stemmer med kart, sammendrag og rapport.
11. Alt innhold finnes på norsk og engelsk.
12. Brukeren kan åpne «Veiledning», velge et scenario og se det spilt steg for steg, med pause, gjentakelse og navigasjon mellom stegene.
