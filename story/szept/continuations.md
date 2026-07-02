# Continuations — Szept pod Latarnią

Ten dokument opisuje cztery potencjalne kontynuacje historii `Szept pod Latarnią`, po jednej dla każdego zakończenia.

Cel dokumentu: nie rozpisywać od razu pełnych scen i dialogów, tylko stworzyć **design blueprint** dla przyszłych visual novels / sequel routes, które można później rozwinąć w Narrium.

Każda kontynuacja wychodzi z innego stanu świata po finale:

- `SC12 — Światło Prawdy`,
- `SC13 — Porządek Vossa`,
- `SC14 — Ucieczka z Mapą`,
- `SC15 — Nowy Strażnik`.

---

## 1. Założenie produkcyjne

Cztery zakończenia nie powinny prowadzić do jednej wspólnej kontynuacji z kosmetycznymi różnicami. Każde zakończenie tworzy inny świat po finale, dlatego najlepszym kierunkiem są cztery osobne mini-historie albo cztery osobne sequel routes.

Możliwe podejścia:

1. **Sequel anthology** — cztery krótsze historie, każda po 6–8 scen.
2. **One chosen sequel first** — najpierw rozwijamy jedną kontynuację do pełnej visual novel, resztę zostawiamy jako pitch.
3. **Parallel routes** — jeden projekt Narrium z czterema startowymi scenami, wybieranymi na podstawie zakończenia poprzedniej gry.

Rekomendacja produkcyjna: najpierw stworzyć blueprinty czterech kontynuacji, potem wybrać jedną do pełnego rozpisania.

---

# Szept II-A — Miasto bez Światła

Kontynuacja zakończenia: `SC12 — Światło Prawdy`.

## Stan świata

Rdzeń latarni został złamany. Latarnia zgasła po raz pierwszy od pokoleń. Prawda o ofiarach wychodzi na jaw, ale miasto nie jest gotowe żyć bez kłamstwa, które dawało mu poczucie bezpieczeństwa.

Mgła przerzedziła się, lecz nie zniknęła całkowicie. Veyr budzi się w świecie bez pewników.

## Główny temat

Czy prawda wystarczy, żeby odbudować społeczeństwo?

## Ton

Gorzka odbudowa, polityczny niepokój, rana po kłamstwie, społeczna odpowiedzialność.

## Protagonista

Lio pozostaje protagonistą.

Jego rola zmienia się z odkrywcy prawdy w człowieka, który musi pomóc miastu tę prawdę unieść.

## Główny konflikt

Mieszkańcy Veyr chcą sprawiedliwości, ale nie zgadzają się co do tego, co ona oznacza.

Frakcje:

- rodziny ofiar chcą procesu i ujawnienia wszystkich nazwisk,
- część straży chce przywrócić dawny porządek,
- część kapłanów twierdzi, że zgaszenie latarni sprowadzi katastrofę,
- kupcy boją się utraty handlu i ochrony portu,
- ludzie z Dolnego Nabrzeża żądają rozliczeń.

## Główne postacie

### Lio

Zmęczony prawdą, ale nie może już wrócić do roli cichego skryby.

Potencjalne atrybuty:

| key | default | Znaczenie |
|---|---:|---|
| resolve | 1 | Gotowość do publicznego działania |
| guilt | 2 | Ciężar decyzji z finału |
| credibility | 1 | Czy mieszkańcy wierzą Lio |

### Mira

Może stać się głosem Dolnego Nabrzeża i rodzin ofiar.

Potencjalne atrybuty:

| key | default | Znaczenie |
|---|---:|---|
| trust | 1 | Zaufanie do Lio po finale |
| anger | 2 | Gniew wobec dawnych władz |
| influence | 1 | Wpływ na mieszkańców portu |

### Ojciec Cael

Publicznie przyznaje się do winy zakonu albo próbuje chronić resztki wspólnoty.

Potencjalne atrybuty:

| key | default | Znaczenie |
|---|---:|---|
| shame | 3 | Wina za lata milczenia |
| courage | 1 | Gotowość do publicznego wyznania |
| faith | 1 | Wiara po upadku kłamstwa |

