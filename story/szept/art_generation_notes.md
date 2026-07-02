# Art Generation Notes — Szept pod Latarnią

Ten dokument jest dodatkiem do `story/szept/art_bible.md`.

Cel: utrwalić praktyczne zasady wynikające z zaakceptowanych scen `SC01 — Archiwum po północy`, `SC02 — Rynek we mgle`, `SC03 — Spotkanie z Mirą` i `SC04 — Kaplica Soli`, aby kolejne prompty i edycje były bardziej spójne, czytelne i lepiej dopasowane do visual novel.

---

## 1. Status scen referencyjnych

### SC01 — Archiwum po północy

Pierwsza wygenerowana ilustracja `SC01 — Archiwum po północy` zostaje zaakceptowana jako kierunek jakościowy dla historii.

Najważniejsze cechy, które warto utrzymać:

- cinematic dark fantasy visual novel scene CG,
- półrealistyczny, malarski styl,
- mocny kontrast zimnego światła latarni i ciepłych świec,
- Lio po lewej stronie kadru,
- księga jako centralny rekwizyt,
- latarnia widoczna przez okno,
- mokre, stare, gotyckie archiwum,
- dolna część obrazu wystarczająco ciemna pod dialogue box.

### SC02 — Rynek we mgle

`SC02 — Rynek we mgle` zostaje zaakceptowana jako referencja dla scen typu **Decision Composition**, czyli scen, w których obraz pokazuje kilka możliwych ścieżek wyboru.

Najważniejsze cechy, które warto utrzymać:

- Lio jako punkt wejścia w kadrze,
- Mira, Cael i strażnicy jako wizualne opcje / zagrożenia,
- latarnia obecna w tle jako story anchor,
- mokry rynek Veyr, mgła i odbicia światła,
- czytelne rozmieszczenie postaci bez potrzeby tekstowego wyjaśnienia.

### SC03 — Spotkanie z Mirą

`SC03 — Spotkanie z Mirą` zostaje zaakceptowana w wersji, w której mapa nie jest prezentowana płasko do kamery, tylko leży na skrzyni / beczce jako używany przedmiot.

Najważniejsze cechy, które warto utrzymać:

- Mira i Lio pochylają się nad mapą,
- mapa leży na naturalnym podparciu, np. skrzyni lub beczce,
- Mira wskazuje konkretny punkt,
- Lio aktywnie analizuje trasę,
- scena wygląda jak tajna narada, nie jak pozowana prezentacja pergaminu.

### SC04 — Kaplica Soli

`SC04 — Kaplica Soli` zostaje zaakceptowana w wersji po edycji, gdzie Cael i Lio są uchwyceni w naturalnym momencie rozmowy.

Najważniejsze cechy, które warto utrzymać:

- Cael patrzy na misę z solanką albo waha się przed odpowiedzią,
- Lio pochyla się do przodu, oczekując wyjaśnienia,
- misa z solanką wygląda jak rytualny, stary przedmiot,
- kaplica zachowuje morski, solny charakter,
- krypta jest obecna jako story anchor, ale nie dominuje kadru.

Te zaakceptowane sceny powinny być traktowane jako **quality bar** dla kolejnych backgroundów / scene CG.

---

## 2. Hero Prop Rule

Każda ważna scena powinna mieć jeden główny rekwizyt fabularny.

Ten rekwizyt powinien być natychmiast czytelny dla gracza, ale nie powinien wyglądać jak przesadnie magiczny obiekt, chyba że dana scena tego wymaga.

Przykłady:

| Scena | Hero Prop |
|---|---|
| SC01 — Archiwum po północy | Księga bez tytułu |
| SC03 — Spotkanie z Mirą | Stara mapa tuneli |
| SC04 — Kaplica Soli | Misa z solanką |
| SC06 — Zakazane archiwum | Rejestr ofiar |
| SC08 — Gabinet Vossa | Biały klucz latarni |
| SC11 — Serce Latarni | Rdzeń latarni |

Prompt rule:

```text
The primary story prop must immediately draw the viewer's attention.
Use composition, lighting and contrast to emphasize it naturally.
Do not add exaggerated magical glow unless the scene explicitly requires supernatural power.
```

---

## 3. Visual Story Triangle

Każda kluczowa scena powinna mieć trzy czytelne punkty kompozycji:

1. **Hero Character** — najważniejsza postać w scenie.
2. **Hero Prop** — najważniejszy rekwizyt fabularny.
3. **Story Anchor** — element świata, który wzmacnia temat sceny.

Dla SC01:

```text
Hero Character: Lio
Hero Prop: The nameless ledger
Story Anchor: The lighthouse visible through the window
```

Dla SC04:

```text
Hero Character: Lio
Conflicted Character: Father Cael
Hero Prop: The salt-water bowl
Story Anchor: The sealed crypt door / lighthouse window
```

Schemat:

