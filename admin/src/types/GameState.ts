// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.42
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { Player } from './Player'
import { TradeOffer } from './TradeOffer'

export class GameState extends Schema {
    @type({ map: Player }) public players: MapSchema<Player> = new MapSchema<Player>();
    @type([ TradeOffer ]) public activeTradeOffers: ArraySchema<TradeOffer> = new ArraySchema<TradeOffer>();
    @type("number") public round!: number;
    @type("string") public gamePhase!: string;
    @type("boolean") public gameStarted!: boolean;
    @type("number") public minPlayers!: number;
    @type("number") public maxPlayers!: number;
}
