declare global {
	interface HOOKS{
		"babele.ready":()=>void;
		"DB Ready": ()=>void;
	}
}


export class DBAccessor {
	 static comp_actors : Actor<any>[] = [];
	static comp_items : Item<any>[] = [];

	static async init() {
		Hooks.once("ready", async () => {
			//@ts-ignore
			if (typeof Babele !== "undefined") {
				Hooks.once("babele.ready", async () => {
					await this._loadPacks();
				});
			} else {
				await this._loadPacks();
			}
			this._loadPacks();
			this._initHooks();
			console.log("Database initialized");
			Hooks.callAll("DB Ready");
		});
	}

	static _initHooks() {
		Hooks.on("updateCompendium", this.onUpdateCompendium.bind(this));
		this.initHooks();
	}

	static initHooks() {
		//virtual
	}

	static filterItems<T extends Item<any>>(fn : (item: T) => boolean){
		return DBAccessor.allItems().filter(fn);
	}

	static filterActors<T extends Actor<any>>(fn: (actor:T) => boolean) {
		return DBAccessor.allActors().filter(fn);
	}

	static filterItemsByType<T extends Item<any>>(type: T["type"]) {
		return DBAccessor.filterItems( x=> x.type == type);
	}

	static filterActorsByType<T extends Actor<any>>(type : T["type"]) {
		return DBAccessor.filterActors( x=> x.type == type);
	}

	static allItems() {
		return DBAccessor.getAllByType ("Item");
	}

	static allActors() : Actor<any>[] {
		return DBAccessor.getAllByType ("Actor");
	}

	static getActor(id:string) {
		return this.getActorById(id);
	}

	// static getActorById (id:string) {
	// 	return this.findById(id, "Actor");
	// }

	// static getItemById (id:string) {
	// 	return this.findById(id, "Item");
	// }

	static findById<T extends "Actor" | "Item" = "Actor">(id:string, type: T): (T extends "Actor" ? Actor<any> : Item<any>) | null  {
		let retarr;
		switch (type) {
			case "Actor":
				retarr =  DBAccessor.filterActors( x => x.id == id);
				break;
			case "Item":
				retarr = DBAccessor.filterItems( x => x.id == id);
				break;
			default:
				throw new Error(`Unsupported Type ${type}`);
		}
		if (retarr.length == 0)
			return null;
		return retarr[0] as (T extends "Actor" ? Actor<any> : Item<any>);
	}

	static getAllByType<Type extends "Actor" | "Item">(type: Type):  (Type extends "Actor"? Actor<any> : Item<any>)[] {
		const base_items = DBAccessor.getBaseItemsByType(type);
		const compendium_items = DBAccessor.getCompendiumItemsByType(type);
		return base_items.concat(compendium_items) as (Type extends "Actor"? Actor<any> : Item<any>)[] ;
	}

	static getBaseItemsByType (type: "Actor" | "Item") {
		switch (type) {
			case "Actor": return Array.from(game.actors);
			case "Item": return Array.from(game.items);
			default: throw new Error(`Unsupported Type ${type}`);
		}
	}

	static getCompendiumItemsByType(type: "Actor" | "Item") {
		switch (type) {
			case "Actor": return DBAccessor.comp_actors;
			case "Item": return DBAccessor.comp_items;
			default: throw new Error(`Unsupported Type ${type}`);
		}
	}

	static async _loadPacks() {
		DBAccessor.comp_items = await this.getCompendiumDataByType("Item") as Item<any>[];
		DBAccessor.comp_actors = await this.getCompendiumDataByType("Actor") as Actor<any>[];
		this.loadPacks();
	}

	static async loadPacks() {
		//virtual, designed to be extended
	}

	static getElementById(id:string, supertype : "Item" | "Actor" = "Item") {
		return this.getAllByType(supertype)
			.find(x => x.id == id);
	}

	static getItemById(id:string) {
		return this.getElementById(id, "Item");
	}

	static getActorById(id:string) {
		return this.getElementById(id, "Actor");
	}

	static async getCompendiumDataByType(type : "Item" | "Actor"): Promise<(Actor<any> | Item<any>)[]> {
		const pack_finder = ((e: FoundryCompendium<any>) => e.documentName == type);
		const packs = game.packs.filter(pack_finder);
		let compendium_content : FoundryDocument[]= [];
		for (const pack of packs) {
			const packContent = (await pack.getDocuments()) as FoundryDocument[];
			compendium_content = compendium_content.concat(packContent);
		}
		return compendium_content as unknown as (Actor<any> | Item<any>)[];
	}