```text
        Story Anchor
             ▲
             │
Hero Prop ◄──────► Hero Character
```

Prompt rule:

```text
Build the composition around a clear visual story triangle: the main character, the primary story prop and the story anchor.
The viewer's eye should naturally move between these three elements.
```

---

## 4. Decision Composition

Niektóre sceny nie mają jednego prostego hero propa. Zamiast tego ich funkcją jest pokazanie kilku ścieżek wyboru.

W takich scenach obraz powinien działać jak **mapa decyzji ukryta w kadrze**.

Dla SC02:

```text
Hero Character: Lio
Visible Choice A: Mira in the alley
Visible Choice B: Father Cael near the doorway
Visible Threat: Harbor guards
Story Anchor: Lighthouse glow in the distance
```

Prompt rule:

```text
For choice-heavy scenes, use Decision Composition.
Place the protagonist as the entry point of the frame.
Show each major route, ally, or threat as a readable visual option in the environment.
The player should understand the possible directions by looking at the image before reading the choices.
```

---

## 5. Natural Interaction Rule

Sceny z dwoma lub więcej postaciami nie powinny wyglądać jak pozowane ilustracje. Postacie powinny naturalnie używać rekwizytów i reagować na siebie.

Problem do unikania:

```text
Two characters standing frontally and holding an object toward the camera.
```

Lepszy kierunek:

```text
One character uses the object naturally while the other reacts, leans, points, hesitates, reaches, listens or observes.
```

Prompt rule:

```text
Whenever two or more characters interact with an object, the object should be used naturally rather than presented to the viewer.
Avoid symmetrical poses.
Avoid both characters holding the same object unless physically necessary.
Prefer natural body language: leaning, pointing, resting objects on furniture, partially unfolded documents, casual gestures, hesitation, interrupted movement.
The scene should feel like a captured moment rather than a posed illustration.
```

Przykład dla SC03:

```text
Mira has placed the old tunnel map on top of a weathered wooden crate.
The map is only partially unfolded.
Its corners curl naturally.
The parchment is damp, worn and uneven.
Mira points at one specific location with one finger.
Lio leans closer to inspect the marked route.
The conversation feels secretive, intimate and tense.
The map is a working object, not something displayed to the viewer.
Avoid symmetrical poses.
Avoid presenting the map toward the camera.
The characters should appear naturally engaged with the map rather than posing for it.
```

---

## 6. Action Moment Rule

Najlepsze sceny wyglądają jak zatrzymana klatka filmu, a nie jak statyczny portret postaci w lokacji.

Każda scena powinna opisywać **konkretny moment działania**.

Prompt rule:

```text
Capture the exact moment of an action rather than a static pose.
Each important character should be in the middle of a believable action or reaction.
Avoid characters simply standing and looking at each other.
The scene should feel like a still frame from a dark fantasy film.
```

Przykłady dobrych czasowników:

- opening a book,
- lowering a bowl,
- pointing at a map,
- leaning closer,
- hesitating before answering,
- reaching for a key,
- turning toward a sound,
- placing an object on a table,
- looking over a shoulder,
- interrupting a ritual.

Przykład dla SC04:

```text
Father Cael has just interrupted his ritual after hearing Lio's question.
He lowers the salt-water bowl slightly and looks down at the water before answering.
Lio takes one cautious step closer and leans forward, waiting for the truth.
The scene captures the moment of hesitation before confession.
```

---

## 7. Asymmetry and Vertical Staging

Modele generatywne często ustawiają postacie na tej samej wysokości i w podobnych pozach. To szybko daje efekt sztucznej, pozowanej sceny.

Prompt rule:

```text
Avoid perfectly mirrored standing compositions.
Whenever possible, create asymmetry through posture, height, leaning, seated positions or interaction with the environment.
Characters should occupy different vertical levels and body angles to create a more cinematic composition.
```

Przykłady:

- jedna postać pochyla się nad mapą, druga wskazuje trasę,
- jedna postać stoi, druga siedzi lub opiera się o ołtarz,
- jedna postać odwraca wzrok, druga czeka na odpowiedź,
- jedna postać jest bliżej kamery, druga częściowo ukryta w cieniu.

---

## 8. Background Hierarchy

Tło powinno wspierać scenę, ale nie może konkurować z postacią i głównym rekwizytem.

Dla scen bogatych w detale, takich jak archiwum, gabinet Vossa lub kaplica, trzeba pilnować hierarchii ostrości i kontrastu.

Prompt rule:

```text
Background details should support the scene but never compete with the main character or the primary story prop.
Keep the main character and hero prop sharper and more contrasted than the background.
Slightly soften and darken distant bookshelves, walls and secondary props.
```

---

## 9. Visual Novel Dialogue Area

Każdy obraz musi działać z dialogue boxem na dole ekranu.

