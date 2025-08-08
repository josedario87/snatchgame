# SnatchGame – Diagramas Mermaid

Este índice reúne los diagramas claves para implementar el juego y verificar los flujos. Puedes abrir cada `.mmd` con la extensión oficial de Mermaid o verlos embebidos abajo.

## Visión general del ciclo

```mermaid
%% game-overview.mmd
flowchart TD
  A[Emparejar jugadores al azar] --> B[Asignar roles P1/P2]
  B --> C[Seleccionar variante G1..G5]
  C --> D[Iniciar partida de 3 rondas]
  D --> R1[Ronda 1] --> R2[Ronda 2] --> R3[Ronda 3]
  R3 --> E[Registrar SOLO resultado de R3]
  E --> F[Actualizar leaderboard/analytics]
  F --> G[Reemparejar y posible cambio de roles]
```

## Orquestación global (200 jugadores, G1->G5)

```mermaid
%% tournament-orchestration.mmd
flowchart TD
  Start[Init torneo] --> PhaseG1[Phase G1: iniciar]
  PhaseG1 --> MatchG1[Emparejar 200 jugadores al azar]
  MatchG1 --> RoomsG1[Crear rooms P1-P2 y asignar roles]
  RoomsG1 --> PlayG1[Jugar 3 rondas en paralelo]
  PlayG1 --> CommitG1[Commit solo resultado de ronda 3]
  CommitG1 --> WaitAllG1[Esperar que TODOS terminen]
  WaitAllG1 --> RematchG2[Reemparejar todos al azar]
  RematchG2 --> PhaseG2[Phase G2: iniciar]
  PhaseG2 --> MatchG2[Emparejar 200 jugadores al azar]
  MatchG2 --> RoomsG2[Crear rooms y roles]
  RoomsG2 --> PlayG2[Jugar 3 rondas en paralelo]
  PlayG2 --> CommitG2[Commit ronda 3]
  CommitG2 --> WaitAllG2[Esperar TODOS]
  WaitAllG2 --> RematchG3[Reemparejar]
  RematchG3 --> PhaseG3[Phase G3: iniciar]
  PhaseG3 --> MatchG3
  MatchG3 --> RoomsG3
  RoomsG3 --> PlayG3
  PlayG3 --> CommitG3
  CommitG3 --> WaitAllG3
  WaitAllG3 --> RematchG4
  RematchG4 --> PhaseG4[Phase G4: iniciar]
  PhaseG4 --> MatchG4
  MatchG4 --> RoomsG4
  RoomsG4 --> PlayG4
  PlayG4 --> CommitG4
  CommitG4 --> WaitAllG4
  WaitAllG4 --> RematchG5
  RematchG5 --> PhaseG5[Phase G5: iniciar]
  PhaseG5 --> MatchG5
  MatchG5 --> RoomsG5
  RoomsG5 --> PlayG5
  PlayG5 --> CommitG5
  CommitG5 --> End[Fin del torneo]
```

## Máquina de estados (Room/Partida)

```mermaid
%% game-state-machine.mmd
stateDiagram-v2
  [*] --> Lobby
  Lobby --> Matching : join/ready
  Matching --> Setup : asignar roles + variante
  Setup --> PreChat : si G5 (cheap talk)
  Setup --> Round1 : si no G5
  PreChat --> Round1 : fin ventana chat (1 min)
  Round1 --> Round2 : resultado cerrado
  Round2 --> Round3 : resultado cerrado
  Round3 --> PostGame : resultado cerrado
  PostGame --> Commit : registrar solo R3
  Commit --> Rematch : liberar jugadores
  Rematch --> [*]

  note right of Round1
    Las decisiones pueden ser:
    - Secuenciales (G1,G2,G3,G4,G5)
    - Simultáneas (si en el futuro aplica)
  end note
```

## Secuencia por ronda (cliente-servidor)

```mermaid
%% game-sequence.mmd
sequenceDiagram
  participant P1 as Player 1
  participant P2 as Player 2
  participant S as Server/Room
  participant AJ as AutoJudge G4

  S->>P1: startRound(gameType, roundNo, role=P1)
  S->>P2: startRound(gameType, roundNo, role=P2)

  alt G2 (P2 decide forzar)
    P2->>S: decide(force or no_force)
    S-->>P1: forcedOffer = true/false
  else Otros juegos
    Note over P1,P2: Sin decision previa de P2
  end

  P1->>S: actionP1(offer or no_offer) - o forzado en G2
  S-->>P2: notifyP1Action(offer or no_offer)

  alt no_offer
    S-->>P1: outcome(10,10)
    S-->>P2: outcome(10,10)
  else offer
    P2->>S: actionP2(accept / reject / snatch)
    alt accept
      S-->>P1: outcome(15,15)
      S-->>P2: outcome(15,15)
    else reject
      S-->>P1: outcome(10,10)
      S-->>P2: outcome(10,10)
    else snatch
      opt G4 denuncia
        P1->>S: report: yes or no
        alt report=yes
          S->>AJ: aplicar sancion
          AJ-->>S: confiscar tokens P2
          S-->>P1: outcome(10,0)
          S-->>P2: outcome(10,0)
        else report=no
          S-->>P1: outcome(5,20)
          S-->>P2: outcome(5,20)
        end
      opt G3 repudio
        P1->>S: shameToken: assign yes or no
        S-->>P2: actualizar contador verguenza (proxima partida)
      end
    end
  end

  opt Round3 - persistir resultado R3
    S->>S: actualizar leaderboard y analytics
  end
  S-->>P1: endRound
  S-->>P2: endRound
```

