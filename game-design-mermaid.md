# SnatchGame – Diagramas Mermaid

Este índice reúne los diagramas claves para implementar el juego y verificar los flujos. Puedes abrir cada `.mmd` con la extensión oficial de Mermaid o verlos embebidos abajo.

## Visión general del ciclo

```mermaid
%% game-overview.mmd
flowchart TD
  A[Demo Play] --> B[Asignar roles P1/P2]
  B --> C{Jugadores pueden cambiar variante}
  C --> |G1| G1[Sin derechos de propiedad]
  C --> |G2| G2[Regla contraproductiva]
  C --> |G3| G3[Token de repudio]
  C --> |G4| G4[Derechos mínimos]
  C --> |G5| G5[Cheap talk]
  
  G1 --> D[P1: 10 pavos, P2: 10 elotes]
  G2 --> D
  G3 --> D
  G4 --> D
  G5 --> D
  
  D --> E[Iniciar ronda]
  E --> F{P1 ofrece?<br/>❗G2: Si P2 fuerza, DEBE ofrecer}
  F -->|Sí| G[P1 propone oferta variable]
  F -->|No| H[No ofrecer → siguiente ronda]
  
  G --> I{P2 decide}
  I -->|Aceptar| J[Intercambiar tokens]
  I -->|Rechazar| K[Sin cambios]
  I -->|Robar| L[P2 toma oferta sin pagar]
  
  J --> M[Auto-avance a siguiente ronda]
  K --> M
  L --> N{Variante especial?}
  N -->|G3| O[P1: ¿Asignar vergüenza?]
  N -->|G4| P[P1: ¿Denunciar?]
  N -->|Otros| M
  
  O --> M
  P --> Q[Sanción: P1 recibe pedido sin dar oferta]
  Q --> M
  
  M --> R{Ronda < 3?}
  R -->|Sí| E
  R -->|No| S[Fin del juego → Status: FINISHED]
  S --> T[Cambiar variante reinicia todo]
  
  %%{init: {'theme':'dark'}}%%
  style A fill:#1a1a2e,stroke:#fff,color:#fff
  style B fill:#16213e,stroke:#fff,color:#fff
  style C fill:#0f3460,stroke:#fff,color:#fff
  style D fill:#1e3a5f,stroke:#fff,color:#fff
  style E fill:#2d4059,stroke:#fff,color:#fff
  style F fill:#533e85,stroke:#fff,color:#fff
  style G fill:#2e7d32,stroke:#fff,color:#fff
  style G1 fill:#304ffe,stroke:#fff,color:#fff
  style G2 fill:#6a1b9a,stroke:#fff,color:#fff
  style G3 fill:#e65100,stroke:#fff,color:#fff
  style G4 fill:#b71c1c,stroke:#fff,color:#fff
  style G5 fill:#004d40,stroke:#fff,color:#fff
  style H fill:#424242,stroke:#fff,color:#fff
  style I fill:#1a237e,stroke:#fff,color:#fff
  style J fill:#2e7d32,stroke:#fff,color:#fff
  style K fill:#757575,stroke:#fff,color:#fff
  style L fill:#d32f2f,stroke:#fff,color:#fff
  style M fill:#37474f,stroke:#fff,color:#fff
  style N fill:#4527a0,stroke:#fff,color:#fff
  style O fill:#ff6f00,stroke:#fff,color:#fff
  style P fill:#c62828,stroke:#fff,color:#fff
  style Q fill:#b71c1c,stroke:#fff,color:#fff
  style R fill:#455a64,stroke:#fff,color:#fff
  style S fill:#212121,stroke:#fff,color:#fff
  style T fill:#263238,stroke:#fff,color:#fff
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
  [*] --> DemoPlay
  
  DemoPlay --> Waiting : quickPlay()
  Waiting --> Playing : 2 jugadores conectados
  
  state Playing {
    [*] --> VariantSelection
    VariantSelection --> RoundActive : seleccionar G1-G5
    
    state RoundActive {
      [*] --> OfferPhase
      
      state OfferPhase {
        [*] --> CheckForce
        CheckForce --> ForcedOffer : G2 && forcedByP2
        CheckForce --> OptionalOffer : !forcedByP2
        ForcedOffer --> ProposeOffer : debe ofrecer
        OptionalOffer --> ProposeOffer : ofrecer
        OptionalOffer --> NoOffer : no ofrecer
      }
      
      ProposeOffer --> P2Decision : offerActive=true
      NoOffer --> NextRound : auto-avance
      
      state P2Decision {
        [*] --> WaitingP2
        WaitingP2 --> Accept : p2Action
        WaitingP2 --> Reject : p2Action
        WaitingP2 --> Snatch : p2Action
      }
      
      Accept --> TokenExchange : intercambiar
      Reject --> NoChange : sin cambios
      Snatch --> CheckVariant : robar tokens
      
      TokenExchange --> NextRound : auto-avance
      NoChange --> NextRound : auto-avance
      
      state CheckVariant {
        [*] --> CheckG3G4
        CheckG3G4 --> ShameDecision : G3
        CheckG3G4 --> ReportDecision : G4
        CheckG3G4 --> NextRound : otros
      }
      
      ShameDecision --> NextRound : asignar/no asignar
      ReportDecision --> Sanction : denunciar
      ReportDecision --> NextRound : no denunciar
      Sanction --> NextRound : aplicar sanción inversa
    }
    
    NextRound --> RoundActive : round < 3
    NextRound --> Finished : round = 3
  }
  
  Finished --> VariantSelection : cambiar variante reinicia
  Playing --> Finished : 3 rondas completadas
  
  note right of VariantSelection
    Cualquier jugador puede
    cambiar variante en
    cualquier momento
  end note
  
  note right of P2Decision
    Una sola acción
    permitida por oferta
  end note
```