Dolne 25–30% obrazu powinno być spokojniejsze, ciemniejsze i mniej szczegółowe. Nie należy umieszczać tam ważnych twarzy, dłoni, rekwizytów ani tropów fabularnych.

Prompt rule:

```text
Keep the lower 25–30% of the image visually calm, darker and less detailed for visual novel dialogue box overlay.
Do not place important faces, hands, clues or primary props in the bottom dialogue area.
A dark wooden table, stone floor, shadow or empty foreground is preferred.
```

---

## 10. Character Identity Preservation

Podczas edycji istniejących obrazów lub tworzenia kolejnych scen z tą samą postacią generator może przypadkowo zmienić twarz, wiek, fryzurę lub ubranie. Trzeba temu aktywnie zapobiegać.

Prompt rule:

```text
Preserve the exact identity of the character.
Do not redesign or reinterpret the face.
Do not change hairstyle, facial proportions, age, clothing or silhouette.
Treat this as the same character in the same story world.
```

Dla Lio:

```text
Preserve Lio as the same young male archivist from SC01: dark tired eyes, short dark brown hair, slim build, simple dark charcoal coat, leather satchel and ink-stained fingers.
```

Dla Miry:

```text
Preserve Mira as the same hooded smuggler from SC02 and SC03: young adult woman, sharp suspicious eyes, dark green hooded cloak, weathered leather coat, practical boots, knife at belt, map case, dull brass buckles, slightly tired face and worn clothing.
Avoid making her look too glamorous or like a polished fantasy assassin.
```

Dla Ojca Caela:

```text
Preserve Father Cael as the same older priest from SC04: grey hair, tired compassionate eyes, salt-white robes, faded dark blue stole, sea-shell or salt symbol and a burdened, conflicted expression.
Do not make him look villainous, demonic or like a cult leader.
```

---

## 11. Edit Prompt Template

Do edycji istniejącego obrazu nie należy przepisywać całego promptu sceny. Edycja powinna jasno mówić, że obraz ma zostać zachowany, a zmienione mają być tylko konkretne elementy.

Template:

```text
Keep the overall composition, atmosphere, architecture, character, lighting style and color palette exactly as they are.
Do NOT regenerate the scene.
This is an edit of the existing image only.

Apply only the following changes:

1. [Specific change]
2. [Specific change]
3. [Specific change]

Preserve the exact identity of all characters.
Do not redesign faces, clothing, hairstyle or silhouettes.
Do not add new characters, new props, UI, readable text, logo or watermark.
The final image should remain almost identical to the original, only improved according to the requested adjustments.
```

---

## 12. Accepted Quality Direction

SC01 is accepted even if it is slightly more realistic than the initial target style.

SC02, SC03 and SC04 confirm that the preferred target style is:

- cinematic dark fantasy realism,
- subtle painterly finish,
- realistic but not photographic character rendering,
- strong location identity,
- one clear story action per scene,
- one clear rekwizyt / decision structure per scene,
- consistent Lio, Mira and Cael identities.

For future scenes:

- keep the same mood and quality,
- keep the cinematic realism,
- avoid going more photorealistic than SC01–SC04,
- prefer a subtle painterly finish,
- maintain consistent lighting and color grading,
- add an action moment rather than static posing.

Prompt rule:

```text
Match the quality, mood and cinematic dark fantasy realism of the accepted SC01 archive scene, SC02 foggy marketplace scene, SC03 alley map scene and SC04 salt chapel scene.
Use a subtle painterly finish, but do not make the image anime, cartoon or overly stylized.
Capture a natural action moment, not a static pose.
```

---

## 13. Practical Prompt Add-on

Ten blok można dopisywać do kolejnych promptów scen:

```text
Composition guidance:
Build the scene around a clear visual story triangle: main character, primary story prop and story anchor.
The primary story prop must be immediately readable and naturally emphasized by light and contrast.
For choice-heavy scenes, use Decision Composition so routes, allies and threats are readable in the frame.
Characters should be captured in a natural action moment, not a posed illustration.
Whenever characters interact with an object, the object should be used naturally rather than presented to the viewer.
Avoid symmetrical standing poses; use posture, leaning, height differences and interaction with the environment.
Background details should support the scene but never compete with the character or the hero prop.
Keep the lower 25–30% darker, calmer and less detailed for visual novel dialogue overlay.
Preserve character identity across scenes.
Match the quality, mood and cinematic dark fantasy realism of the accepted SC01–SC04 scenes.
```

---

## 14. Practical Edit Add-on

Ten blok można dopisywać do promptów edycyjnych:

```text
Do not regenerate the whole image.
Preserve the exact composition, character identity, architecture, camera angle, color palette and mood.
Only adjust the specific requested elements.
If the scene feels posed, turn it into a captured action moment using natural body language and object interaction.
Keep the final image very close to the original.
Do not add UI, text, logos, extra characters, modern objects or unrelated props.
```