## Variantes de juego

### G1 – Sin derechos de propiedad
```mermaid
%% g1-no-property.mmd
flowchart TD
  A1[P1: Ofrecer 5?] -->|No ofrecer| O1[10,10]
  A1 -->|Ofrecer| B1[P2: Aceptar / Rechazar / Robar]
  B1 -->|Aceptar| O2[15,15]
  B1 -->|Rechazar| O3[10,10]
  B1 -->|Robar| O4[5,20]
```

### G2 – Regla contraproductiva (P2 puede forzar)
```mermaid
%% g2-counterproductive-rule.mmd
flowchart TD
  A2[P2: Forzar?] -->|Sí| F2[P1: Oferta forzada]
  A2 -->|No| B2[P1: Ofrecer 5?]
  F2 --> C2[P2: Acción final]
  B2 -->|No ofrecer| O1[10,10]
  B2 -->|Ofrecer| C2[P2: Aceptar / Rechazar / Robar]
  C2 -->|Aceptar| O2[15,15]
  C2 -->|Rechazar| O3[10,10]
  C2 -->|Robar| O4[5,20]
```

### G3 – Token de repudio (vergüenza)
```mermaid
%% g3-shame-token.mmd
flowchart TD
  A3[P1: Ofrecer 5?] -->|No ofrecer| O1[10,10]
  A3 -->|Ofrecer| B3[P2: Aceptar / Rechazar / Robar]
  B3 -->|Aceptar| O2[15,15]
  B3 -->|Rechazar| O3[10,10]
  B3 -->|Robar| C3[P1: Asignar ficha de verguenza?]
  C3 -->|Sí| O4a[5,20 +1 verguenza proxima partida]
  C3 -->|No| O4b[5,20]
```

### G4 – Derechos mínimos de propiedad (juez)
```mermaid
%% g4-min-property-rights.mmd
flowchart TD
  A4[P1: Ofrecer 5?] -->|No ofrecer| O1[10,10]
  A4 -->|Ofrecer| B4[P2: Aceptar / Rechazar / Robar]
  B4 -->|Aceptar| O2[15,15]
  B4 -->|Rechazar| O3[10,10]
  B4 -->|Robar| C4[P1: ¿Denunciar?]
  C4 -->|No| O4[5,20]
  C4 -->|Sí| J4[Juez confisca tokens P2]
  J4 --> O5[10,0]
```

### G5 – Cheap talk (conversación previa)
```mermaid
%% g5-cheap-talk.mmd
flowchart TD
  Pre[Chat previo 1 min - no vinculante] --> A5[P1: Ofrecer 5?]
  A5 -->|No ofrecer| O1[10,10]
  A5 -->|Ofrecer| B5[P2: Aceptar / Rechazar / Robar]
  B5 -->|Aceptar| O2[15,15]
  B5 -->|Rechazar| O3[10,10]
  B5 -->|Robar| O4[5,20]
```

## Emparejamiento en masa (fase Gx)

```mermaid
%% matchmaking.mmd
sequenceDiagram
  participant OR as Orchestrator
  participant MM as Matchmaker
  participant P as PlayerPool
  participant R as RoomFactory

  OR->>MM: start phase (Gx) for ALL
  MM->>P: collect all available players (200)
  MM->>P: shuffle randomly
  loop pair players
    MM->>R: create room with pair (P1,P2) and roles
    R-->>MM: roomId
  end
  MM-->>OR: rooms created for all pairs
  OR->>R: broadcast startRound(1) to all rooms
```

## Modelo de datos (mínimo)

```mermaid
%% data-model.mmd
classDiagram
  class Player {
    +string id
    +string name
    +int    pavoTokens   // tokens tipo P1
    +int    eloteTokens  // tokens tipo P2
    +number shameTokens  // visible en próxima partida
  }
  note for Player "Scoring: como P1 => pavo*1 + elote*2; como P2 => elote*1 + pavo*2; total = suma"

  class GameSession {
    +string id
    +string gameType  // G1..G5
    +string player1Id
    +string player2Id
    +int    currentRound // 1..3
    +Round[] rounds      // length=3
    +Date   createdAt
  }

  class Round {
    +int index           // 1,2,3
    +string p1Action     // offer|no_offer|forced_offer
    +string p2Action     // accept|reject|snatch|null
    +boolean forcedByP2  // G2
    +boolean reported    // G4
    +boolean shameAssigned // G3
    +number outcomeP1
    +number outcomeP2
    +boolean isThird
  }

  class LeaderboardEntry {
    +string playerId
    +number scoreAsP1       // P1: pavo*1 + elote*2
    +number scoreAsP2       // P2: elote*1 + pavo*2
    +number aggregateScore  // scoreAsP1 + scoreAsP2
    +Date   updatedAt
  }

  Player "1" -- "0..*" GameSession : participa
  GameSession "1" o-- "3" Round : incluye
  Player "1" -- "0..*" LeaderboardEntry : puntuación
```

---

Notas:
- Solo el resultado de la R3 se agrega al leaderboard/analytics.
- G2 introduce `forcedByP2`; G3, `shameAssigned` y contador visible en la siguiente partida; G4, `reported` y sanción del juez.
- El servidor es autoritativo; clientes no mutan estado.
