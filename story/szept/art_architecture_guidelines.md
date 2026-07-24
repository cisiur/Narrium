# Landmark Architecture Guidelines — Szept pod Latarnią

Ten dokument jest dodatkiem do:

- `story/szept/art_bible.md`
- `story/szept/art_generation_notes.md`
- `story/szept/art_prop_guidelines.md`

Cel: utrwalić zasady wynikające z iteracji scen landmarkowych oraz finalnie zaakceptowanych ilustracji rozszerzonej historii, szczególnie wnętrz Latarni, wielkich bram serwisowych i scen pościgu.

---

## 1. Core Rule

Dla landmarków architektonicznych najważniejsza jest najpierw czytelna sylwetka i logika konstrukcji, a dopiero potem detal.

Prompt rule:

```text
For landmark architecture, always ensure the silhouette reads correctly before adding decorative detail.
The building must be understandable as one coherent structure at a glance.
Prioritize clear massing, continuous vertical structure and believable architectural support.
Add ornamentation only after the main form is visually clear.
```

---

## 2. Lighthouse Continuity Rule

Latarnia w Veyr jest głównym landmarkiem historii. Musi zawsze być czytelna jako jedna monumentalna struktura.

Problem do unikania:

```text
The illuminated lantern room appears visually separated from the massive gate or base, creating the impression of two different lighthouse towers.
```

Dobry kierunek:

```text
The lantern room, tower shaft, base and gate read as one continuous monumental lighthouse structure.
The vertical architecture should connect clearly from gate to tower to lantern room.
```

Prompt rule:

```text
The illuminated lantern room should clearly belong to the same lighthouse structure as the massive base and gate below.
Visually connect the upper tower to the lower gate so they read as one continuous building.
Do not create a second separate lighthouse silhouette in the background.
Keep the lighthouse monumental and extremely tall, but make the vertical structure continuous and believable.
```

---

## 3. Lighthouse Design Direction

Latarnia powinna czytać się najpierw jako latarnia morska, a dopiero potem jako święta / monumentalna / mroczna budowla.

Prompt rule:

```text
The lighthouse should read as a lighthouse first, and only then as a monumental sacred or fortress-like structure.
Use a tall vertical tower, visible lantern room, coastal materials, weathered stone, iron, salt stains and pale white-blue beam.
Avoid making it look only like a cathedral, castle gate or fantasy fortress.
```

---

## 4. Base and Support Rule

Jeżeli latarnia jest bardzo wysoka, jej podstawa musi wyglądać konstrukcyjnie wiarygodnie.

Prompt rule:

```text
For extremely tall lighthouse shots, give the tower a believable massive base: buttresses, retaining walls, heavy stonework, terraces or structural supports.
The structure should feel capable of surviving storms, salt, wind and waves for centuries.
```

---

## 5. Great Service Gate Rule

Wielkie okrągłe bramy serwisowe pod Veyr nie były projektowane dla ludzi. Służyły do transportowania ogromnych elementów infrastruktury Latarni.

Worldbuilding note:

```text
The great circular gates were never intended for people.
They were maintenance portals used centuries ago to transport massive optical conduits, counterweights and mechanical components beneath Veyr.
```

Prompt rule:

```text
When showing a great circular service gate, make its scale feel practical rather than decorative.
The gate should read as a maintenance portal for moving massive lighthouse components, not as a fantasy portal or ceremonial doorway.
Use stone rollers, iron locking ribs, counterweights, chains and restrained brass hardware.
```

---

## 6. Lighthouse Interior Engineering Rule

Wnętrza Latarni powinny wyglądać jak jedna ogromna, rozbudowywana przez stulecia maszyna.

Prompt rule:

```text
The lighthouse interior must feel like one coherent engineered structure.
Use weathered coastal stone, dark iron, restrained brass, chains, optical glass, ladders, walkways, counterweights and maintenance platforms.
Every visible element should appear to have a clear structural or maintenance purpose.
Avoid random pipes, decorative machinery, impossible supports and fantasy-dungeon geometry.
```

---

## 7. Dynamic Route Readability Rule

Sceny pościgu i ucieczki muszą być czytelne przestrzennie. Kierunek ruchu jest ważniejszy niż rozmach architektury.

Prompt rule:

```text
For dynamic route scenes, make the path physically understandable at a glance.
Use one continuous staircase or route whenever possible.
Show who is ahead, who is behind and where the route continues.
Do not place pursuers ahead of escaping characters unless the scene is intentionally an ambush.
Avoid Escher-like staircases, branching routes, floating platforms and maze-like bridges.
```

---

## 8. One Main Route Rule

Najlepszy kierunek dla `Chase Along the Spiral` potwierdził, że jedna czytelna trasa działa lepiej niż panoramiczny przekrój całego wnętrza.

Prompt rule:

```text
Use one main continuous spiral staircase as the dominant route.
Limit the scene to one lower platform and at most one secondary bridge.
The viewer should immediately understand how the characters can physically move through the space.
The architecture should support the chase rather than compete with it.
```

---

## 9. Avoid Surreal Monumentality

Monumentalność powinna wynikać z wysokości, materiałów i skali, a nie z niemożliwej geometrii.

Prompt rule:

```text
Preserve monumentality through scale, vertical depth, structural supports and atmospheric perspective.
Do not create impossible staircases, floating architecture, disconnected bridges or abstract mechanical forms.
The structure should feel buildable, maintainable and historically evolved.
```

---

## 10. SC10 Reference — Lighthouse Gate

Zaakceptowana wersja `SC10 — Brama Latarni` potwierdza właściwy kierunek:

- jedna spójna latarnia, nie dwie osobne wieże,
- monumentalna pionowa sylwetka,
- brama osadzona w tej samej strukturze co wieża,
- postacie małe wobec skali budynku,
- latarnia działa jako oś kompozycji i punkt bez powrotu.

Prompt rule:

```text
Match the accepted SC10 lighthouse gate direction: one continuous monumental lighthouse rising from the sealed gate, with characters small at the base and the lantern room visibly connected to the tower above.
```

---

## 11. Edit Prompt Add-on For Landmark Architecture

Do używania przy poprawkach architektury landmarków:

```text
Keep all characters, poses, lighting, weather, camera angle and atmosphere unchanged.
Only adjust the landmark architecture.
Make the main silhouette read clearly as one coherent structure.
Visually connect separated architectural elements that should belong to the same building.
Reduce the impression of duplicate towers or separate landmarks.
Preserve monumentality, but make the structure believable and continuous.
Do not add unrelated towers, castles, cathedrals or fantasy ornaments that confuse the silhouette.
```