### Noa

Nie jest już symbolem grozy. Jest dowodem, że ofiary nie były bezimienne.

Potencjalne atrybuty:

| key | default | Znaczenie |
|---|---:|---|
| calm | 1 | Spokój po zgaszeniu latarni |
| memory | 2 | Fragmenty wspomnień ofiar |
| danger | 0 | Ryzyko nawrotu mgły |

## Resources

| id | key | displayName | visible | default | Znaczenie |
|---|---|---|---|---:|---|
| res_public_trust | public_trust | Zaufanie miasta | true | 1 | Czy mieszkańcy wierzą Lio |
| res_unrest | unrest | Niepokój | true | 2 | Narastający chaos po ujawnieniu prawdy |
| res_fog | fog | Mgła | true | 2 | Pozostałość po działaniu latarni |
| res_truth | truth | Prawda | true | 3 | Siła ujawnionych dowodów |

## Variables

| id | key | default | Znaczenie |
|---|---|---:|---|
| var_public_confession | public_confession | 0 | Cael publicznie wyznał winę zakonu |
| var_victims_named | victims_named | 0 | Imiona ofiar zostały ujawnione |
| var_guard_reformed | guard_reformed | 0 | Straż została częściowo zreformowana |
| var_riots_prevented | riots_prevented | 0 | Udało się uniknąć zamieszek |
| var_fog_returning | fog_returning | 0 | Mgła zaczyna wracać |

## Proponowana struktura scen

| Scene | Tytuł | Funkcja |
|---|---|---|
| A01 | Poranek bez światła | Otwarcie: miasto budzi się bez latarni |
| A02 | Plac Imion | Rodziny ofiar żądają ujawnienia listy |
| A03 | Ostatni kapłani soli | Cael mierzy się z zakonem |
| A04 | Dolne Nabrzeże | Mira prowadzi Lio do ludzi, którzy najbardziej ucierpieli |
| A05 | Rejestr publiczny | Decyzja: ujawnić wszystko czy chronić miasto przed chaosem |
| A06 | Mgła pod progiem | Mgła wraca w innej formie |
| A07 | Proces albo spalenie | Kulminacja społeczna |
| A08 | Nowe światło | Zakończenie kontynuacji |

## Potencjalne endingi

- **Miasto prawdy** — Veyr zaczyna bolesną odbudowę.
- **Miasto gniewu** — prawda wywołuje zamieszki i rozpad porządku.
- **Nowa latarnia** — mieszkańcy tworzą świecki system ostrzegania zamiast rytuału.

## Kierunek graficzny

Hero element sequelu: **ciemna latarnia jako rana miasta**.

Lokacje:

- puste place o świcie,
- tablice z imionami ofiar,
- kaplica bez rytuału,
- port bez ochronnego światła,
- mieszkańcy patrzący na ciemną wieżę.

---

# Szept II-B — Porządek Latarni

Kontynuacja zakończenia: `SC13 — Porządek Vossa`.

## Stan świata

Voss wygrał. Latarnia świeci nadal. Miasto jest bezpieczne, uporządkowane i posłuszne. Prawda została pogrzebana, ale nie zniknęła.

Lio zna prawdę, lecz został zmuszony do milczenia albo sam wybrał kompromis.

## Główny temat

Czy bezpieczeństwo usprawiedliwia kłamstwo?

## Ton

Cichy opór, propaganda, administracyjna groza, kontrola bez otwartej przemocy.

## Protagonista

Najmocniejszy wariant: protagonistką zostaje Mira.

Lio może być postacią poboczną — człowiekiem złamanym kompromisem, który nadal posiada wiedzę, ale stracił sprawczość.

Alternatywnie protagonistą może pozostać Lio jako cichy dysydent.

## Główny konflikt

Veyr działa jak dobrze zarządzane więzienie.

- straż kontroluje dokumenty,
- symbole latarni stają się symbolami państwa,
- ludzie zgłaszają odstępstwa „dla bezpieczeństwa”,
- mgła jest używana jako uzasadnienie represji,
- podziemna siatka Miry próbuje odzyskać dowody.

