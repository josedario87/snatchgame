# Snatch or Share - Game Logic

## Game Overview
Snatch or Share is a multiplayer game that simulates governance evolution in decentralized exchanges, based on Elinor Ostrom's "Snatch Game".

## Game State Structure

### Main Game State
```typescript
GameState {
  round: number (1-5)
  groups: Group[] // Groups of 3 players
  currentPhase: 'waiting' | 'trading' | 'judging' | 'results'
}

Group {
  id: string
  players: Player[3]
  currentJudge?: Player // Only in Round 5
  activeTradeOffers: TradeOffer[] // Multiple simultaneous offers
}

Player {
  id: string
  name: string
  producerRole: 'turkey' | 'coffee' | 'corn'
  tokens: {
    turkey: number
    coffee: number
    corn: number
  }
  points: number // Calculated: own_tokens * 1 + other_tokens * 2
  shameTokens: number // For Round 4
  isSuspended: boolean // For Round 5
  role: 'trader' | 'judge' // Only relevant in Round 5
}

TradeOffer {
  id: string
  offererId: string
  targetId: string
  offering: { turkey: number, coffee: number, corn: number }
  requesting: { turkey: number, coffee: number, corn: number }
  status: 'pending' | 'accepted' | 'rejected' | 'snatched' | 'cancelled'
}
```

## Game Initialization

### Room Configuration
- **Exactly 3 players required** to start the game
- **Maximum 3 players** per room

### Producer Role Assignment
- Each player is randomly assigned **one unique producer role**:
  - **Turkey Producer**: Starts with 5 turkey tokens
  - **Coffee Producer**: Starts with 5 coffee tokens  
  - **Corn Producer**: Starts with 5 corn tokens
- **Roles cannot be repeated** - exactly one producer of each type per game

### Judge Role (Round 5)
- In Round 5, one player becomes **Judge** (rotates each round)
- **Judge role is decorative** - player keeps their original producer role
- Judge has additional responsibilities but maintains their trading capabilities

## Round Flow (Focus: Round 1)

### Round 1: State of Nature
- **No time limits** on turns
- **Simultaneous trading**: All players can make offers at the same time
- **Offer limit**: Each player can make maximum 2 offers to each opponent
- **Offer format**: "I give X tokens in exchange for Y tokens"
- **Offer responses**: Target player can Accept, Reject, or Snatch

### Trading Mechanics

#### Making Offers
- Players can offer and request **any amount** of tokens (even more than they have)
- Offers are made simultaneously to multiple players
- Format: `offering: {turkey: X, coffee: Y, corn: Z}` for `requesting: {turkey: A, coffee: B, corn: C}`
- **All trade offers are public** - visible to all players in the room, not just offerer and target

#### Resolving Offers
- **Accept**: Trade executed to the extent possible with available tokens
- **Reject**: Offer cancelled, no exchange
- **Snatch**: Receiver gets offered tokens (up to what offerer has) without giving anything in return
- **Cancel**: Offerer can cancel pending offers

#### Partial Fulfillment
- All trades execute with available tokens only
- Example: Offer "6 corn for 6 coffee" but only have 5 corn → Execute "5 corn for 5 coffee"
- Example: Accept offer for 8 tokens but only have 3 → Give 3 tokens, receive offered amount
- **No negative consequences** for partial fulfillment - it's part of the game

## Rules by Round

### Round 1-2: State of Nature / Anarchy
- No special rules
- All players are Traders
- No enforcement mechanisms

### Round 3: Counterproductive Rule
- **Mandatory Rule**: "All trade offers must be accepted"
- Players still have freedom to snatch
- Reduces agency, invites exploitation

### Round 4: Soft Norms (Shame Tokens)
- Each player can assign 1 shame token per round
- If player starts round with 2+ shame tokens:
  - Loses 2 tokens before round begins
  - Barred from offering trades (can only respond)

### Round 5: Governance Rules (Ostrom Adapted)
- **Group Roles**: Two Traders and One Judge
- **Judge Role**: Rotates each round
- **Applied Rules**:
  - **Position Rule**: Judge oversees fairness and conflict resolution
  - **Boundary Rule**: Only group members can trade; Judge may suspend rule-breaker for 1 round
  - **Choice Rule**: Trades are voluntary; Players can report snatching to Judge
  - **Enforcement Rule**: If Judge confirms snatch → goods returned + snatcher forfeits 3 tokens to victim
  - **Aggregation Rule**: Trade only completes with explicit mutual consent

## Key Mechanics

### Trading
- **Exchange Amount**: Always 5 tokens of player's own type
- **Value System**: own_tokens × 1 + other_tokens × 2
- **Snatch**: Take opponent's tokens without giving anything in return

### Point Calculation Examples
- Holding 10 of own = 10 points
- Holding 5 of own + 5 of other = 15 points  
- Holding 10 of own + 5 snatched = 20 points

### Governance Evolution
- **Round 1-2**: No trust → no cooperation → suboptimal outcomes
- **Round 4**: Social deterrents emerge
- **Round 5**: Governance stabilizes expectations → trust emerges → optimal outcomes through fair trades