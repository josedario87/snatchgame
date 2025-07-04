// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.42
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { TokenInventory } from './TokenInventory'

export class TradeOffer extends Schema {
    @type("string") public id!: string;
    @type("string") public offererId!: string;
    @type("string") public targetId!: string;
    @type(TokenInventory) public offering: TokenInventory = new TokenInventory();
    @type(TokenInventory) public requesting: TokenInventory = new TokenInventory();
    @type("string") public status!: string;
}
