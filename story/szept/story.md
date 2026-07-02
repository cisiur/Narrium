Historia: Szept pod Latarnią
Pitch

Gracz wciela się w Lio, młodego skrybę z portowego miasta Veyr, gdzie każdej nocy latarnia morska świeci bladym, nienaturalnym światłem. Mieszkańcy wierzą, że chroni ich przed mgłą. Prawda jest gorsza: latarnia nie odpędza mgły — ona ją karmi.

Historia jest mroczną visual novel o zaufaniu, tajemnicy i cenie prawdy. Gracz może dojść do jednego z kilku zakończeń: ocalić miasto, oddać je pod władzę Strażnika Latarni, uciec z prawdą albo samemu przejąć światło.

1. Postacie
Lio — protagonista

W edytorze może być narratorem bez speakerId albo normalną postacią, jeżeli chcesz widzieć imię przy wypowiedziach.

Atrybuty:

key	default	Znaczenie
courage	1	Odwaga Lio
insight	0	Zdolność rozumienia tajemnicy
guilt	0	Poczucie winy / obciążenie moralne
Mira — przemytniczka map

Dawna przyjaciółka Lio. Zna tunele pod miastem. Nie ufa nikomu, ale chce ocalić młodszego brata.

Atrybuty:

key	default	Znaczenie
trust	0	Zaufanie Miry do Lio
fear	1	Strach przed Strażnikiem
loyalty	0	Gotowość do pomocy w finale
Ojciec Cael — kapłan Morza

Publicznie mówi o świętym świetle latarni. Prywatnie wie, że zakon od lat ukrywa prawdę.

Atrybuty:

key	default	Znaczenie
trust	0	Czy powierzy Lio sekret
doubt	1	Jego zwątpienie w zakon
shame	2	Wina za wcześniejsze milczenie
Eryn Voss — Strażnik Latarni

Charyzmatyczny przywódca straży portowej. Antagonista, ale nie jednowymiarowy. Wierzy, że miasto potrzebuje kłamstwa, aby przetrwać.

Atrybuty:

key	default	Znaczenie
suspicion	0	Podejrzliwość wobec Lio
respect	0	Szacunek do Lio
control	3	Siła kontroli nad miastem
Noa — dziecko z mgły

Tajemnicze dziecko znalezione przy brzegu. Widzi rzeczy, których inni nie widzą.

Atrybuty:

key	default	Znaczenie
bond	0	Więź z Lio
clarity	1	Jasność wizji
danger	0	Ryzyko, że mgła je pochłonie
2. Resources — zasoby widoczne dla gracza

Resources są dobrym miejscem na stan, który gracz powinien widzieć w HUD, np. reputację, światło, zdrowie psychiczne albo zapasy. Narrium traktuje resources jako globalne wartości numeryczne przeznaczone do pokazywania graczowi.

id symboliczny	key	displayName	icon	visible	default	Znaczenie
res_light	light	Światło	circle / sun	true	3	Ile światła pozostało w latarni / lampie Lio
res_reputation	reputation	Reputacja	star	true	0	Jak mieszkańcy widzą Lio
res_supplies	supplies	Zapasy	bag	true	2	Przydatne przed wejściem do tuneli
res_sanity	sanity	Spokój	heart / eye	true	5	Odporność psychiczna na mgłę
res_truth	truth	Prawda	book / diamond	true	0	Ile fragmentów prawdy odkrył gracz
3. Variables — ukryte zmienne backendowe

Variables są ukrytym stanem fabularnym, dobrym na flagi, ścieżki i progres. Boolean-like wartości najlepiej modelować jako 0 / 1.

id symboliczny	key	default	Znaczenie
var_knows_lighthouse_lie	knows_lighthouse_lie	0	Gracz wie, że latarnia nie chroni miasta
var_has_old_map	has_old_map	0	Gracz ma mapę tuneli Miry
var_helped_noa	helped_noa	0	Gracz pomógł Noi
var_stole_key	stole_key	0	Gracz ukradł klucz do latarni
var_priest_confessed	priest_confessed	0	Cael wyznał prawdę
var_mira_route	mira_route	0	Gracz idzie ścieżką Miry
var_cael_route	cael_route	0	Gracz idzie ścieżką Caela
var_voss_route	voss_route	0	Gracz zbliża się do Vossa
var_tunnel_open	tunnel_open	0	Odblokowano wejście pod miasto
var_final_path	final_path	0	0 brak, 1 ocalić, 2 przejąć, 3 oddać, 4 uciec
var_seen_noa_vision	seen_noa_vision	0	Gracz widział wizję Noi
var_alarm_raised	alarm_raised	0	Straż jest postawiona w stan alarmu
4. Główna struktura scen

