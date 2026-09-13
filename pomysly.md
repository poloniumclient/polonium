# Polonium — obejścia GrimAC (research źródeł, branch 2.0)

Źródła: `GrimAnticheat/Grim`, branch `2.0`, `common/src/main/java/ac/grim/grimac/checks/`.

## 1. Jak Grim liczy (fakty ze źródeł)

### Timer (`impl/timer/Timer.java`)
- Każdy flying = +50ms „zegara gracza". Flaga, gdy zegar wyprzedza czas rzeczywisty.
- **Tolerancja na dodatkowe Looki: 0/s sustained.** 4 Looki/s = dług 200ms/s.
- Wniosek: wstrzykiwanie flyingów w sposób ciągły jest matematycznie niemożliwe.

### RotationPlace (`impl/scaffolding/RotationPlace.java`)
- Ray z rotacji serwera (`yaw/pitch`, `lastYaw/pitch`, `lastYaw/lastPitch`) musi trafić
  stawiany blok w zasięgu `BLOCK_INTERACTION_RANGE` (4.5).
- `pre-flying` leci TYLKO po wcześniejszym missie (`flagBuffer > 0`) — to kaskada.
  Zabicie missów zabija pre-flying.
- Place powyżej 4.5 od oczu NIGDY nie trafiają rayem = gwarantowana flaga.

### Post (`impl/misc/Post.java`)
- Kolejkuje akcje (slot/interact/place/atak/...) po flyingu. Gdy odpowiedź
  transaction przyjdzie przed następnym flyingiem → flaga z nazwą pierwszego
  pakietu (`held item change v1.21`, `player block placement v1.21`).
- Wstrzyknięte pakiety ścigają się z async odpowiedziami serwera.

### BadPacketsA (`impl/badpackets/BadPacketsA.java`)
- Flaga za **ten sam slot dwa razy pod rząd**. Duplikat jest KASOWANY
  → desync slotu (my vs serwer) → wtórne Post/Simulation/ghost-blocki.

### AimDuplicateLook (`impl/aim/AimDuplicateLook.java`)
- Flaga przy **dokładnie równych** kątach (`oldYaw == newYaw && oldPitch == newPitch`).
- Vanilla nigdy nie wysyła duplikatu (rotacja tylko przy zmianie).
- Force-resend co 500ms = proszenie się o flagę.

### DuplicateRotPlace (`impl/scaffolding/DuplicateRotPlace.java`, experimental)
- Flaga, gdy **delta yaw powtarza się co do 0.0001** podczas placów.
- Rotacji nie wolno kwantować do identycznych delt.

## 2. Generyczne obejścia

### A. Replacement zamiast injection (główne)
Mixin na wysyłkę flyingu: gdy tick potrzebuje własnej rotacji, PODMIENIAMY rotację
w pakiecie vanilli zamiast wysyłać drugi pakiet.
- Bilans: dokładnie 20 flyingów/s → Timer nie ma czego liczyć.
- Post widzi vanilla-kolejność, RotationPlace dostaje ray z naszej rotacji.
- Pakiety nieodróżnialne (vanilla-kanał, vanilla-tempo).

### B. Cap reach 4.3
Wszystkie place (scaffold/crystal/anchor/obby): hit dalej niż ~4.3 od oczu = skip.
Margines poniżej serwerowego 4.5 na desync pozycji.

### C. Slot single-source-of-truth
Jeden strażnik „ostatnio wysłany slot" dla wszystkich modułów.
Duplikat niemożliwy z konstrukcji → koniec BadPacketsA i wtórnych desynców.

### D. Zero force-resendów
Wysyłka Looka tylko przy realnej delcie (> 0.75, jak KillAura).
Duplikat nie istnieje w naturze → nie istnieje u nas.

### E. Head-rotate default, silent tryb
Skoro A daje darmową rotację w pakiecie vanilli, osobny Look tylko gdy kamera
absolutnie nie może drgnąć.

## 3. Kolejność wdrażania
1. C + D (szybkie, tnie BadPacketsA / Post / AimDuplicateLook).
2. B (jedna stała reach).
3. A (mixin, sedno — najwięcej roboty).

## 4. Do potwierdzenia na grim-test (pomiary)
- Timer: sustained 20/s vs 21/s vs burst — potwierdzić zero tolerancji.
- Post: jak często legit scroll-click łapie flagę (poziom tła do pobicia).
- RotationPlace: ray-hit na 4.3 / 4.4 / 4.5 (gdzie realna granica z desynciem).
- DuplicateRotPlace: czy smooth-lerp delty kiedykolwiek się powtarzają.

