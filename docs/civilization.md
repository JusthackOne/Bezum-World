# Civilization

## Client map interaction

Players inspect the game board by clicking or tapping hexes and character tokens directly. Legal
actions remain hidden until the current user's character is selected. The map then uses separate
movement, attack, capture, and contribution colors for every enabled server-provided action target.
Clicking a target executes its sole interaction immediately; a structure interaction takes precedence
over movement when both refer to the same hex. Clicking a specifically targeted enemy character
executes that character's attack action. Selecting the current character again cancels action mode.
Clicking any non-action hex or empty map space also clears the player selection and every legal-action
highlight. Clicking an intact tower clears player movement mode first and highlights its active
protection area; clicking an adjacent destroyed enemy tower while movement mode is active captures
its hex. Selecting another object or the map background removes the tower highlight.
The client locks map interaction while a request is pending, clears all selection after success, and
keeps the original server state after failure. Dragging pans the map, while the mouse wheel or a pinch
gesture changes its zoom level.

The upper-left item palette exposes defensive-tower placement, the single-use Catapult, and the
single-use Repair Kit. Placement
buttons first open an item dialog with its purpose, cost, and relevant combat values. `Use` enters
the corresponding placement or targeting mode, while `Back` returns to the map. There is no second
team-resource confirmation dialog after a target is chosen. Tower placement mode highlights every enabled `BUILD_TOWER` coordinate returned by the
server. Selecting one shows a translucent preview with confirm and choose-another controls; no request
is sent until confirmation. The palette toggle, an invalid/background tap, Escape, or successful
construction exits placement mode. Catapult mode highlights attackable enemy towers when the current
player occupies the first hex immediately outside the protected area, plus an adjacent enemy Town
Hall when it has no defending player and is not protected by an active tower. The displayed gold and AP prices, disabled state,
and disabled reason all come from the latest server read model. The overlay resource block beside the zoom controls shows the
current participant team's projected gold and estimated score directly from the latest game state.
Neutral ground uses a gray base so team territory and action overlays remain distinct.

Defensive towers use destruction actions instead of hit points. A regular tower attack adds one
destruction action, while a Catapult adds its configured number of destruction actions to the same
counter. The tower becomes destroyed when the counter reaches its configured requirement. A Repair
Kit removes its configured number of destruction actions from an adjacent allied damaged tower.
After the first attack or capture contribution, a high-contrast
`current/required` badge is rendered beneath the affected tower or building so its progress remains
readable over the full-size structure artwork.

Every game has exactly one distinct spawn hex per team. All active participants are placed on their
own team's spawn atomically when the game activates, players added later join that spawn, and defeated
players return to it even when it is occupied. Allied players may stack on their team spawn; enemy
players cannot enter it and regular hexes permit only one active player. A lone avatar is rendered at
the exact hex center. The compact offset layout is used only for stacks, renders up to six selectable
avatars, and exposes additional players through a `+N` list.

The map is the only movement input surface. The client does not render separate hex/player selectors,
a selection details card, current/spawn coordinates in the player summary, or an event history
section. Server-side action events remain authoritative but are not fetched as a separate client feed.

Mountains, resource buildings, and towers use their configured Civilization artwork at the full hex
height while retaining a hit area limited to their own hex. Hovering a structure shows its available details on
desktop. On touch devices, tapping a structure pins that tooltip until another structure or the map
outside it is tapped. The popover is clamped to the map bounds, switches to a compact bottom placement
on narrow screens, wraps long values, and follows a pinned structure while the camera moves or zooms.
Tooltips intentionally omit owner, type, connectivity, and numeric protection radius. They retain the
name, status, capture/construction progress, production values, and tower HP.

Civilization is an asynchronous, server-authoritative strategy mode played by two administrator-configured teams on an axial hex map. Players may participate at different times; persisted database state is authoritative and the PixiJS client is only a renderer and input surface.

## Architecture