Proponowany układ na canvasie:

ACT I — Port i pierwsza tajemnica
S01 Start: Archiwum po północy
S02 Rynek we mgle
S03 Spotkanie z Mirą
S04 Kaplica Soli
S05 Dziecko na brzegu

ACT II — Dochodzenie
S06 Zakazane archiwum
S07 Tunele pod portem
S08 Gabinet Vossa
S09 Wizja Noi
S10 Brama Latarni

ACT III — Finał
S11 Serce Latarni
S12 Zakończenie: Światło Prawdy
S13 Zakończenie: Porządek Vossa
S14 Zakończenie: Ucieczka z Mapą
S15 Zakończenie: Nowy Strażnik

W Narrium możesz potraktować to jako 3 Scene Groups, bo grupy są tylko organizacją canvasu i nie zmieniają runtime/story logic.

5. Szczegółowy schemat scen
S01 — Archiwum po północy

Background: ciemne archiwum miejskie, deszcz za oknem, blade światło latarni.

Dialogue pages:

Narrator:
Veyr nigdy nie zasypiało naprawdę. Port mruczał łańcuchami, dachy syczały deszczem, a latarnia morska świeciła tak blado, jakby ktoś zamknął w niej księżyc.
Lio:
Jeszcze jeden rejestr. Jeszcze jedna noc. Jeszcze jedna pieczęć Strażnika Vossa na dokumentach, których nikt nie powinien czytać.
Narrator:
W dolnej szufladzie znalazłeś księgę bez tytułu. Na pierwszej stronie zapisano tylko jedno zdanie: „Latarnia nie odpędza mgły. Latarnia ją karmi.”
Lio:
To niemożliwe.

Choices:

Choice S01-C1 — „Schowaj księgę pod płaszczem”

Target: S02 Rynek we mgle

Effects:

truth += 1
knows_lighthouse_lie = 1
Eryn Voss.suspicion += 1
Lio.insight += 1
Choice S01-C2 — „Zostaw księgę i udawaj, że nic się nie stało”

Target: S02 Rynek we mgle

Effects:

sanity += 1
Lio.guilt += 1
Eryn Voss.control += 1
Choice S01-C3 — „Przepisz tylko ostatnią stronę”

Target: S02 Rynek we mgle

Effects:

truth += 1
Lio.insight += 1
sanity -= 1
S02 — Rynek we mgle

Background: pusty rynek, stragany przykryte płótnem, mgła między latarniami.

Dialogue pages:

Narrator:
Rankiem mgła weszła aż na rynek. Nie sunęła ulicami — stała między ludźmi, jakby słuchała.
Mira:
Lio. Nie odwracaj się za szybko. Straż patrzy.
Lio:
Mira? Myślałem, że opuściłaś Veyr.
Mira:
Próbowałam. Droga znika po zmroku. Każdy trakt wraca do portu.
Narrator:
Na końcu ulicy Ojciec Cael kropił drzwi solanką. Ludzie dotykali jego szat, prosząc o ochronę.

Choices:

Choice S02-C1 — „Pójdź za Mirą w boczną uliczkę”

Target: S03 Spotkanie z Mirą

Effects:

Mira.trust += 1
var_mira_route = 1
Choice S02-C2 — „Podejdź do Ojca Caela”

Target: S04 Kaplica Soli

Effects:

Ojciec Cael.trust += 1
var_cael_route = 1
Choice S02-C3 — „Zostań na rynku i obserwuj straż”

Target: S08 Gabinet Vossa

Conditions:

none

Effects:

Eryn Voss.suspicion += 1
Eryn Voss.respect += 1
var_voss_route = 1
S03 — Spotkanie z Mirą

Background: wąska uliczka za magazynami, mokre cegły, ukryte drzwi.

Dialogue pages:

Mira:
Ktoś wynosi ludzi nocą z Dolnego Nabrzeża. Straż mówi, że to choroba. To nie choroba.
Lio:
Skąd wiesz?
Mira:
Bo mój brat zniknął. A potem usłyszałam jego głos pod latarnią.
Narrator:
Mira wyciąga pogniecioną mapę. Tunele pod Veyr są starsze niż miasto.