## Główne postacie

### Mira

Przywódczyni małego ruchu oporu.

| key | default | Znaczenie |
|---|---:|---|
| resistance | 1 | Siła siatki oporu |
| grief | 2 | Nierozliczona strata brata |
| trust_lio | 0 | Czy ufa Lio po kompromisie |

### Lio

Złamany świadek prawdy.

| key | default | Znaczenie |
|---|---:|---|
| shame | 2 | Wstyd za milczenie |
| courage | 0 | Gotowość do ponownego sprzeciwu |
| evidence | 1 | Dostęp do ukrytych dokumentów |

### Eryn Voss

Nie jest tyranem z krzykiem. Jest spokojnym administratorem kłamstwa.

| key | default | Znaczenie |
|---|---:|---|
| control | 4 | Kontrola nad miastem |
| patience | 2 | Gotowość do manipulacji zamiast przemocy |
| suspicion | 1 | Podejrzliwość wobec Miry i Lio |

### Noa

Może być ukrywana przez ruch oporu albo obserwowana przez straż.

| key | default | Znaczenie |
|---|---:|---|
| hidden | 1 | Czy Noa pozostaje poza zasięgiem Vossa |
| visions | 1 | Siła wizji mimo kontroli latarni |
| risk | 1 | Ryzyko wykrycia |

## Resources

| id | key | displayName | visible | default | Znaczenie |
|---|---|---|---|---:|---|
| res_control | control | Kontrola | true | 4 | Siła reżimu Vossa |
| res_resistance | resistance | Opór | true | 1 | Siła podziemia |
| res_suspicion | suspicion | Podejrzenia | true | 1 | Jak blisko straż jest wykrycia bohaterów |
| res_evidence | evidence | Dowody | true | 1 | Fragmenty prawdy odzyskane spod kontroli |

## Variables

| id | key | default | Znaczenie |
|---|---|---:|---|
| var_lio_silenced | lio_silenced | 1 | Lio publicznie milczy |
| var_mira_resistance | mira_resistance | 1 | Mira działa w podziemiu |
| var_noa_hidden | noa_hidden | 1 | Noa jest ukryta |
| var_guard_infiltrated | guard_infiltrated | 0 | Opór ma człowieka w straży |
| var_propaganda_broken | propaganda_broken | 0 | Udało się przełamać oficjalną narrację |

## Proponowana struktura scen

| Scene | Tytuł | Funkcja |
|---|---|---|
| B01 | Plac pod sztandarami | Otwarcie: Veyr jako uporządkowane więzienie |
| B02 | Ciche drzwi | Mira kontaktuje się z Lio |
| B03 | Archiwum ocenzurowane | Dowody zostały zmienione lub usunięte |
| B04 | Dziecko pod podłogą | Noa ukrywa się przed strażą |
| B05 | Patrol światła | Straż używa latarni do kontroli dzielnic |
| B06 | Człowiek Vossa | Decyzja: zwerbować strażnika czy go zdemaskować |
| B07 | Noc bez meldunku | Sabotaż propagandy |
| B08 | Porządek pęka | Kulminacja: ujawnienie prawdy albo klęska oporu |

## Potencjalne endingi

- **Iskra oporu** — reżim nie upada, ale kłamstwo zostaje naruszone.
- **Cisza absolutna** — Voss wygrywa ponownie, a Lio zostaje całkowicie złamany.
- **Miasto podziemne** — opór przenosi się do tuneli i tworzy alternatywne Veyr.

## Kierunek graficzny

Hero element sequelu: **świecąca latarnia jako symbol państwa**.

Lokacje:

- place z równymi szeregami mieszkańców,
- sztandary z symbolem latarni,
- biura straży,
- ocenzurowane archiwa,
- tunele oporu,
- cienie ludzi obserwujących z okien.

---

# Szept II-C — Droga poza Veyr

Kontynuacja zakończenia: `SC14 — Ucieczka z Mapą`.

## Stan świata

