# Art Generation Notes — Szept pod Latarnią

Ten dokument jest dodatkiem do `story/szept/art_bible.md`.

Cel: utrwalić praktyczne zasady wynikające z pierwszej wygenerowanej sceny `SC01 — Archiwum po północy`, aby kolejne prompty i edycje były bardziej spójne, czytelne i lepiej dopasowane do visual novel.

---

## 1. Status pierwszej sceny referencyjnej

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

Ta scena powinna być traktowana jako **quality bar** dla kolejnych backgroundów / scene CG.

---

## 2. Hero Prop Rule

Każda ważna scena powinna mieć jeden główny rekwizyt fabularny.

Ten rekwizyt powinien być natychmiast czytelny dla gracza, ale nie powinien wyglądać jak przesadnie magiczny obiekt, chyba że dana scena tego wymaga.

Przykłady:

| Scena | Hero Prop |
|---|---|
| SC01 — Archiwum po północy | Księga bez tytułu |
| SC03 — Spotkanie z Mirą | Stara mapa tuneli |
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

## 4. Background Hierarchy

Tło powinno wspierać scenę, ale nie może konkurować z postacią i głównym rekwizytem.

Dla scen bogatych w detale, takich jak archiwum, gabinet Vossa lub kaplica, trzeba pilnować hierarchii ostrości i kontrastu.

Prompt rule:

```text
Background details should support the scene but never compete with the main character or the primary story prop.
Keep the main character and hero prop sharper and more contrasted than the background.
Slightly soften and darken distant bookshelves, walls and secondary props.
```

---

## 5. Visual Novel Dialogue Area

Każdy obraz musi działać z dialogue boxem na dole ekranu.

Dolne 25–30% obrazu powinno być spokojniejsze, ciemniejsze i mniej szczegółowe. Nie należy umieszczać tam ważnych twarzy, dłoni, rekwizytów ani tropów fabularnych.

Prompt rule:

```text
Keep the lower 25–30% of the image visually calm, darker and less detailed for visual novel dialogue box overlay.
Do not place important faces, hands, clues or primary props in the bottom dialogue area.
A dark wooden table, stone floor, shadow or empty foreground is preferred.
```

---

## 6. Character Identity Preservation

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

---

## 7. Edit Prompt Template

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

## 8. SC01 Accepted Direction

SC01 is accepted even if it is slightly more realistic than the initial target style.

For future scenes:

- keep the same mood and quality,
- keep the cinematic realism,
- avoid going more photorealistic than SC01,
- prefer a subtle painterly finish,
- maintain consistent lighting and color grading.

Prompt rule:

```text
Match the quality, mood and cinematic dark fantasy realism of the accepted SC01 archive scene.
Use a subtle painterly finish, but do not make the image anime, cartoon or overly stylized.
```

---

## 9. Practical Prompt Add-on

Ten blok można dopisywać do kolejnych promptów scen:

```text
Composition guidance:
Build the scene around a clear visual story triangle: main character, primary story prop and story anchor.
The primary story prop must be immediately readable and naturally emphasized by light and contrast.
Background details should support the scene but never compete with the character or the hero prop.
Keep the lower 25–30% darker, calmer and less detailed for visual novel dialogue overlay.
Preserve character identity across scenes.
Match the quality, mood and cinematic dark fantasy realism of the accepted SC01 archive scene.
```

---

## 10. Practical Edit Add-on

Ten blok można dopisywać do promptów edycyjnych:

```text
Do not regenerate the whole image.
Preserve the exact composition, character identity, architecture, camera angle, color palette and mood.
Only adjust the specific requested elements.
Keep the final image very close to the original.
Do not add UI, text, logos, extra characters, modern objects or unrelated props.
```