## 5. Ślepe punkty Grim (ze źródeł, `grimac/grim` lokalnie)

### Krytyczne: break powyżej 3.0 = kaskada kasacji (`impl/combat/Reach.java`)
- Limit ataku = `ENTITY_INTERACTION_RANGE` serwera (3.0 + ~0.0007), oko→intercept.
- Po JEDNYM missie `cancelBuffer = 1` → 4 następne hity kasowane realtime
  (`Reach.block-impossible-hits: true` default). Jeden niechlujny atak = seria
  „animacji bez hita".
- FIX: atak twardo ≤ 2.9 niezależnie od settingu distance; rayGate surowszy niż
  serwer (expand 0.03, intercept ≤ 2.95, nie 0.12).
- Kryształ ma hardcoded box ±1 XZ / +2 Y — duży cel, łatwy ray.
- `boat/chest_boat/shulker` na blackliście reach (exempt).

### Wyłączone defaultowo (53× `experimental = true`, config `experimental-checks: false`)
Na defaultowym Grimie NIE ISTNIEJE: PacketOrder A–P, MultiPlace, MultiActions
A/B/E/F/G, MultiInteractA/B, Sprint B–G, RotationBreak/NoSwingBreak/MultiBreak/
FarBreak, BadPackets H/C/M/P/R/V/X/Z, NegativeTimer. Dwa światy: default (luźno)
vs strict — celujemy w strict, znamy zapas.

### Tolerancje liczbowe
- Blok-place: 4.5 + 0.0002 (`getMovementThreshold()` na 1.9+) → cap 4.3.
- `getMovementThreshold()`: 0.03 na ≤1.8, **0.0002** na 1.9+.
- Timer: zero sustained, bank 120ms driftu (`clockDrift`).
- `packet-spam-threshold: 100` — skasowane pakiety liczą się do KICKA.
- Cursor place: tylko NaN/Inf (`InvalidPlaceCursor`) + granice [0,1]
  (`FabricatedPlace`) — środek ściany zawsze przechodzi.
- `Post` spłukuje flagi tylko gdy `isTickingReliablyFor(3)` — pełny bezruch
  rzadziej spłukuje (nisza).

### Wyłączenia stanowe
- `inVehicle()`: RotationPlace, FarPlace, PositionPlace i Reach skipują.
- CLICK_WINDOW zwolniony z Post na 1.13+.
- 1.8 klienci: +0.1 do hitboxa, vanilla-sanctioned (słowa deva). Opcja na potem.
- SprintA: tylko głód ≤ 6 (pilnujemy), setback 0.
- `NoFall` sprawdza tylko pakiety BEZ pozycji (GROUND/LOOK z ground=true) poza
  ziemią; pełny pakiet (pozycja+ground) idzie do predykcji/GroundSpoof.
  Tryb Ghost (1 pakiet) i Vanilla (co 3. tick) — oba w świetle tego do przeżycia,
  Vanilla ryzykowniejszy.

### Pułapki po naszej stronie (ze źródeł)
- `MultiPlace` (experimental): wiele RÓŻNYCH placów w ticku — max 1 place/tick.
- `AirLiquidPlace`: support musi być twardy u serwera (2 ticki historii) —
  nie chainować placów po własnych świeżych ghostach.
- `PositionPlace`: nie klikać ukrytych ścian (klikamy od strony pustki — OK).
- Eye-box пересекающий blok = auto-pass RotationPlace/PositionPlace.

## 6. Web research (techniki z dziczy)