## Secuencia por ronda (cliente-servidor)

```mermaid
%% game-sequence.mmd
sequenceDiagram
  participant P1 as Player 1 (10 pavos)
  participant P2 as Player 2 (10 elotes)
  participant S as Server/Room
  participant UI as UI Components

  Note over P1,P2: Inicio de Demo Play
  S->>P1: Asignar rol P1, tokens iniciales
  S->>P2: Asignar rol P2, tokens iniciales
  
  Note over UI: Jugadores pueden cambiar variante en cualquier momento
  P1->>S: setVariant(G1-G5)
  S->>S: resetRound(), currentRound=1, status=PLAYING
  S-->>P1: broadcast variantChanged
  S-->>P2: broadcast variantChanged

  loop Cada Ronda (1-3)
    alt G2 - Regla contraproductiva
      Note over P2: Checkbox "Forzar oferta" (activo por defecto)
      P2->>S: p2Force(true/false)
      S-->>UI: forcedByP2 = true/false
      Note over P1: Si forzado, botón "No ofrecer" deshabilitado
    end

    alt G5 - Cheap talk
      Note over P1,P2: Chat no vinculante por 1 minuto
    end

    alt P1 decide ofrecer
      P1->>S: proposeOffer({offerPavo, offerElote, requestPavo, requestElote})
      S->>S: Validar tokens disponibles
      S-->>UI: offerActive = true, ocultar OfferControls
      S-->>P2: Mostrar oferta y botones de decisión
      
      P2->>S: p2Action(accept/reject/snatch)
      S->>S: Prevenir múltiples acciones (if p2Action exists, return)
      
      alt accept
        S->>S: Intercambiar tokens ambos lados
        S->>S: Auto-avanzar ronda
      else reject  
        S->>S: Sin cambios en tokens
        S->>S: Auto-avanzar ronda
      else snatch
        S->>S: P2 recibe oferta sin pagar
        
        alt G3 - Token de vergüenza
          S-->>UI: Mostrar botones vergüenza a P1
          P1->>S: assignShame(true/false)
          alt true
            S->>P2: shameTokens += 1
          end
          S->>S: Auto-avanzar ronda
        else G4 - Derechos mínimos
          S-->>UI: Mostrar botones denuncia a P1
          P1->>S: report(true/false)
          alt true
            S->>S: Revertir robo
            S->>S: P1 recibe pedido sin dar oferta (sanción inversa)
          end
          S->>S: Auto-avanzar ronda
        else Otros
          S->>S: Auto-avanzar ronda
        end
      end
    else P1 no ofrece
      P1->>S: noOffer()
      S->>S: p1Action = "no_offer"
      S->>S: Auto-avanzar ronda
    end
  end

  Note over S: Después de ronda 3
  S->>S: gameStatus = FINISHED
  Note over UI: Al cambiar variante, reinicia todo
```