Lio uciekł z Veyr z dowodami. Miasto zostało za nim. Latarnia nadal świeci. Prawda nie została ujawniona, ale nie została też zniszczona.

Lio staje się samotnym świadkiem, którego nikt jeszcze nie wysłuchał.

## Główny temat

Czy można uciec od prawdy, którą się niesie?

## Ton

Samotna droga, thriller, pościg, tajemnica większa niż jedno miasto.

## Protagonista

Lio.

To najbardziej naturalna kontynuacja jego osobistej podróży.

## Główny konflikt

Lio chce dotrzeć z dowodami do miejsca, które może ujawnić prawdę — innego miasta, sądu, zakonu, archiwum albo niezależnego kronikarza.

Po drodze odkrywa, że Veyr nie jest wyjątkiem. Inne latarnie istnieją. Inne miasta też mają swoje rytuały.

## Główne postacie

### Lio

Uciekinier i świadek.

| key | default | Znaczenie |
|---|---:|---|
| resolve | 1 | Gotowość do dalszej drogi |
| paranoia | 1 | Lęk przed pościgiem |
| burden | 2 | Ciężar dowodów i winy |

### Łowca Vossa

Nowa postać: wysłannik straży, który nie musi być brutalny. Może być spokojnym urzędnikiem-polującym.

| key | default | Znaczenie |
|---|---:|---|
| proximity | 1 | Jak blisko jest Lio |
| patience | 2 | Cierpliwość w tropieniu |
| doubt | 0 | Czy zaczyna wierzyć Lio |

### Kronikarka Alren

Nowa postać: niezależna kronikarka albo kustoszka archiwum w innym mieście.

| key | default | Znaczenie |
|---|---:|---|
| trust | 0 | Czy ufa dowodom Lio |
| risk | 1 | Gotowość do narażenia się władzom |
| knowledge | 2 | Wiedza o innych latarniach |

### Noa jako echo

Noa nie musi być fizycznie obecna. Może pojawiać się w wizjach, śnie albo powtarzających się motywach mgły.

| key | default | Znaczenie |
|---|---:|---|
| echo | 1 | Obecność wizji Noi |
| clarity | 1 | Czy wizje pomagają czy mylą |
| danger | 1 | Ryzyko psychiczne Lio |

## Resources

| id | key | displayName | visible | default | Znaczenie |
|---|---|---|---|---:|---|
| res_evidence | evidence | Dowody | true | 3 | Kompletność dokumentów |
| res_distance | distance | Dystans | true | 1 | Jak daleko Lio jest od Veyr |
| res_pursuit | pursuit | Pościg | true | 1 | Jak blisko są ludzie Vossa |
| res_sanity | sanity | Spokój | true | 4 | Odporność Lio na wizje i mgłę |

## Variables

| id | key | default | Znaczenie |
|---|---|---:|---|
| var_reached_crossroads | reached_crossroads | 0 | Lio dotarł do pierwszego rozstaju |
| var_found_second_lighthouse | found_second_lighthouse | 0 | Odkryto istnienie kolejnej latarni |
| var_evidence_damaged | evidence_damaged | 0 | Dowody zostały częściowo zniszczone |
| var_hunter_spared | hunter_spared | 0 | Lio oszczędził lub przekonał łowcę |
| var_truth_sent | truth_sent | 0 | Dowody wysłano poza zasięg Vossa |

## Proponowana struktura scen

| Scene | Tytuł | Funkcja |
|---|---|---|
| C01 | Droga od Veyr | Otwarcie: Lio naprawdę odchodzi |
| C02 | Gospoda bez nazwy | Pierwszy kontakt ze światem poza miastem |
| C03 | Pieczęć na gościńcu | Lio odkrywa, że jest śledzony |
| C04 | Drugie światło | Na horyzoncie pojawia się inna latarnia |
| C05 | Archiwum w obcym mieście | Kronikarka bada dowody |
| C06 | Łowca przy stole | Konfrontacja bez walki |
| C07 | Mapa większa niż Veyr | Dowody wskazują sieć latarni |
| C08 | List do świata | Finał: ujawnić prawdę, wrócić albo zniknąć |