Choices:

Choice S03-C1 — „Weź mapę i obiecaj pomóc”

Target: S05 Dziecko na brzegu

Effects:

has_old_map = 1
Mira.trust += 2
Mira.loyalty += 1
supplies += 1
reputation -= 1
Choice S03-C2 — „Zażądaj dowodu”

Target: S06 Zakazane archiwum

Effects:

Mira.trust -= 1
Lio.insight += 1
truth += 1
Choice S03-C3 — „Oddaj sprawę straży”

Target: S08 Gabinet Vossa

Effects:

Mira.trust -= 2
Eryn Voss.suspicion -= 1
Eryn Voss.respect += 1
var_voss_route = 1
S04 — Kaplica Soli

Background: kaplica przy porcie, ściany pokryte solą, płomień świecy drży nienaturalnie.

Dialogue pages:

Ojciec Cael:
Nie powinieneś przychodzić tu z pytaniami, Lio. Pytania mają w tym mieście krótkie życie.
Lio:
A kłamstwa?
Ojciec Cael:
Kłamstwa żyją dłużej niż ludzie. Czasem nawet ich chronią.
Narrator:
Kapłan spogląda na zamkniętą kryptę pod ołtarzem.

Choices:

Choice S04-C1 — „Powiedz mu o księdze”

Target: S06 Zakazane archiwum

Condition group:

knows_lighthouse_lie == 1

Unavailable hint:

„Nie masz jeszcze dowodu, że latarnia ukrywa tajemnicę.”

Effects:

Ojciec Cael.trust += 2
Ojciec Cael.doubt += 1
priest_confessed = 1
truth += 1
Choice S04-C2 — „Poproś o błogosławieństwo”

Target: S05 Dziecko na brzegu

Effects:

sanity += 1
light += 1
Ojciec Cael.trust += 1
Choice S04-C3 — „Włam się później do krypty”

Target: S06 Zakazane archiwum

Effects:

stole_key = 1
Ojciec Cael.trust -= 1
Eryn Voss.suspicion += 1
S05 — Dziecko na brzegu

Background: kamienisty brzeg, szare fale, dziecko siedzące przy rozbitej łodzi.

Dialogue pages:

Narrator:
Dziecko siedziało tam, gdzie morze wyrzucało rzeczy martwe: drewno, sieci, ryby bez oczu.
Noa:
Widziałam cię w świetle.
Lio:
Zgubiłaś się?
Noa:
Nie. Miasto się zgubiło.
Narrator:
Jej oczy odbijają latarnię, choć jest dzień.

Choices:

Choice S05-C1 — „Pomóż Noi i zaprowadź ją do kaplicy”

Target: S09 Wizja Noi

Effects:

helped_noa = 1
Noa.bond += 2
Noa.danger -= 1
reputation += 1
sanity -= 1
Choice S05-C2 — „Wypytaj ją o światło”

Target: S09 Wizja Noi

Effects:

Noa.clarity += 1
truth += 1
sanity -= 2
seen_noa_vision = 1
Choice S05-C3 — „Zostaw ją straży”

Target: S08 Gabinet Vossa

Effects:

Noa.bond -= 1
Noa.danger += 2
Eryn Voss.control += 1
Lio.guilt += 1
S06 — Zakazane archiwum

Background: podziemne archiwum, skrzynie z aktami, mapa miasta na ścianie.

Dialogue pages:

Narrator:
Pod ratuszem nie przechowywano historii miasta. Przechowywano wersje historii, które przeżyły swoich świadków.
Lio:
Każde zaginięcie. Każda noc gęstej mgły. Każda naprawa latarni.
Narrator:
Daty układają się w rytm. Co dziewięć lat światło słabnie, a miasto oddaje kogoś pod fundamenty.
Lio:
To nie ochrona. To umowa.

Choices:

Choice S06-C1 — „Zabierz rejestr ofiar”

Target: S07 Tunele pod portem

Effects:

truth += 2
sanity -= 1
Eryn Voss.suspicion += 1
Lio.insight += 1
Choice S06-C2 — „Spal część akt, żeby ukryć ślady”

Target: S07 Tunele pod portem

Effects:

truth += 1
Eryn Voss.suspicion -= 1
Lio.guilt += 1
sanity -= 1
Choice S06-C3 — „Zostaw znak dla Caela”