## Variantes de juego

### G1 – Sin derechos de propiedad (oferta variable)
```mermaid
%% g1-no-property.mmd
flowchart TD
  Start[G1: Sin derechos de propiedad] --> Init[P1: 10 pavos<br/>P2: 10 elotes]
  Init --> A1{P1: Ofrecer tokens?}
  A1 -->|No ofrecer| O1[Sin cambios<br/>→ Siguiente ronda]
  A1 -->|Proponer oferta| B1[P1 especifica:<br/>- Ofrecer: X pavos, Y elotes<br/>- Pedir: A pavos, B elotes]
  B1 --> C1[UI: Ocultar OfferControls<br/>Mostrar oferta a ambos jugadores]
  C1 --> D1{P2: Una sola decisión}
  D1 -->|Aceptar| O2[Intercambiar tokens:<br/>P1 da oferta, recibe pedido<br/>P2 da pedido, recibe oferta<br/>→ Auto-avance]
  D1 -->|Rechazar| O3[Sin cambios en tokens<br/>→ Auto-avance]
  D1 -->|Robar| O4[P2 recibe oferta<br/>P1 pierde oferta<br/>Sin pago de P2<br/>→ Auto-avance]
  
  %%{init: {'theme':'dark'}}%%
  style Start fill:#1a237e,stroke:#fff,color:#fff
  style Init fill:#283593,stroke:#fff,color:#fff
  style A1 fill:#4527a0,stroke:#fff,color:#fff
  style B1 fill:#512da8,stroke:#fff,color:#fff
  style C1 fill:#37474f,stroke:#fff,color:#fff
  style D1 fill:#455a64,stroke:#fff,color:#fff
  style O1 fill:#424242,stroke:#fff,color:#fff
  style O2 fill:#2e7d32,stroke:#fff,color:#fff
  style O3 fill:#757575,stroke:#fff,color:#fff
  style O4 fill:#d32f2f,stroke:#fff,color:#fff
```

### G2 – Regla contraproductiva (P2 puede forzar) – oferta variable
```mermaid
%% g2-counterproductive-rule.mmd
flowchart TD
  Start[G2: Regla contraproductiva] --> Init[P1: 10 pavos<br/>P2: 10 elotes]
  Init --> A2[P2: Checkbox 'Forzar oferta'<br/>🔲 Activo por defecto]
  A2 -->|forcedByP2 = true| F2[P1 DEBE ofrecer<br/>Botón 'No ofrecer' deshabilitado]
  A2 -->|forcedByP2 = false| B2{P1: Ofrecer tokens?}
  
  F2 --> C2[P1 especifica oferta obligatoria:<br/>- Ofrecer: X pavos, Y elotes<br/>- Pedir: A pavos, B elotes]
  B2 -->|No ofrecer| O1[Sin cambios<br/>→ Siguiente ronda]
  B2 -->|Proponer oferta| C2
  
  C2 --> D2[UI: Ocultar OfferControls<br/>Mostrar detalles oferta]
  D2 --> E2{P2: Una sola decisión}
  
  E2 -->|Aceptar| O2[Intercambiar tokens<br/>→ Auto-avance]
  E2 -->|Rechazar| O3[Sin cambios<br/>→ Auto-avance]
  E2 -->|Robar| O4[P2 recibe oferta sin pagar<br/>→ Auto-avance]
  
  %%{init: {'theme':'dark'}}%%
  style Start fill:#6a1b9a,stroke:#fff,color:#fff
  style Init fill:#7b1fa2,stroke:#fff,color:#fff
  style A2 fill:#8e24aa,stroke:#fff,color:#fff
  style F2 fill:#ab47bc,stroke:#fff,color:#fff
  style B2 fill:#4527a0,stroke:#fff,color:#fff
  style C2 fill:#512da8,stroke:#fff,color:#fff
  style D2 fill:#37474f,stroke:#fff,color:#fff
  style E2 fill:#455a64,stroke:#fff,color:#fff
  style O1 fill:#424242,stroke:#fff,color:#fff
  style O2 fill:#2e7d32,stroke:#fff,color:#fff
  style O3 fill:#757575,stroke:#fff,color:#fff
  style O4 fill:#d32f2f,stroke:#fff,color:#fff
```