- Dev Grim (SamB440, issue #2720): „We don't have scaffold checks. As long as
  you follow vanilla rules any scaffold is possible." — vanilla-mimic potwierdzony
  oficjalnie.
- Timer balance abuse istnieje, ale Grim celowo toleruje graczy high-ping
  („aren't violating gameplay rules") — lokalny ping ~0 nie daje luzu.
- Publiczny NoSlow switch-item (slot→payload→slot) częściowo patchowany (#1623) —
  nie polegać, ale mechanika okien slotów prawdziwa.
- Wurst: randomizacja CPS ±100ms bije analizy timingowe — humanizacja (mamy jitter
  aury, rozszerzyć na place).
- Opal (anti-aim): spoof nigdy niezgodny z real = wykrywalny z definicji; rotacja
  serwera blisko realnej (smooth, małe delty) — nasze podejście zgodne.
- Hypixel-thread: „movement fix" — przy rozjeździe kamera vs serwer trzeba
  korygować inputy ruchu. Nasz scaffold trzyma yaw gracza (steruje) — OK z natury.
- `test.grim.ac` — publiczny serwer z bufferless alerts (do podglądania, NIE do
  testów na nim).
- NoSlow Grim: próg 0.001, 2 ticki z rzędu do flagi; 1.8 nie slowowany w 1. ticku
  użycia. Brak modułu NoSlow u nas — pomijamy.

## 7. Taksonomia obejść (typy + manipulacja pakietami)

### Typ 1. Vanilla-mimic (dowód: dev Grim, issue #2720)
„We don't have scaffold checks. As long as you follow vanilla rules any scaffold
is possible." Pakiety identyczne z vanilla = brak haka dla checków.
Zastosowanie: scaffold/MLG na inputach (USE + prawdziwa kamera).

### Typ 2. Replacement, nie injection (pakiety)
Podmiana rotacji w locie vanilli (mixin) zamiast drugiego pakietu.
Bilans flyingów zostaje 20/s: Timer ślepy, Post widzi vanilla-kolejność.

### Typ 3. Budget + decay (matematyka kar)
Każdy check ma próg setback + decay VL. Działanie paczkami + pauzy na decay =
wieczne operowanie pod progiem. Dotyczy Timer (bank 120ms), Post (tło), Reach
(cancelBuffer opada 0.25/hit — po missie 4 ostrożne hity zamiast spamu).

### Typ 4. Latency-anchoring (NIE ping-spoof)
Grim wiąże tolerancję z pingiem (drift 120ms, kompensowane światy, retransmisje).
Fałszywy ping = wykryty (ping limiter ~1k, TransactionOrder wymaga FIFO,
max-transaction-time 60s kopie). Zamiast tego: projektowanie pod WYSOKI ping
(np. akcje ważne tylko gdy stabilne okno), bo Grim jest łagodniejszy dla lagujących
z natury (potwierdzone przez MWHuntera: high-ping timer tolerated by design).

### Typ 5. State-window riding (okna wyłączeń)
- Teleport (perła/chorus): 1-tickowe exempty w aim-checkach — akcja dokładnie
  w oknie po teleportacji. UWAGA: BadPacketsN wymaga akceptacji teleportów,
  TransactionOrder wymaga FIFO odpowiedzi — kolejność święta.
- Bezruch: Post spłukuje tylko przy `isTickingReliablyFor(3)` — serie akcji
  w mikropauzach ruchu.
- Pojazd: pełne skipy Rotation/Far/PositionPlace i Reach (nisza).
- 1.8 klient na ViaVersion: +0.1 hitbox, sanctioned.

### Typ 6. Humanizacja timingów (dowód: Wurst ±100ms bije analizy)
Randomizacja CPS/delay (mamy jitter aury) + profile rytmu z nagrań legit gracza.
Nigdy stałe interwały (20.0 CPS, 120ms place co do ms) — stałość to sygnatura.

### Typ 7. Server-confirmed mechanics (dowód: LiquidBounce GrimCollide)
Jazda na mechanikach które Grim symuluje 1:1 (kolizje, odrzut, woda, pajęczyny):
cobweb/MLG/woda = Grim-proof z definicji, bo symulacja zgadza się z serwerem.

### Typ 8. Desync hygiene (nie check, tylko kaskady)
BadPacketsA kasuje duplikat slotu → desync → Post/Simulation/ghosty.
Zasada: po KAŻDYM odrzuceniu (resync z serwera) pauza modułu ~10 ticków i resync
stanu (slot, pozycja). Nie walczyć z serwerem — on zawsze wygrywa.

### Czego NIE robić (pole minowe ze źródeł)
- Ping-spoof/delay transaction (limiter, FIFO, kick 60s).
- Reorder pakietów (TransactionOrder, PacketOrder* na strict).
- Stałe timingi i kwantowane kąty (DuplicateRotPlace, AimDuplicate).
- Ataki > 3.0 (cancelBuffer ×4).
- Place > 4.5 i place po ghostach (Far/AirLiquidPlace).
- Ignorowanie teleportów serwera (BadPacketsN).