Target: S10 Brama Latarni

Condition group:

priest_confessed == 1

Unavailable hint:

„Cael nie ufa ci jeszcze wystarczająco.”

Effects:

Ojciec Cael.trust += 1
Ojciec Cael.doubt += 1
cael_route = 1
S07 — Tunele pod portem

Background: stare tunele, stojąca woda, korzenie przebijające kamień.

Dialogue pages:

Narrator:
Tunele pachniały rdzą i morzem. Na ścianach wyryto te same słowa w dziesiątkach charakterów pisma: „Nie patrz w światło.”
Mira:
Mój brat tu był. Poznaję jego nóż.
Lio:
Mira…
Mira:
Nie mów tego tonem, jakby już nie żył.
Narrator:
Z głębi tunelu dochodzi śpiew. Dziecięcy. Wielogłosowy.

Choices:

Choice S07-C1 — „Idź za śpiewem”

Target: S09 Wizja Noi

Effects:

sanity -= 2
truth += 1
Noa.clarity += 1
Choice S07-C2 — „Użyj starej mapy, żeby ominąć głosy”

Target: S10 Brama Latarni

Condition group:

has_old_map == 1

Unavailable hint:

„Potrzebujesz starej mapy Miry.”

Effects:

supplies -= 1
Mira.trust += 1
tunnel_open = 1
Choice S07-C3 — „Wycofaj się i zamknij wejście”

Target: S10 Brama Latarni

Effects:

supplies -= 1
Mira.trust -= 1
Eryn Voss.control += 1
alarm_raised = 1
S08 — Gabinet Vossa

Background: elegancki gabinet nad portem, mapa miasta, stalowa lampa.

Dialogue pages:

Eryn Voss:
Lio. Skryba, który chodzi tam, gdzie nie powinien.
Lio:
A Strażnik, który wie, zanim ktokolwiek powie.
Eryn Voss:
Miasto to nie księga. Nie każdą prawdę można otworzyć bez konsekwencji.
Narrator:
Voss kładzie na biurku klucz z białego metalu. Nie proponuje go. Pokazuje, że mógłby.

Choices:

Choice S08-C1 — „Udawaj lojalność wobec Vossa”

Target: S10 Brama Latarni

Effects:

Eryn Voss.respect += 2
Eryn Voss.suspicion -= 1
var_voss_route = 1
reputation += 1
Choice S08-C2 — „Oskarż go o ofiary”

Target: S10 Brama Latarni

Condition group:

truth >= 2

Unavailable hint:

„Masz za mało dowodów.”

Effects:

Eryn Voss.suspicion += 2
Eryn Voss.respect += 1
reputation += 1
alarm_raised = 1
Choice S08-C3 — „Ukradnij klucz z biurka”

Target: S10 Brama Latarni

Condition group:

Eryn Voss.suspicion <= 1

Unavailable hint:

„Voss obserwuje każdy twój ruch.”

Effects:

stole_key = 1
Eryn Voss.suspicion += 2
Lio.courage += 1
S09 — Wizja Noi

Background: surrealistyczna wersja miasta pod wodą, latarnia jak oko.

Dialogue pages:

Noa:
Zamknij oczy. Inaczej światło zobaczy ciebie pierwsze.
Narrator:
Miasto znika. Stoisz na dnie morza. Nad tobą Veyr unosi się jak zatopiony dzwon.
Noa:
Oni nie umarli. Oni świecą.
Lio:
Kto?
Noa:
Ci, których oddano latarni.
Narrator:
W świetle widzisz twarze. Jedna z nich patrzy prosto na ciebie i porusza ustami: „Przerwij umowę.”

Choices:

Choice S09-C1 — „Przyjmij wizję do końca”

Target: S10 Brama Latarni

Effects:

truth += 2
sanity -= 2
Noa.bond += 1
seen_noa_vision = 1
Lio.insight += 2
Choice S09-C2 — „Odepchnij Noę i przerwij wizję”

Target: S10 Brama Latarni

Effects:

sanity += 1
Noa.bond -= 1
Noa.danger += 1
Lio.guilt += 1
Choice S09-C3 — „Obiecaj Noi, że nie pozwolisz jej zabrać”

Target: S10 Brama Latarni

Effects:

helped_noa = 1
Noa.bond += 2
Lio.courage += 1
sanity -= 1
S10 — Brama Latarni