### G3 – Token de repudio (vergüenza) – oferta variable
```mermaid
%% g3-shame-token.mmd
flowchart TD
  Start[G3: Token de repudio/vergüenza] --> Init[P1: 10 pavos<br/>P2: 10 elotes]
  Init --> A3{P1: Ofrecer tokens?}
  A3 -->|No ofrecer| O1[Sin cambios<br/>→ Siguiente ronda]
  A3 -->|Proponer oferta| B3[P1 especifica:<br/>- Ofrecer: X pavos, Y elotes<br/>- Pedir: A pavos, B elotes]
  
  B3 --> C3[UI: Ocultar OfferControls<br/>Mostrar detalles oferta]
  C3 --> D3{P2: Una sola decisión}
  
  D3 -->|Aceptar| O2[Intercambiar tokens<br/>→ Auto-avance]
  D3 -->|Rechazar| O3[Sin cambios<br/>→ Auto-avance]
  D3 -->|Robar| E3[P2 recibe oferta sin pagar<br/>UI: Ocultar botones P2]
  
  E3 --> F3{P1: ¿Asignar vergüenza?}
  F3 -->|Asignar| O4a[P2.shameTokens += 1<br/>😶 Visible en UI<br/>→ Auto-avance]
  F3 -->|No asignar| O4b[Sin penalización<br/>→ Auto-avance]
  
  %%{init: {'theme':'dark'}}%%
  style Start fill:#e65100,stroke:#fff,color:#fff
  style Init fill:#ef6c00,stroke:#fff,color:#fff
  style A3 fill:#4527a0,stroke:#fff,color:#fff
  style B3 fill:#512da8,stroke:#fff,color:#fff
  style C3 fill:#37474f,stroke:#fff,color:#fff
  style D3 fill:#455a64,stroke:#fff,color:#fff
  style E3 fill:#bf360c,stroke:#fff,color:#fff
  style F3 fill:#ff6f00,stroke:#fff,color:#fff
  style O1 fill:#424242,stroke:#fff,color:#fff
  style O2 fill:#2e7d32,stroke:#fff,color:#fff
  style O3 fill:#757575,stroke:#fff,color:#fff
  style O4a fill:#ff3d00,stroke:#fff,color:#fff
  style O4b fill:#616161,stroke:#fff,color:#fff
```

