"""Genererer src/data/morild-bank.json. Kjøres ved endringer i datasettet.
All data er oppdiktet (syntetisk)."""
import json, pathlib

# Engelske oversettelser ligger i translations-en.json (norsk tekst -> engelsk tekst).
EN = json.loads((pathlib.Path(__file__).resolve().parent/"translations-en.json").read_text(encoding="utf-8"))
MISSING = []
def T(s):
    if s not in EN: MISSING.append(s)
    return {"no": s, "en": EN.get(s, s)}

nodes = []
def node(id, kind, name, desc, crit, owner, status="operational", gaps=None, **extra):
    n = {"id": id, "kind": kind, "name": T(name), "description": T(desc), "criticality": crit,
         "owner": T(owner), "status": status}
    if gaps: n["dataGaps"] = [T(g) for g in gaps]
    n.update(extra); n["synthetic"] = True
    nodes.append(n)

# Kanaler
node("ch-mobile","channel","Mobilbank","Bankens app for privatkunder.","critical","Leder digitale kanaler")
node("ch-web","channel","Nettbank","Nettleserbasert bank for privat- og småbedriftskunder.","critical","Leder digitale kanaler")
node("ch-contact","channel","Kundesenter","Telefon og chat med rådgivere.","high","Leder kundesenter")
node("ch-pos","channel","Kort i butikk og på nett","Kortbetaling hos brukersteder.","critical","Tjenesteeier kort")

# Tjenester
def svc(id,name,desc,crit,owner,rto,rpo,**kw): node(id,"service",name,desc,crit,owner,rtoMinutes=rto,rpoMinutes=rpo,**kw)
svc("svc-accounts","Kontooversikt og saldo","Viser kontoer, saldo og bevegelser.","critical","Tjenesteeier dagligbank",240,15)
svc("svc-payments","Innenlands betaling","Regningsbetaling og overføringer mellom kontoer.","critical","Tjenesteeier betaling",120,0)
svc("svc-cards","Kortbetaling","Autorisasjon av kortkjøp i butikk og på nett.","critical","Tjenesteeier kort",60,0)
svc("svc-login","Innlogging og identifisering","Sikker innlogging for kunder i digitale kanaler.","critical","Leder identitet og tilgang",60,0)
svc("svc-loans","Lånesøknad","Søknad og kredittvurdering for forbrukslån og boliglån.","high","Tjenesteeier kreditt",1440,60)
svc("svc-support","Kundehenvendelser","Saksbehandling av henvendelser fra kunder.","medium","Leder kundesenter",480,60)
svc("svc-notify","Varsler og meldinger","SMS- og push-varsler om betalinger, innlogging og mistenkelig aktivitet.","medium","Tjenesteeier kundekommunikasjon",720,60,status="degraded",
    gaps=["Varslingstjenesten har meldt forsinkede SMS-er siste døgn; årsak er ikke registrert."])
svc("svc-aml","Transaksjonsovervåking (AML)","Overvåking av transaksjoner for hvitvasking og svindel.","high","Leder hvitvaskingskontroll",1440,240)

# Systemer
def sys_(id,name,desc,crit,owner,env,**kw): node(id,"system",name,desc,crit,owner,environment=env,**kw)
sys_("sys-core","Kjernebanksystem","Konti, saldo og posteringer. Leveres og driftes av kjernebankleverandøren.","critical","Forvaltning kjernebank","managed")
sys_("sys-pay","Betalingsmotor","Behandler og sender betalinger til avregning.","critical","Betalingsteamet","onPrem")
sys_("sys-card","Kortplattform","Kobler bankens kort mot kortprosessøren.","critical","Kortteamet","saas")
sys_("sys-api","Integrasjonsplattform (API)","Felles API-lag mellom kanaler og bakenforliggende systemer.","critical","Integrasjonsteamet","cloud",
     gaps=["Flytting til Sverige ved bortfall er planlagt, men ikke etablert."])