## Potencjalne endingi

- **Prawda wysłana** — Lio nie wraca, ale dowody trafiają dalej.
- **Powrót do Veyr** — Lio wraca z sojusznikami.
- **Sieć latarni** — odkrywa, że problem jest znacznie większy.
- **Zniknięcie świadka** — Lio przeżywa, ale musi pozostać bezimienny.

## Kierunek graficzny

Hero element sequelu: **mapa jako dowód, który prowadzi dalej niż Lio chciał**.

Lokacje:

- błotniste drogi,
- przydrożne kapliczki,
- samotne gospody,
- obce archiwa,
- druga latarnia na horyzoncie,
- mgła idąca za Lio.

---

# Szept II-D — Strażnik w Sercu

Kontynuacja zakończenia: `SC15 — Nowy Strażnik`.

## Stan świata

Lio został nowym Strażnikiem. Miasto zostało ocalone, ale cena jest osobista i trwała. Lio nie jest już zwykłym człowiekiem. Latarnia świeci mocniej niż wcześniej, a mgła cofa się od wybrzeża.

Wydaje się, że wszystko zostało naprawione — ale mechanizm nadal istnieje.

## Główny temat

Czy poświęcenie zmienia człowieka w potwora, jeśli trwa wystarczająco długo?

## Ton

Tragedia, sakralna groza, metafizyka, miłość do kogoś, kto staje się częścią mechanizmu.

## Protagonista

Rekomendacja: Mira albo Noa.

Najmocniejszy wariant: Mira jako protagonistka, ponieważ ma emocjonalny powód, żeby ratować człowieka, który być może już nie może zostać uratowany.

Noa może być współprotagonistką albo przewodniczką po wizjach latarni.

## Główny konflikt

Lio utrzymuje miasto przy życiu jako nowy Strażnik, ale z każdym dniem traci więcej siebie.

Mira próbuje odpowiedzieć na pytanie:

- czy ocalić Lio,
- czy pozwolić mu trwać,
- czy zniszczyć mechanizm i zaryzykować powrót mgły,
- czy znaleźć kogoś, kto zastąpi go ponownie.

## Główne postacie

### Mira

Protagonistka próbująca ocalić Lio albo przynajmniej zrozumieć, co z niego zostało.

| key | default | Znaczenie |
|---|---:|---|
| resolve | 2 | Gotowość do wejścia w serce latarni |
| grief | 2 | Żal po utracie dawnego Lio |
| defiance | 1 | Opór wobec mechanizmu |

### Lio / Nowy Strażnik

Nie jest antagonistą w prostym sensie. Jest człowiekiem rozciągniętym między wolą a funkcją.

| key | default | Znaczenie |
|---|---:|---|
| humanity | 2 | Ile Lio pozostało w Strażniku |
| light | 4 | Siła światła latarni |
| hunger | 0 | Czy mechanizm zaczyna domagać się ofiar |

### Noa

Rozumie światło inaczej niż dorośli. Może widzieć człowieka w mechanizmie.

| key | default | Znaczenie |
|---|---:|---|
| bond | 2 | Więź z Lio jako Strażnikiem |
| vision | 2 | Zdolność widzenia prawdy w świetle |
| risk | 1 | Ryzyko, że latarnia przyciągnie ją ponownie |

### Ojciec Cael

Może próbować stworzyć nowy rytuał bez ofiar albo uznać, że poświęcenie Lio jest święte.

| key | default | Znaczenie |
|---|---:|---|
| faith | 1 | Wiara po przemianie Lio |
| shame | 2 | Wina za ciągłość mechanizmu |
| courage | 1 | Gotowość do przeciwstawienia się nowemu kultowi |

## Resources

| id | key | displayName | visible | default | Znaczenie |
|---|---|---|---|---:|---|
| res_lio_humanity | lio_humanity | Człowieczeństwo Lio | true | 2 | Ile z Lio zostało w Strażniku |
| res_lighthouse_light | lighthouse_light | Światło latarni | true | 4 | Siła działania mechanizmu |
| res_fog_pressure | fog_pressure | Nacisk mgły | true | 1 | Czy mgła wraca do miasta |
| res_mira_resolve | mira_resolve | Determinacja Miry | true | 2 | Gotowość Miry do konfrontacji |