	static async onUpdateCompendium(compendium: FoundryCompendium<any>) {
		console.debug("Updating Compendium");
		switch (compendium.documentName) {
			case "Actor": case "Item":
				await this.loadPacks();
			default: return;
		}
	}

	static namesort<T extends {name: string}>(a:T,b:T) {
		return a.name.localeCompare(b.name);
	}

	static findItem<T extends Item<any>> ({actor, itemId}: UniversalItemAccessor<T>): T | undefined {
		if (actor) {
			const foundActor = this.findActor(actor);
			if (!foundActor) {
				return undefined;
			}
			const item = foundActor.items.find( x=> x.id == itemId);
			if (!item) {
				return undefined;
			}
			return item as unknown as T;
		}
		return this.getItemById(itemId) as unknown as T;
	}

	static findToken<X extends UniversalTokenAccessor<any> | undefined>(acc: X) : X extends UniversalTokenAccessor<infer R> ? R | undefined : undefined  {
		if (!acc) return undefined as any;
			const {scene, tokenId} = acc;
		if (scene != null) {
			const sc = game.scenes.get(scene);
			if (!sc)  {
				throw new Error(`Scene Id ${scene} doesn't exist`);
			}
			const tok = sc.tokens.get(tokenId!);
			if (!tok) {
				throw new Error(`Token Id ${tokenId} doesn't exist`);
			}
			if (!tok.actor) {
				throw new Error(`No actor on Token Id ${tokenId}`);
			}
			return tok as any;
		}
		const sc = game.scenes.find(x=> x.tokens.get(tokenId) != null);
		if (!sc)
		throw new Error(`Couldn't find tokenId ${tokenId} on any scene`);
		const tok = sc.tokens.get(tokenId)!;
		if (!tok.actor) {
			throw new Error(`No actor on Token Id ${tokenId}`);
		}
		return tok as any;
	}

	static findActor<T extends Actor<any>>(accessor: UniversalActorAccessor<T>) : T | undefined {
		if (accessor.token != undefined) {
			const token =  this.findToken(accessor.token);
			return token?.actor as T | undefined;
		}
		return this.getActorById(accessor.actorId) as unknown as T;
	}

	static getUniversalItemAccessor<T extends Item<any>>(item: T) : UniversalItemAccessor<T> {
		return {
			actor: (item.parent) ? this.getUniversalActorAccessor(item.parent): undefined,
			itemId: item.id,
		}
	}

	static getUniversalActorAccessor<T extends Actor<any>> (actor: T) : UniversalActorAccessor<T> {
		if (actor.token && actor.token.object) {
			return {
				actorId: actor.id,
				token: this.getUniversalTokenAccessor(actor.token.object),
			};
		}
		for (const comb of game.combat?.combatants ?? [])
		if (comb.actor == actor && comb.token.actorLink) {
			return  {
				actorId: actor.id,
				token: this.getUniversalTokenAccessor(comb.token),
			};
		}
		return {
			actorId: actor.id,
			token: undefined
		}
	}

	static getUniversalTokenAccessor<T extends Token<any>>(tok: T) : UniversalTokenAccessor<T["document"]> ;
	static getUniversalTokenAccessor<T extends TokenDocument<any>>(tok: T) : UniversalTokenAccessor<T>;
	static getUniversalTokenAccessor(tok: Token<any> | TokenDocument<any>) : UniversalTokenAccessor<any> {
		if (tok instanceof Token) tok = tok.document;
		return {
			scene: tok.parent.id,
			tokenId: tok.id,
		};
	}

	static accessorEq<T extends UniversalTokenAccessor<any> | UniversalItemAccessor<any> | UniversalActorAccessor<any>> ( a: T, b: T) : boolean {
		if ("tokenId" in a && "tokenId" in b) {
			return a.tokenId == b.tokenId
		}
		if ("actorId" in a && "actorId" in b) {
			return a.actorId == b.actorId && a.token?.tokenId == a.token?.tokenId;
		}
		if ("itemId" in a && "itemId" in b) {
			return a.itemId == b.itemId && a.actor?.actorId == b.actor?.actorId && a.actor?.token?.tokenId == b.actor?.token?.tokenId;
		}
		return false;
	}

} //End of class


export type UniversalTokenAccessor<_T extends TokenDocument<any>> = {
	scene: string,
	tokenId : string,
};

export type UniversalActorAccessor<T extends Actor<any, any, any>> = {
	token ?: UniversalTokenAccessor<TokenDocument<T>>,
	actorId : string,
}

export type UniversalItemAccessor<I extends Item<any>> = {
	actor?: UniversalActorAccessor<Actor<any, I>>,
	itemId: string,
}


// Should inherit these to a subclass
// Hooks.once("ready", DBAccessor.init);