sys_("sys-iam","Identitetsplattform","Innlogging, sesjoner og tilgangskontroll for kunder.","critical","IAM-teamet","cloud")
sys_("sys-mob","Mobilbank-backend","Serverlogikk for mobilappen.","critical","Mobilteamet","cloud")
sys_("sys-web","Nettbankplattform","Webapplikasjon for nettbanken.","critical","Nettbankteamet","cloud")
sys_("sys-loan","Lånemotor","Søknadsbehandling og saksflyt for lån.","high","Kredittteamet","cloud")
sys_("sys-credit","Kredittvurdering","Henter kredittopplysninger og beregner betjeningsevne.","high","Kredittteamet","cloud")
sys_("sys-crm","Kundesaksbehandling (CRM)","Saksbehandlingsverktøy for kundesenteret, levert som SaaS.","medium","CRM-forvalter","saas")
sys_("sys-notify","Varslingstjeneste","Sender SMS- og push-varsler.","medium","Kommunikasjonsteamet","cloud",status="degraded")
sys_("sys-aml","Overvåkingsmotor (AML)","Regelmotor for mistenkelige transaksjoner.","high","Analyseteamet","onPrem")
sys_("sys-dwh","Datavarehus","Samler transaksjonsdata for analyse og rapportering.","high","Analyseteamet","cloud")

# Leverandører
def prv(id,name,desc,crit,owner,stype,regions,alt,exit=None,**kw):
    # exit = (kontraktseier, exit-plan, byttbarhet, sist vurdert, sist testet) for leverandører med direkte avtale (2.0).
    # Uten exit er leverandøren en underleverandør (fjerdepart) uten avtale med banken.
    extra = {"directContract": exit is not None}
    if exit:
        co, plan, sub, assessed, tested = exit
        extra.update({"contractOwner": T(co), "exitPlan": plan, "substitutability": sub, "lastAssessed": assessed, "exitTested": tested})
    node(id,"provider",name,desc,crit,owner,serviceType=T(stype),regions=regions,alternatives=T(alt),**extra,**kw)
prv("prv-nimbus","Nimbus Sky","Skyplattform for bankens skybaserte systemer.","critical","Leverandøransvarlig sky","Skyplattform (IaaS/PaaS)",["no","se","dk","fi"],
    "Datasentre i andre nordiske land hos samme leverandør. Ingen avtale med alternativ skyleverandør.",
    exit=("Innkjøpsleder IT","inProgress","hard","2026-05-15",None))
prv("prv-kortnord","KortNord Prosessering","Prosesserer kortautorisasjoner for flere nordiske banker.","critical","Tjenesteeier kort","Kortprosessering",["no","dk"],
    "Stand-in-autorisasjon med reservegrenser i inntil 4 timer.",
    exit=("Tjenesteeier kort","exists","hard","2026-06-20","2025-10-08"))
prv("prv-clearing","Avregningssentralen","Felles infrastruktur for avregning av betalinger.","critical","Tjenesteeier betaling","Betalingsinfrastruktur",["no"],
    "Ingen alternativ leverandør. Manuell beredskapsrutine for hastebetalinger.",
    exit=("Tjenesteeier betaling","missing","notPossible","2026-03-02",None))
prv("prv-saksflyt","Saksflyt AS","Leverer saksbehandlingsverktøyet for kundesenteret.","medium","CRM-forvalter","SaaS – saksbehandling",["no"],
    "Kundesenteret kan registrere saker i regneark midlertidig.",
    exit=("CRM-forvalter","exists","easy","2025-09-10",None),
    gaps=["Leverandøren har ikke oppgitt hvilken skyleverandør og hvilket land tjenesten kjører i."])
prv("prv-kredittdata","Kredittdata Norden","Leverer kredittopplysninger.","high","Tjenesteeier kreditt","Kredittopplysning",["no","se","fi"],
    "Manuell kredittvurdering for prioriterte søknader.",
    exit=("Tjenesteeier kreditt","exists","easy","2026-02-01","2026-02-01"))
prv("prv-smslinje","SMS-Linje","SMS-gateway for utsending av varsler.","medium","Tjenesteeier kundekommunikasjon","SMS-gateway",["se","dk"],
    "Push-varsler i mobilbanken.",
    exit=("Tjenesteeier kundekommunikasjon","missing","easy",None,None))