## Variables

| id | key | default | Znaczenie |
|---|---|---:|---|
| var_lio_keeper | lio_keeper | 1 | Lio jest nowym Strażnikiem |
| var_mira_entered_heart | mira_entered_heart | 0 | Mira weszła do Serca Latarni |
| var_noa_heard_lio | noa_heard_lio | 0 | Noa usłyszała prawdziwy głos Lio |
| var_cael_new_ritual | cael_new_ritual | 0 | Cael odkrył rytuał bez ofiar |
| var_mechanism_hungry | mechanism_hungry | 0 | Mechanizm zaczyna domagać się ceny |

## Proponowana struktura scen

| Scene | Tytuł | Funkcja |
|---|---|---|
| D01 | Latarnia świeci mocniej | Otwarcie: miasto ocalone, ale światło jest inne |
| D02 | Mira pod bramą | Mira wraca do latarni mimo zakazu |
| D03 | Głos w szkle | Noa słyszy Lio w mechanizmie |
| D04 | Nowy kult światła | Mieszkańcy zaczynają czcić Strażnika |
| D05 | Serce zamknięte od środka | Mira odkrywa, że Lio może nie chcieć być uratowany |
| D06 | Mgła czeka | Mechanizm zaczyna słabnąć albo żądać ceny |
| D07 | Człowiek w świetle | Konfrontacja Miry z Lio-Strażnikiem |
| D08 | Druga ofiara | Finał: uwolnić, zastąpić, zniszczyć albo zaakceptować |

## Potencjalne endingi

- **Lio wraca na chwilę** — Mira odzyskuje człowieka, ale tylko na moment.
- **Strażnik trwa** — Lio pozostaje w mechanizmie, a Mira odchodzi.
- **Noa otwiera światło** — Noa znajduje trzecią drogę, ale płaci własną cenę.
- **Mechanizm pęka** — miasto zostaje wolne, lecz mgła wraca.

## Kierunek graficzny

Hero element sequelu: **Lio jako żywe serce latarni**.

Lokacje:

- komnata Serca po rytuale,
- okna latarni z widokiem na cofającą się mgłę,
- miasto pod nienaturalnie spokojnym światłem,
- kaplica z nowym kultem Strażnika,
- Mira samotnie przed bramą,
- Noa w świetle, ale bez horrorowych cech.

---

## Rekomendacja wyboru pierwszej kontynuacji

Najbardziej komercyjna i rozszerzająca świat:

```text
Szept II-C — Droga poza Veyr
```

Powód: otwiera mapę świata, pozwala pokazać nowe miasta, inne latarnie, pościg, większy spisek i naturalnie rozwija mitologię.

Najbardziej emocjonalna i postaciowa:

```text
Szept II-D — Strażnik w Sercu
```

Powód: ma najsilniejszy konflikt osobisty, szczególnie jeśli protagonistką zostanie Mira, a Lio stanie się tragiczną postacią centralną.

Najbardziej polityczna:

```text
Szept II-A — Miasto bez Światła
```

Powód: pokazuje konsekwencje prawdy i odbudowę społeczeństwa.

Najbardziej dystopijna:

```text
Szept II-B — Porządek Latarni
```

Powód: rozwija Vossa jako antagonistę-architekta porządku i pozwala budować opór w kontrolowanym mieście.

---

## Następny krok

Przed pisaniem pełnej historii warto wybrać jedną z czterech kontynuacji i przygotować dla niej osobny dokument:

```text
story/szept/sequel_<route_key>.md
```

Przykłady:

- `story/szept/sequel_city_without_light.md`,
- `story/szept/sequel_order_of_the_lighthouse.md`,
- `story/szept/sequel_road_beyond_veyr.md`,
- `story/szept/sequel_keeper_in_the_heart.md`.

Dopiero tam należy rozpisać pełne sceny, dialogi, choices, effects, resources i variables dla wybranej kontynuacji.