### G4 – Derechos mínimos de propiedad (juez) – oferta variable
```mermaid
%% g4-min-property-rights.mmd
flowchart TD
  Start[G4: Derechos mínimos de propiedad] --> Init[P1: 10 pavos<br/>P2: 10 elotes]
  Init --> A4{P1: Ofrecer tokens?}
  A4 -->|No ofrecer| O1[Sin cambios<br/>→ Siguiente ronda]
  A4 -->|Proponer oferta| B4[P1 especifica:<br/>- Ofrecer: X pavos, Y elotes<br/>- Pedir: A pavos, B elotes]
  
  B4 --> C4[UI: Ocultar OfferControls<br/>Mostrar detalles oferta]
  C4 --> D4{P2: Una sola decisión}
  
  D4 -->|Aceptar| O2[Intercambiar tokens<br/>→ Auto-avance]
  D4 -->|Rechazar| O3[Sin cambios<br/>→ Auto-avance]
  D4 -->|Robar| E4[P2 recibe oferta sin pagar<br/>UI: Ocultar botones P2]
  
  E4 --> F4{P1: ¿Denunciar al juez?}
  F4 -->|No denunciar| O4[Robo exitoso<br/>→ Auto-avance]
  F4 -->|Denunciar| J4[⚖️ AutoJudge actúa]
  
  J4 --> S1[Paso 1 - Revertir robo:<br/>Devolver tokens ofrecidos a P1]
  S1 --> S2[Paso 2 - Sanción inversa:<br/>P1 recibe lo pedido sin dar nada<br/>P2 pierde lo pedido]
  S2 --> O5[Sanción aplicada<br/>→ Auto-avance]
  
  %%{init: {'theme':'dark'}}%%
  style Start fill:#b71c1c,stroke:#fff,color:#fff
  style Init fill:#c62828,stroke:#fff,color:#fff
  style A4 fill:#4527a0,stroke:#fff,color:#fff
  style B4 fill:#512da8,stroke:#fff,color:#fff
  style C4 fill:#37474f,stroke:#fff,color:#fff
  style D4 fill:#455a64,stroke:#fff,color:#fff
  style E4 fill:#d32f2f,stroke:#fff,color:#fff
  style F4 fill:#e53935,stroke:#fff,color:#fff
  style J4 fill:#1b5e20,stroke:#fff,color:#fff
  style S1 fill:#2e7d32,stroke:#fff,color:#fff
  style S2 fill:#388e3c,stroke:#fff,color:#fff
  style O1 fill:#424242,stroke:#fff,color:#fff
  style O2 fill:#2e7d32,stroke:#fff,color:#fff
  style O3 fill:#757575,stroke:#fff,color:#fff
  style O4 fill:#bf360c,stroke:#fff,color:#fff
  style O5 fill:#43a047,stroke:#fff,color:#fff
```

### G5 – Cheap talk (conversación previa) – oferta variable
```mermaid
%% g5-cheap-talk.mmd
flowchart TD
  Start[G5: Cheap Talk] --> Init[P1: 10 pavos<br/>P2: 10 elotes]
  Init --> Pre[💬 Chat no vinculante<br/>Ambos jugadores pueden escribir<br/>Sin compromisos]
  Pre --> A5{P1: Ofrecer tokens?}
  A5 -->|No ofrecer| O1[Sin cambios<br/>→ Siguiente ronda]
  A5 -->|Proponer oferta| B5[P1 especifica:<br/>- Ofrecer: X pavos, Y elotes<br/>- Pedir: A pavos, B elotes]
  
  B5 --> C5[UI: Ocultar OfferControls<br/>Mostrar detalles oferta]
  C5 --> D5{P2: Una sola decisión}
  
  D5 -->|Aceptar| O2[Intercambiar tokens<br/>→ Auto-avance]
  D5 -->|Rechazar| O3[Sin cambios<br/>→ Auto-avance]
  D5 -->|Robar| O4[P2 recibe oferta sin pagar<br/>→ Auto-avance]
  
  %%{init: {'theme':'dark'}}%%
  style Start fill:#004d40,stroke:#fff,color:#fff
  style Init fill:#00695c,stroke:#fff,color:#fff
  style Pre fill:#00796b,stroke:#fff,color:#fff
  style A5 fill:#4527a0,stroke:#fff,color:#fff
  style B5 fill:#512da8,stroke:#fff,color:#fff
  style C5 fill:#37474f,stroke:#fff,color:#fff
  style D5 fill:#455a64,stroke:#fff,color:#fff
  style O1 fill:#424242,stroke:#fff,color:#fff
  style O2 fill:#2e7d32,stroke:#fff,color:#fff
  style O3 fill:#757575,stroke:#fff,color:#fff
  style O4 fill:#d32f2f,stroke:#fff,color:#fff
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