prv("prv-kjerne","Kjernedrift Nord","Leverer og drifter kjernebanksystemet for Morild Bank og flere andre banker.","critical","Leverandøransvarlig kjernebank","Kjernebank som driftet tjeneste",["no"],
    "Ingen alternativ leverandør på kort sikt. Bytte av kjernebankleverandør er et flerårig prosjekt.",
    exit=("Innkjøpsleder IT","inProgress","hard","2026-04-10",None))
prv("prv-eid","Bankfelles eID","Felles elektronisk identifisering som mange banker bruker til innlogging og signering.","critical","Leder identitet og tilgang","Elektronisk identifisering (eID)",["no"],
    "Ingen fullgod reserveløsning. Kundesenteret kan hjelpe kunder, men digital innlogging stopper.",
    exit=("Leder identitet og tilgang","missing","notPossible","2026-05-30",None))
# Underleverandører (fjerdeparter) uten avtale med banken (2.0)
prv("prv-datahall","Datahall Vest","Driver datasenteret der KortNord Prosessering har sin norske plattform.","high","Tjenesteeier kort","Datasenter (kolokasjon)",["no"],
    "Ukjent. KortNord oppgir at Danmark kan ta all trafikk.")
prv("prv-nordnett","Nordnett Mobil","Mobiloperatør som leverer SMS-utsendingen videre for SMS-Linje.","medium","Tjenesteeier kundekommunikasjon","Mobilnett og SMS-utsending",["se","dk"],
    "Ukjent. Avtalen er mellom SMS-Linje og operatøren.")

deps = []
def dep(f, t, type="uses", strength="hard", source="Tjenestekatalog", confirmed="2026-08-20", validity="confirmed", regions=None, note=None):
    d = {"id": f"{f}__{t}", "from": f, "to": t, "type": type, "strength": strength}
    if regions is not None: d["regions"] = regions
    d.update({"source": T(source), "lastConfirmed": confirmed, "validity": validity})
    if note: d["note"] = T(note)
    d["synthetic"] = True
    deps.append(d)

