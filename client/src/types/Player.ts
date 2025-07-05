// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 3.0.42
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';
import { TokenInventory } from './TokenInventory'

export class Player extends Schema {
    @type("string") public id!: string;
    @type("string") public name!: string;
    @type("string") public producerRole!: string;
    @type(TokenInventory) public tokens: TokenInventory = new TokenInventory();
    @type("number") public points!: number;
    @type("number") public shameTokens!: number;
    @type("boolean") public isSuspended!: boolean;
    @type("string") public role!: string;
}