| Layer                                      | Responsibility                                                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/modules/civilization/domain`  | Settings validation, half-unit arithmetic, axial hex math, connectivity, settlement, scoring, and deterministic reward allocation |
| Civilization repositories                  | All Prisma access, transactional row locks, game-scoped advisory locks, and current-state queries                                 |
| Civilization services                      | Administration, player actions, lazy settlement, connectivity/rate recalculation, completion, rewards, and read models            |
| Civilization BullMQ processor              | Delayed activation, deadline completion, tower completion, startup recovery, and periodic reconciliation                          |
| `frontend/src/entities/civilization`       | Shared response types, stable asset keys, and display-only map types                                                              |
| `frontend/src/features/civilization`       | Current game, actions, game history, spectator mode, and React Query integration                                                  |
| `frontend/src/features/admin-civilization` | Draft configuration, validation, lifecycle controls, audit history, and the map editor                                            |
| Civilization Pixi components               | Incremental layered rendering, selection, pan/zoom, and editor input; no authoritative rules                                      |

All Civilization routes require a valid access token. Administrator routes additionally require the existing administrator guard. Historical states are read-only, and authenticated users who are not assigned to a current game are spectators.

## Attributes

The application has four canonical permanent attributes:

- `strength`
- `charisma`
- `endurance`
- `intelligence`

The legacy item field named `agility` is an endurance modifier; it is not a fifth account attribute or a separate Civilization resource. Civilization therefore has four attribute-building and team-pool keys. This preserves the existing item and battle behavior.

Attributes do not influence Civilization combat and cannot be spent during a match. They are accumulated for scoring and final distribution only.

## Database model

The Prisma schema stores normalized current state rather than reconstructing it from events:

- `CivilizationGame`: lifecycle, schedule, immutable settings snapshot, winner, and completion data.
- `CivilizationTeam`: the two sides, visual identity, town hall, and final score.
- `CivilizationGamePlayer`: team assignment, initial/spawn/current tiles, AP units, and join state; current display data comes from the related account.
- `CivilizationTile`: axial `q/r`, terrain, current owner, and productive-connectivity flag.
- `CivilizationSpawnPoint`: one team-owned activation, join, and respawn position per team.
- `CivilizationBuilding`: town halls and gold/attribute buildings, ownership, capture state, income, and progress in half units.
- `CivilizationTower`: construction/repair work kind, HP, construction/active/destroyed/cancelled state, timestamps, and protection radius.
- `CivilizationTeamResource`: precise team gold, current rate, and last settlement time.
- `CivilizationTeamAttributeResource`: precise per-attribute pool, rate, and settlement time.
- `CivilizationAction`: one authoritative result for each player/idempotency key.
- `CivilizationEvent`: append-only gameplay history with structured payloads.
- `CivilizationRewardDistribution`: idempotent per-player/resource payout and rounding record.
- `CivilizationRewardClaim`: per-player eligibility, reward preview, expiration, and exactly-once claim state.
- `CivilizationAdminAuditLog`: administrator lifecycle, assignment, and correction audit.
- `CivilizationGameSnapshot`: immutable started/final audit snapshots; history reads the frozen normalized state.

Resource columns use PostgreSQL `DECIMAL`; timestamps use `TIMESTAMPTZ(3)`. Coordinates are unique per game. Player assignment, team side, resources, team/tile spawn ownership, action idempotency, and reward claim rows have database uniqueness guarantees.

Scheduled and active date ranges use a half-open PostgreSQL range (`[startAt, endAt)`) under a GiST exclusion constraint. A partial unique index separately enforces at most one `ACTIVE` game. This means one game may start exactly when another ends, but two effective ranges cannot overlap even under concurrent administrator requests.

## Default settings

Settings are copied into `settingsJson` and validated with Zod whenever loaded. They become immutable when the game starts except through an explicit audited correction.

| Setting                        |                                         Default |
| ------------------------------ | ----------------------------------------------: |
| Maximum AP                     |                        8 AP / 16 internal units |
| Initial AP                     |                        8 AP / 16 internal units |
| Regeneration                   |                1 AP / 2 units every 180 minutes |
| Owned-tile move                |                                 0.5 AP / 1 unit |
| Neutral or empty-enemy move    |                                  1 AP / 2 units |
| Player attack                  |                                  2 AP / 4 units |
| Resource-building contribution |                                  1 AP / 2 units |
| Tower construction AP          |                                  1 AP / 2 units |
| Tower attack                   |                                  3 AP / 6 units |
| Town-hall contribution         |                                  1 AP / 2 units |
| Tower repair                   |                                  1 AP / 2 units |
| Ordinary connected tile income |                                     5 gold/hour |
| Gold building income           |                                    25 gold/hour |
| Attribute-building income      |        1 unit/hour for its configured attribute |
| Resource capture requirement   |                              3 points / 6 units |
| Attacker / defender chance     |                                       30% / 70% |
| Tower construction             |                 200 gold, 180 minutes, radius 1 |
| Repair Kit                     |  75 gold, repairs 1 tower/Town Hall damage unit |
| Catapult                       | 150 gold, 2 AP / 4 units, 2 destruction actions |
| Town-hall capture requirement  |                             8 points / 16 units |
| Score weights                  |                   gold × 1; each attribute × 25 |
| Winner bonus                   |                                               0 |

All AP and capture values are persisted as integer half units. Decimal strings are used at API/settings boundaries so persisted currency never passes through JavaScript floating-point arithmetic.

## Action points

AP regeneration is lazy. Before any action the server settles the acting player from `lastActionPointUpdateAt`, caps the result at the configured maximum, and retains only the unconsumed regeneration remainder while below the cap. No per-player jobs are created.

The server validates adjacency, AP cost, gold cost, ownership, team restrictions, occupancy,
protection, targets, capture state, and game lifecycle inside the same transaction that deducts AP.
Every available action includes its display target coordinate, but the client submits only the action's
target identifier or coordinate and never submits a derived cost or outcome.

A move can finish only on an empty regular ground hex, except that allied players may share their own
team spawn. Another team's spawn is never a valid movement destination. Building and active or
constructing tower hexes are never movement destinations. A destroyed enemy tower no longer blocks
its hex: entering that hex captures it for the normal neutral/enemy move cost and permanently removes
the destroyed tower. Other
capture, attack, repair, defense, or construction-contribution actions are performed from the
actor's valid adjacent/current position without moving the actor onto the structure.

## Income and connectivity

Connectivity is recalculated with server-side breadth-first search from each team's town-hall tile over same-team, non-mountain tiles. Visual ownership is retained for disconnected tiles, but disconnected territory:

- produces no ordinary-cell gold;
- disables gold and attribute buildings;
- disables tower protection;
- is excluded from productive-territory statistics.

Before ownership or connectivity changes, current team gold and attribute pools are settled using the previous rates. The new connected set and rates are then stored in the same transaction. Settlement is timestamp based:

```text
new amount = previous amount + elapsed milliseconds × rate per hour / 3,600,000
```

There are no hourly income jobs.

## Concurrency and idempotency

Gameplay mutations run in serializable PostgreSQL transactions. A game-scoped advisory lock serializes multi-record state transitions; mutable rows are additionally selected `FOR UPDATE` in a stable order. The standard order is game, players, tiles, buildings/towers, then team-resource rows. A serialization failure is returned to the caller without committing a partial action, and the action idempotency key makes an explicit retry safe.

Every mutation accepts an idempotency key. The action row is unique for the game, player, and key, records a request hash, and stores the original result. A retry with the same key and payload returns the stored result without spending AP or gold twice; reusing a key with a different payload is rejected.

Combat uses a cryptographically secure server roll. The integer roll, configured threshold, selected target, and result are appended to the event log. A clock and random source are injectable for deterministic tests.

## Towers and town halls

Tower centers must be farther apart than the sum of their protection radii. For two radius-1 towers
the minimum center distance is 3 hexes. Construction may target any adjacent empty, connected, owned
ground tile returned by the legal-action read model; the mutation repeats adjacency, ownership, connectivity, structure
occupancy, player occupancy, team-spawn exclusion, radius-overlap, AP, and team-gold validation in its transaction. Construction creates an
`UNDER_CONSTRUCTION` row and delayed completion job. Database time/status checks make completion
idempotent. Players cannot move onto its construction tile.

Only active, connected towers protect their radius. Each valid tower attack adds one destruction
action; reaching the configured requirement changes the tower to `DESTROYED`. The Repair Kit can be
used on an active damaged or destroyed allied tower only while the player is on an adjacent hex, the
tower tile remains owned and connected, no enemy occupies it, and the team can pay the configured AP
and gold. The item immediately removes its administrator-configured number of destruction actions.

The Catapult is an atomic purchase-and-use action against either an active enemy defensive tower or an
adjacent enemy Town Hall. The server recomputes axial distance and accepts a tower only when the
player is exactly on its configured protection-radius boundary. A Town Hall requires an adjacent
player position, no defender on the building, and no active connected tower protection. In one
serializable transaction the action validates game state, ownership, target type, feature enablement,
team gold, AP, and the idempotency key; then it deducts the configured costs and applies configured
damage. Against a Town Hall, each configured `catapult.damage` point adds two stored half-units, so
the applied damage matches the progress displayed to players, and completes the game when the
building's configured requirement is reached. The action row prevents the same Catapult request from
being consumed twice. A successful event carries source/target tiles and damage so every polling
client can play the short cannonball/impact animation; reduced-motion clients use an impact flash.
The Repair Kit uses the same target-selection pattern for adjacent allied damaged towers and Town
Halls. For a Town Hall it removes `repairKit.repairActions` player-visible hostile capture-progress
points. No direct Town Hall defense action is exposed; compatible calls to the legacy defense
endpoint consume the same Repair Kit AP, gold, and repair amount.

Town-hall progress is stored in half units. An attacker may contribute from the Town Hall hex or an
adjacent hex; an adjacent enemy Town Hall is therefore exposed as `CAPTURE_TOWN_HALL`, not `MOVE`.
Capture completes the game immediately; deadline completion uses weighted remaining resources and
permits a draw. Each configured Repair Kit repair point removes two stored Town Hall half-units, so
the configured amount matches the progress displayed to players. Repair Kit defense spends locked
team gold and AP before removing progress, never below zero.

## Completion and rewards

Completion first settles resources and freezes a final snapshot. Town-hall capture selects the capturing team. Deadline or forced completion uses configured weights. Cancellation is audited and does not accept further gameplay actions.

Each team's remaining gold and four attribute pools are divided among every assigned player, including inactive and post-start players. Completion creates pending distribution and claim rows but does not mutate account balances. The result popup shows winner, loser, final score, completion reason, and the current user's reward. A user must call `POST /api/civilization/games/:gameId/reward/claim`; the backend locks the game, rechecks eligibility and expiration, applies every pending distribution, and stamps the claim in one transaction. Repeated clicks, reloads, devices, and direct replay return the already-claimed result without another grant. If Town Hall capture ends the game, only the winning team is eligible and the losing team receives a specific no-reward reason.

Existing integer account columns require deterministic allocation: players are sorted by stable identifier, equal integer shares are assigned, and unavoidable remainder units go to the earliest stable players. The distribution row stores its rounding details and is unique for every game/team/player/resource. Closing the popup leaves a **View result** action available so an unclaimed reward can be reopened.

## Background processing

Civilization uses the existing Redis/BullMQ infrastructure. The Nest backend process runs both HTTP handlers and queue processors locally and in the current Docker setup. Jobs handle:

- scheduled-game activation;
- active-game deadline completion;
- tower construction completion;
- startup and minute-level reconciliation of overdue or missing schedules after backend/worker restarts or queue outages.

Jobs are hints; database status and timestamps remain authoritative. No AP, income, cell-capture, combat, tower, town-hall, or notification tick jobs exist.

## Asset manifest

Generated assets live in `frontend/public/assets/civilization/`. `CIVILIZATION_ASSETS` in `frontend/src/entities/civilization/model/civilization-assets.ts` maps stable keys to files and records which sprites may receive a team-color treatment. Building ownership is shown with code-rendered overlays/tints, so neutral and team-controlled states do not duplicate every source bitmap.

The set contains town hall, gold building, four attribute buildings, active/constructing/destroyed
towers, Catapult, Repair Kit, spawn point, mountain, and neutral resource marker. Files are 512×512
transparent WebP images optimized for map rendering.

All images were generated with the built-in image-generation tool using this shared production prompt:

```text
Use case: stylized-concept
Asset type: fantasy strategy game hex-map object sprite
Style/medium: polished hand-painted fantasy game UI sprite with subtle pixel-art crispness, matching a neon RPG inventory icon atlas; strong readable silhouette at 96 pixels
Composition/framing: one object centered, three-quarter isometric top-down view, square canvas, generous padding, entire object visible
Lighting/mood: dramatic cool rim light with warm highlights, consistent light from upper left
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local background removal
Constraints: original isolated opaque object; uniform removable background; crisp edges; no cast shadow, text, logo, watermark, characters, interface frame, or unrelated objects
```

Subject prompts were: fortified crystal town hall; royal mint/mine; strength forge; charisma pavilion; endurance bastion; intelligence observatory; crystal defensive tower; matched under-construction and destroyed tower edits; teleport spawn dais; jagged impassable mountain; and dormant neutral resource pedestal. Chroma was removed locally, images were resized with containment to 512×512, and all four corner alpha values were validated as transparent.

The item prompt additions were an ornate wooden Catapult with a violet crystal projectile and a
dark-leather Repair Kit with a silver hammer, gold fittings, reinforcement plates, and a violet
crystal vial. Both were generated with the built-in image tool, chroma-keyed locally, and saved as
512×512 transparent WebP assets.

After an `ATTACK_PLAYER` response, the attacking client displays a centered `YOU WON` or `YOU LOST`
game-style animation over the battlefield based on the server-authoritative `attackerWon` result.

## Player map controls

On desktop, left-button drag pans the map and the mouse wheel zooms around the pointer without scrolling the surrounding page. The map is fitted and centered on its world bounds when it first renders, while later container resizes preserve the current camera center. The on-map zoom controls change scale around the current camera center, and the locate control moves the camera to the current player.

Action responses update the authoritative React Query state immediately. Current-game, state, and event refreshes continue in the background and do not keep action controls in a pending state after the action request has settled.

## Administrator workflow

1. Open **Admin → Civilization** and create a draft.
2. Configure name, half-open schedule, two teams, colors/identifiers, and all balance settings.
3. Assign players to exactly one team.
4. Use the visual map editor to create playable axial cells within axial radius 25, paint ground/mountains/ownership, place one town hall and one distinct spawn per team, and configure resource-building ownership and income. Initial player placement is automatic.
5. Use undo/redo and preview, then run server validation.
6. Resolve every reported map/settings error and schedule the game. Database overlap protection is rechecked transactionally.
7. To add a player after activation, open the active game, choose a team, and submit the audited add-player operation. The player receives configured initial AP on that team's spawn.

The editor applies the selected tool directly through map clicks. The add/remove-hex tool paints continuously while the left mouse button is held; the first hex selects add or remove mode for the whole stroke, and one stroke is one undo step. Pointer conversion uses Pixi's logical screen size, so high-DPI displays select the hex under the cursor. Building relocation can be entered from the building context menu: valid destinations are highlighted, the source floats at reduced opacity, and hovering a valid target shows a translucent preview. Escape, secondary click, the visible cancel button, or clicking outside the editor cancels relocation. The server repeats complete map validation when the draft/scheduled configuration is saved. Right-clicking a building opens a compact delete menu and touch long-press opens the same menu; deletion still requires confirmation and no separate delete tool exists. On desktop, left-button drag pans with tools other than add/remove hex, and the mouse wheel zooms without scrolling the page. **Clear map** requires confirmation, removes all playable cells and placed objects, and records the change in editor history so it can be undone before leaving the form.

Administrator mutations take their PostgreSQL advisory lock through an execute-only raw query. The lock function returns PostgreSQL `void`, which must not be deserialized as a result column by Prisma. Unexpected HTTP exceptions are logged server-side with their error name, code, message, and stack while the API continues to return the standard safe 500 response.

Draft and scheduled configuration may be edited before start. Active games use the same complete editor for dates, teams, players, map, and balance settings. The server settles accrued resources first, preserves existing player/action/event records, relocates players whose team or current tile becomes invalid, recalculates connectivity and income, reschedules deadlines and tower jobs, and records the configuration change in the audit log. Completed and cancelled games remain immutable historical records. Cancellation and force completion require confirmation.

## Local development and migrations

Install dependencies with Bun in each package. The backend process also runs BullMQ workers; no separate worker command is required.

After changing the Prisma schema:

```powershell
Set-Location backend
bun run prisma:generate
bunx --bun prisma validate
```

When the local Docker backend is running, also run from the repository root:

```powershell
docker compose -f docker-compose.local.yml exec -T backend bun run prisma:generate
docker compose -f docker-compose.local.yml exec -T backend bunx --bun prisma migrate deploy
docker compose -f docker-compose.local.yml restart backend
Invoke-RestMethod http://localhost:3001/api/health
```

If frontend dependencies changed, rebuild the anonymous dependency volume:

```powershell
docker compose -f docker-compose.local.yml up -d --build --renew-anon-volumes frontend
```

## Verification

Backend:

```powershell
Set-Location backend
bun test
bun run lint
bun run build
```

Frontend:

```powershell
Set-Location frontend
bun run lint
bunx --bun tsc --noEmit
bun run build
```

The deterministic concurrency suite exercises serialization, advisory locks, idempotency, and queue-retry behavior without resetting a database. A future database-backed race suite still requires a dedicated test database and must never reset a non-test database. Browser verification should exercise the player/spectator/history flow and the administrator editor at desktop and mobile sizes, with console and failed-network inspection.