CMDB, TK, LR = "CMDB", "Tjenestekatalog", "Leverandørregister"
# Kanaler
dep("ch-mobile","sys-mob",source=CMDB,confirmed="2026-09-12")
dep("ch-mobile","svc-login")
dep("ch-mobile","svc-accounts",strength="soft")
dep("ch-mobile","svc-payments",strength="soft")
dep("ch-mobile","svc-notify",strength="soft")
dep("ch-web","sys-web",source=CMDB,confirmed="2026-09-12")
dep("ch-web","svc-login")
dep("ch-web","svc-accounts",strength="soft")
dep("ch-web","svc-payments",strength="soft")
dep("ch-web","svc-loans",strength="soft")
dep("ch-contact","svc-support",confirmed="2026-06-02")
dep("ch-contact","svc-accounts",strength="soft",confirmed="2026-06-02")
dep("ch-pos","svc-cards",confirmed="2026-10-01")
# Tjenester
dep("svc-accounts","sys-core",confirmed="2026-10-10")
dep("svc-accounts","sys-api",confirmed="2026-10-10")
dep("svc-payments","sys-pay",confirmed="2026-10-10")
dep("svc-payments","sys-api",confirmed="2026-10-10")
dep("svc-cards","sys-card",confirmed="2026-10-01")
dep("svc-login","sys-iam",confirmed="2026-09-30")
dep("svc-loans","sys-loan",source="Workshop med tjenesteeier",confirmed="2026-03-14")
dep("svc-loans","sys-credit",source="Workshop med tjenesteeier",confirmed="2026-03-14")
dep("svc-support","sys-crm",confirmed="2026-06-02")
dep("svc-support","sys-core",strength="soft",confirmed="2026-06-02",note="Rådgivere kan svare på generelle spørsmål uten kontoinformasjon.")
dep("svc-notify","sys-notify",confirmed="2025-05-20")
dep("svc-aml","sys-aml",confirmed="2026-07-01")
# Systemer
dep("sys-pay","sys-core",source=CMDB,confirmed="2026-09-12")
dep("sys-core","prv-kjerne",type="runsOn",source=LR,confirmed="2026-04-30",regions=["no"],note="Driftes i leverandørens to datasentre i Norge.")
dep("sys-iam","prv-eid",source=LR,confirmed="2026-04-30",regions=["no"],note="Kundene logger inn med felles eID. Bankens egen plattform håndterer sesjoner og tilganger.")
dep("sys-pay","prv-clearing",source=LR,confirmed="2026-04-30",regions=["no"])
dep("sys-card","prv-kortnord",source=LR,confirmed="2026-04-30",regions=["no","dk"],note="Aktiv-aktiv i Norge og Danmark.")
dep("sys-card","sys-core",strength="soft",source=CMDB,confirmed="2026-09-12",note="Kortautorisasjon kan kjøre med reservegrenser (stand-in) uten kjernebanken.")
dep("sys-api","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["no"],note="Kjører bare i Norge.")
dep("sys-iam","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["no","se"],note="Aktiv-aktiv i Norge og Sverige.")
dep("sys-mob","sys-api",source=CMDB,confirmed="2026-09-12")
dep("sys-mob","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["no"])
dep("sys-web","sys-api",source=CMDB,confirmed="2026-09-12")
dep("sys-web","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["no","se"])
dep("sys-loan","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["no"])
dep("sys-loan","sys-core",source=CMDB,confirmed="2026-09-12")
dep("sys-credit","prv-kredittdata",source=LR,confirmed="2026-04-30",regions=["no"])
dep("sys-credit","sys-api",type="dataFeed",source="Antatt ut fra integrasjonsoppsett",confirmed=None,validity="assumed",
    note="Ikke bekreftet i arkitekturdokumentasjonen.")
dep("sys-crm","prv-saksflyt",type="runsOn",source=LR,confirmed="2026-04-30",regions=["no"])
dep("sys-notify","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-02-11",note="Land er ikke registrert i CMDB.")
dep("sys-notify","prv-smslinje",source=LR,confirmed="2026-04-30",regions=["se"],note="Bruker bare SMS-Linjes plattform i Sverige.")
dep("sys-aml","sys-dwh",type="dataFeed",source="Arkitekturdokumentasjon",confirmed="2025-01-15")
dep("sys-dwh","prv-nimbus",type="runsOn",source=CMDB,confirmed="2026-09-12",regions=["se"])
# Fjerdepartsavhengighet
dep("prv-saksflyt","prv-nimbus",type="subcontractor",source="Leverandørens egenerklæring",confirmed=None,validity="assumed",
    note="Saksflyt oppgir å bruke «en nordisk skyleverandør». Antatt Nimbus Sky; land ukjent.")
dep("prv-kortnord","prv-datahall",type="subcontractor",strength="soft",source="Leverandørens egenerklæring",confirmed="2026-04-30",regions=["no"],
    note="Gjelder bare den norske plattformen. Den danske plattformen driftes i KortNords eget datasenter.")
dep("prv-smslinje","prv-nordnett",type="subcontractor",strength="soft",source="Leverandørens egenerklæring",confirmed="2024-10-02",regions=["se"])

def L(xs): return [T(x) for x in xs]
scenarios = [
 {"id":"sky-region","title":T("Svikt hos leverandør"),
  "summary":T("En leverandør melder om bortfall. Hvilke tjenester og kanaler kan rammes, og hvor er bildet usikkert?"),
  "failureType":"regionalProviderOutage",
  "defaults":{"targetId":"prv-nimbus","regions":["no","se","dk","fi"],"severity":"outage","durationMinutes":240},
  "durationOptions":[60,240,720,1440],"startTime":"2026-11-03T07:42:00",
  "assumptions":L(["Leverandørens statusside er eneste kilde til omfanget den første halvtimen.",
     "Systemer som kjører i flere land, flytter trafikken automatisk til landet som virker, men med redusert kapasitet.",
     "Kjernebanksystemet og systemene i Morilds eget datasenter kjører ikke hos skyleverandøren og er ikke direkte berørt."]),
  "controlQuestions":L(["Har leverandøren bekreftet omfang og forventet gjenopprettingstid?",
     "Finnes det reserveløsninger eller alternative leverandører for de berørte tjenestene?",
     "Må kunder informeres i kanalene som fortsatt virker?",
     "Skal hendelsen vurderes for rapportering etter bankens rutiner for IKT-hendelser? (Vurderes av ansvarlig rolle, ikke av verktøyet.)"]),
  "timeline":[{"offsetMinutes":o,"text":T(t)} for o,t in [
     (0,"Overvåkingen varsler feil i tjenester som bruker leverandøren."),
     (6,"Leverandøren bekrefter en hendelse med redusert tilgjengelighet."),
     (15,"Beredskapsleder åpner hendelsesrom og kaller inn berørte team."),
     (30,"Første konsekvensbilde deles med ledelsen."),
     (45,"Kundesenteret får standardsvar om innloggings- og betalingsproblemer.")]],
  "tasks":[{"id":f"sky-t{i}","title":T(t),"role":T(r),"dueMinutes":d} for i,(t,r,d) in enumerate([
     ("Bekreft omfang og forventet gjenoppretting med leverandøren","Leverandøransvarlig",30),
     ("Vurder om berørte systemer kan flyttes eller kjøres på en reserveløsning","Teknisk hendelsesleder",60),
     ("Publiser driftsmelding i kanalene som virker","Kommunikasjonsansvarlig",45),
     ("Informer kundesenteret om berørte tjenester","Beredskapsleder",45),
     ("Vurder om hendelsen skal rapporteres som alvorlig IKT-relatert hendelse","Operasjonell risiko",120)],1)],
  "decisions":[dict({"offsetMinutes":o,"text":T(t),"role":T(r)}, **({"taskId":k} if k else {})) for o,t,r,k in [
     (20,"Hendelsen klassifiseres foreløpig som alvorlig. Hendelsesrom etableres.","Beredskapsleder",None),
     (40,"Ingen manuell flytting før leverandøren har bekreftet omfanget.","Teknisk hendelsesleder","sky-t2")]],
  "synthetic":True},
 {"id":"failed-change","title":T("Feil etter systemendring"),
  "summary":T("En planlagt oppgradering (endring CHG-2026-114) gir feil i produksjon. Hva avhenger av komponenten som ble endret?"),
  "failureType":"failedChange",
  "defaults":{"targetId":"sys-api","regions":[],"severity":"outage","durationMinutes":120},
  "durationOptions":[30,120,240,480],"startTime":"2026-11-04T22:15:00",
  "assumptions":L(["Endringen ble satt i produksjon i et planlagt vedlikeholdsvindu.",
     "Tilbakerulling er mulig, men ikke testet for denne versjonen.",
     "Feilen gjelder bare komponenten som ble endret."]),
  "controlQuestions":L(["Kan endringen rulles tilbake, og hvor lang tid tar det?",
     "Ble avhengige tjenester identifisert i endringsvurderingen?",
     "Må transaksjoner etterbehandles når komponenten virker igjen?",
     "Hvilke forbedringer i endringsprosessen bør registreres etter hendelsen?"]),
  "timeline":[{"offsetMinutes":o,"text":T(t)} for o,t in [
     (0,"Endring CHG-2026-114 settes i produksjon."),
     (8,"Automatiske tester feiler for den endrede komponenten."),
     (14,"Vaktansvarlig eskalerer til endringsansvarlig."),
     (25,"Hendelsesrom åpnes. Tilbakerulling vurderes.")]],
  "tasks":[{"id":f"chg-t{i}","title":T(t),"role":T(r),"dueMinutes":d} for i,(t,r,d) in enumerate([
     ("Vurder tilbakerulling av endringen","Endringsansvarlig",30),
     ("Informer kundesenteret om berørte tjenester","Beredskapsleder",45),
     ("Kontroller transaksjoner som feilet under hendelsen","Betalingsteamet",120),
     ("Registrer forbedringstiltak i endringsprosessen","Operasjonell risiko",1440)],1)],
  "decisions":[{"offsetMinutes":20,"text":T("Endringsfrys for berørte systemer til årsaken er kjent."),"role":T("Endringsansvarlig"),"taskId":"chg-t1"}],
  "synthetic":True},
]

# ---------- 2.0: planlagte endringer, øvelser og funn ----------
CHECK_MAP = "Avhengige tjenester og kanaler er gjennomgått i kartet."
CHECK_ROLLBACK = "Tilbakerulling er testet i testmiljø."
CHECK_CONTACT = "Kundesenteret er varslet om vedlikeholdsvinduet."
CHECK_TIME = "Vinduet er lagt utenfor perioder med høy trafikk."
def chg(id, title, desc, system, start, window, risk, rollback, owner, checks, decision=None):
    c = {"id": id, "title": T(title), "description": T(desc), "systemId": system, "plannedStart": start,
         "windowMinutes": window, "risk": risk, "rollbackTested": rollback, "owner": T(owner), "checkpoints": L(checks)}
    if decision:
        outcome, reason, role, at = decision
        c["decision"] = {"outcome": outcome, "reason": T(reason), "role": T(role), "decidedAt": at}
    c["synthetic"] = True
    return c

planned_changes = [
 chg("CHG-2026-118","Ny ruting av SMS-varsler","Varslingstjenesten sender SMS via en ny rute hos SMS-Linje for å rette de forsinkede meldingene.",
     "sys-notify","2026-11-10T21:00:00",60,"low",True,"Kommunikasjonsteamet",
     [CHECK_MAP, CHECK_ROLLBACK, CHECK_TIME],
     ("approved","Lav risiko. Push-varsler dekker behovet hvis SMS stopper, og tilbakerulling er testet.","Endringsansvarlig","2026-11-02T10:15:00")),
 chg("CHG-2026-121","Ny versjon av integrasjonsplattformen","Nytt forsøk på oppgraderingen som feilet i endring CHG-2026-114. Integrasjonsplattformen kjører bare i Norge og har ingen reserveløsning.",
     "sys-api","2026-11-14T22:00:00",120,"high",False,"Integrasjonsteamet",
     [CHECK_MAP, CHECK_ROLLBACK, CHECK_CONTACT, "Funnene fra hendelsen etter endring CHG-2026-114 er lukket."]),
 chg("CHG-2026-124","Oppdatering av kortkoblingen","Ny versjon av koblingen mellom kortplattformen og KortNord Prosessering.",
     "sys-card","2026-11-19T01:00:00",90,"medium",True,"Kortteamet",
     [CHECK_MAP, CHECK_ROLLBACK, "KortNord Prosessering har bekreftet vinduet.", "Stand-in-autorisasjon er kontrollert før start."]),
 chg("CHG-2026-127","Ny regel i kredittvurderingen","Endret beregning av betjeningsevne for forbrukslån.",
     "sys-credit","2026-11-25T18:00:00",60,"medium",True,"Kredittteamet",
     [CHECK_MAP, CHECK_ROLLBACK, "Datastrømmen fra integrasjonsplattformen er bekreftet i arkitekturdokumentasjonen."]),
]

exercises = [
 {"id":"EX-2026-03","scenarioId":"sky-region","title":T("Bordøvelse: svikt hos skyleverandøren"),"date":"2026-09-18",
  "participants":L(["Beredskapsleder","Teknisk hendelsesleder","Leverandøransvarlig","Kommunikasjonsansvarlig","Operasjonell risiko"]),
  "providerIds":[],
  "summary":T("Gjennomgang av bortfall hos Nimbus Sky i alle land. Fokus på reserveløsninger, varsling og informasjon til kunder."),
  "synthetic":True},
 {"id":"EX-2026-04","scenarioId":"failed-change","title":T("Bordøvelse: feil etter systemendring"),"date":"2026-10-22",
  "participants":L(["Endringsansvarlig","Beredskapsleder","Betalingsteamet","Operasjonell risiko"]),
  "providerIds":["prv-clearing"],
  "summary":T("Gjennomgang av en mislykket endring i integrasjonsplattformen. Fokus på tilbakerulling og etterbehandling av betalinger."),
  "synthetic":True},
]

def fnd(id, title, desc, src, role, due, status, nodes_, exercise=None, incident=None):
    f = {"id": id, "title": T(title), "description": T(desc), "source": src}
    if exercise: f["exerciseId"] = exercise
    if incident: f["incident"] = T(incident)
    f.update({"role": T(role), "due": due, "status": status, "nodeIds": nodes_, "synthetic": True})
    return f

findings = [
 fnd("F-01","Integrasjonsplattformen kan ikke flyttes til Sverige","API-laget kjører bare i Norge. Flytting ved bortfall er planlagt, men ikke etablert.",
     "exercise","Integrasjonsteamet","2027-03-31","inProgress",["sys-api","prv-nimbus"],exercise="EX-2026-03"),
 fnd("F-02","Exit-planen for skyleverandøren er ikke ferdig","Øvelsen viste at banken ikke har en avtalt plan for å flytte de skybaserte systemene til en annen leverandør.",
     "exercise","Innkjøpsleder IT","2027-01-31","inProgress",["prv-nimbus"],exercise="EX-2026-03"),
 fnd("F-03","Kundesenteret manglet standardsvar","Kundesenteret fikk ikke ferdige svar om innlogging og betaling de første 45 minuttene.",
     "exercise","Kommunikasjonsansvarlig","2026-10-15","closed",["ch-contact","svc-support"],exercise="EX-2026-03"),
 fnd("F-04","Skyleverandøren til Saksflyt er ikke bekreftet","Saksflyt AS har ikke oppgitt hvilken skyleverandør og hvilket land saksbehandlingsverktøyet kjører i.",
     "exercise","CRM-forvalter","2026-12-15","open",["prv-saksflyt","prv-nimbus"],exercise="EX-2026-03"),
 fnd("F-05","Tilbakerulling er ikke testet for alle versjoner","Øvelsen viste at tilbakerulling av integrasjonsplattformen bare er testet for forrige versjon.",
     "exercise","Endringsansvarlig","2026-12-01","open",["sys-api"],exercise="EX-2026-04"),
 fnd("F-06","Rutine for etterbehandling av betalinger mangler","Det finnes ingen beskrevet rutine for å finne og sende betalinger som feilet under en hendelse.",
     "exercise","Betalingsteamet","2026-11-30","inProgress",["sys-pay","svc-payments"],exercise="EX-2026-04"),
 fnd("F-07","Avhengige tjenester ble ikke vurdert før endringen","Endringsvurderingen nevnte bare integrasjonsplattformen, ikke tjenestene og kanalene som avhenger av den.",
     "incident","Operasjonell risiko","2026-12-15","open",["sys-api"],incident="Feil etter endring CHG-2026-114"),
 fnd("F-08","Skyleverandøren deltok ikke i øvelsen","Nimbus Sky var ikke med i øvelsen. Omfang og gjenopprettingstid fra leverandøren ble derfor bare antatt.",
     "exercise","Leverandøransvarlig","2027-02-28","open",["prv-nimbus"],exercise="EX-2026-03"),
]

data = {"bank":{"name":"Morild Bank","description":T("Morild Bank er en oppdiktet nordisk bank laget for denne demonstrasjonen."),"synthetic":True},
        "asOf":"2026-11-01",
        "regionNames":{"no":T("Norge"),"se":T("Sverige"),"dk":T("Danmark"),"fi":T("Finland")},"staleAfterDays":365,"nodes":nodes,"dependencies":deps,"scenarios":scenarios,
        "plannedChanges":planned_changes,"exercises":exercises,"findings":findings}
out = pathlib.Path(__file__).resolve().parent.parent/"src/data/morild-bank.json"
out.write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
from collections import Counter
print(Counter(n["kind"] for n in nodes), len(deps), "avhengigheter")
ids={n["id"] for n in nodes}
assert all(d["from"] in ids and d["to"] in ids for d in deps)
sc_ids={x["id"] for x in scenarios}; ex_ids={x["id"] for x in exercises}
assert all(c["systemId"] in ids and nodes[[n["id"] for n in nodes].index(c["systemId"])]["kind"]=="system" for c in planned_changes)
assert all(e["scenarioId"] in sc_ids and set(e["providerIds"])<=ids for e in exercises)
assert all(set(f["nodeIds"])<=ids and (f["source"]!="exercise" or f.get("exerciseId") in ex_ids) for f in findings)
print(len(planned_changes),"endringer,",len(exercises),"øvelser,",len(findings),"funn")
assert not MISSING, f"Mangler engelsk oversettelse: {MISSING}"