Background: podstawa latarni, burza, strażnicy przy bramie.

Dialogue pages:

Narrator:
Noc przyszła za wcześnie. Światło latarni pulsowało jak serce pod cienką skórą.
Eryn Voss:
Dalej nie przejdziesz.
Mira:
Chyba że nie będzie stał sam.
Ojciec Cael:
Albo chyba że ktoś wreszcie przestanie milczeć.
Noa:
Ono jest głodne.

Choices:

Choice S10-C1 — „Wejdź z Mirą przez tunele”

Target: S11 Serce Latarni

Condition group:

has_old_map == 1
Mira.trust >= 2

Unavailable hint:

„Mira nie ufa ci wystarczająco albo nie masz mapy.”

Effects:

final_path = 1
Mira.loyalty += 1
supplies -= 1
Choice S10-C2 — „Poproś Caela, by publicznie wyznał prawdę”

Target: S11 Serce Latarni

Condition group:

priest_confessed == 1
Ojciec Cael.trust >= 2

Unavailable hint:

„Cael nie jest gotowy wystąpić przeciw zakonowi.”

Effects:

final_path = 1
reputation += 2
Ojciec Cael.shame -= 1
Eryn Voss.control -= 1
Choice S10-C3 — „Przekonaj Vossa, że możesz mu pomóc”

Target: S11 Serce Latarni

Condition group:

Eryn Voss.respect >= 2

Unavailable hint:

„Voss nie widzi w tobie partnera.”

Effects:

final_path = 3
var_voss_route = 1
Eryn Voss.suspicion -= 1
Choice S10-C4 — „Użyj skradzionego klucza”

Target: S11 Serce Latarni

Condition group:

stole_key == 1

Unavailable hint:

„Nie masz klucza do latarni.”

Effects:

final_path = 2
alarm_raised = 1
Eryn Voss.suspicion += 2
Choice S10-C5 — „Uciekaj z miasta, póki możesz”

Target: S14 Zakończenie: Ucieczka z Mapą

Conditions:

none

Effects:

final_path = 4
Lio.guilt += 2
S11 — Serce Latarni

Background: wnętrze latarni, ogromny rdzeń światła, sylwetki ludzi zatopione w blasku.

Dialogue pages:

Narrator:
Wewnątrz latarni nie było schodów. Była spirala kości, szkła i soli.
Lio:
To nie mechanizm.
Eryn Voss:
Nie. To kompromis.
Noa:
Ono chce nowego głosu.
Mira:
Lio, powiedz mi, że mamy plan.
Ojciec Cael:
Plan? Nie. Tylko wybór.

Choices:

Choice S11-C1 — „Rozbij rdzeń i ujawnij prawdę miastu”

Target: S12 Zakończenie: Światło Prawdy

Condition group A:

truth >= 5
sanity >= 2

Condition group B:

Noa.bond >= 3
Lio.courage >= 2

Unavailable hint:

„Potrzebujesz więcej prawdy albo silniejszej więzi z Noą.”

Effects:

light = 0
truth += 1
reputation += 2
Choice S11-C2 — „Oddaj kontrolę Vossowi”

Target: S13 Zakończenie: Porządek Vossa

Condition group:

var_voss_route == 1

Unavailable hint:

„Nie zbudowałeś relacji z Vossem.”

Effects:

Eryn Voss.control += 2
sanity += 1
truth -= 1
Choice S11-C3 — „Zwiąż światło ze sobą”

Target: S15 Zakończenie: Nowy Strażnik

Condition group:

stole_key == 1
Lio.insight >= 3

Unavailable hint:

„Nie rozumiesz jeszcze rytuału albo nie masz klucza.”

Effects:

light += 3
sanity -= 3
Lio.guilt += 2
Choice S11-C4 — „Uciekaj z rejestrem ofiar”

Target: S14 Zakończenie: Ucieczka z Mapą

Condition group:

truth >= 3

Unavailable hint:

„Nie masz wystarczających dowodów, by prawda przeżyła poza Veyr.”

Effects:

reputation -= 2
Lio.guilt += 1
6. Zakończenia
S12 — Zakończenie: Światło Prawdy

Warunek wejścia: wybór rozbicia rdzenia.

Dialogue pages:

Narrator:
Gdy rdzeń pękł, mgła nie zniknęła od razu. Najpierw krzyknęła głosami wszystkich, których miasto oddało w zamian za spokojne poranki.
Mira:
Słyszysz? To oni wracają.
Ojciec Cael:
Nie. To my wreszcie ich słyszymy.
Noa:
Teraz miasto musi nauczyć się nocy.
Narrator:
Latarnia zgasła. Veyr ocalało, ale bez kłamstwa, które przez lata udawało światło.

Ending tone: dobre, ale gorzkie zakończenie.

S13 — Zakończenie: Porządek Vossa

Warunek wejścia: oddanie kontroli Vossowi.

Dialogue pages:

Eryn Voss:
Zrobiłeś rozsądną rzecz, Lio.
Lio:
Nie wiem, czy rozsądek wystarczy, żeby nazwać to ocaleniem.
Narrator:
Następnego dnia mgła cofnęła się od murów. Ludzie świętowali. Nikt nie pytał, dlaczego dzwony kaplicy biły jak na pogrzeb.
Eryn Voss:
Miasto potrzebuje światła. Nie prawdy.
Narrator:
Veyr przetrwało. I właśnie dlatego nigdy nie było bardziej stracone.

Ending tone: złe / autorytarne zakończenie.

S14 — Zakończenie: Ucieczka z Mapą

Warunek wejścia: ucieczka przed finałem albo z rejestrem.

Dialogue pages:

Narrator:
Opuściłeś Veyr przed świtem. Za tobą latarnia świeciła spokojnie, jak oko kogoś, kto pozwala ofierze odejść tylko dlatego, że zna drogę powrotną.
Lio:
Ktoś musi dowiedzieć się prawdy.
Narrator:
W torbie miałeś mapę, rejestr i sól z kaplicy. Za mało, by ocalić miasto. Wystarczająco, by zacząć wojnę z jego kłamstwem.
Noa, szeptem w pamięci:
Drogi zawsze wracają do portu.

Ending tone: neutralne / sequel hook.

S15 — Zakończenie: Nowy Strażnik

Warunek wejścia: związanie światła ze sobą.

Dialogue pages:

Narrator:
Światło weszło pod twoją skórę bez bólu. Ból przyszedł dopiero wtedy, gdy usłyszałeś pierwszą modlitwę miasta.
Lio:
Cicho. Ja was ochronię.
Mira:
Lio… co zrobiłeś?
Narrator:
Latarnia rozbłysła mocniej niż kiedykolwiek. Mgła uklękła przed jej blaskiem.
Narrator:
A pod miastem coś uśmiechnęło się twoimi ustami.

Ending tone: mroczne secret ending.

7. Najważniejsze zależności logiczne
Dobra ścieżka — „Prawda i więź”

Najlepiej prowadzi przez:

S01: Schowaj księgę
S02: Mira albo Cael
S05: Pomóż Noi
S06: Zabierz rejestr
S09: Przyjmij wizję
S10: Mira/Cael
S11: Rozbij rdzeń

Kluczowe wartości:

truth >= 5
sanity >= 2
Noa.bond >= 3
Lio.courage >= 2
Ścieżka Vossa — „Porządek ponad prawdę”

Prowadzi przez:

S02: obserwuj straż
S03: oddaj sprawę straży
S08: udawaj lojalność
S10: przekonaj Vossa
S11: oddaj kontrolę

Kluczowe wartości:

var_voss_route == 1
Eryn Voss.respect >= 2
Secret ending — „Nowy Strażnik”

Prowadzi przez:

S04 albo S08: zdobądź/skradnij klucz
S06/S09: zwiększ insight
S11: zwiąż światło ze sobą

Kluczowe wartości:

stole_key == 1
Lio.insight >= 3
8. Sugestia implementacyjna w Narrium

Najłatwiej wdrożyć historię w takiej kolejności:

Utwórz Characters i ich attributes.
Utwórz Resources z wartościami startowymi.
Utwórz Variables.
Dodaj wszystkie sceny bez choices.
Uzupełnij dialogue pages.
Dodaj choices i targetSceneId.
Dopiero na końcu dodaj conditions/effects.
Uruchom Preview i sprawdź, czy zakończenia są osiągalne.

Dzięki temu Project Validation powinien szybko pokazać ewentualne braki w referencjach, np. wybór wskazujący nieistniejącą scenę albo effect odwołujący się do usuniętego resource/variable/character attribute. Narrium ma walidację takich broken references dla Story Logic.
