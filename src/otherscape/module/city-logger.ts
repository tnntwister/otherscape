import { CitySettings } from "./settings.js";
import { CityActor } from "./city-actor.js";
import { CityItem } from "./city-item.js";
import { Logger } from "./tools/logger.js";

export class CityLogger extends Logger {

	static async logToChat(actor: CityActor, action: string, object: CityActor | CityItem | null = null, aftermsg : string | string[] = "") {
		if (action != undefined) {
			const object_part = object ? `${object.type} ${object.getDisplayedName()}` : "";
			const afterMsgString = Array.isArray(aftermsg) ? aftermsg.join(" ,") : aftermsg;
			const after_message = afterMsgString ? `(${afterMsgString})` : "";
			const message = await renderTemplate("systems/city-of-mist/templates/modification-log-post.hbs", {object_part, after_message, actor, action});
			try { return await this.gmMessage(message, actor);}
			catch (e) {console.error(e);}
		} else {
			console.warn(`Deprecated usage of modification Log: ${actor}`);
			try {return await this.gmMessage("Deprecated Use of Modification Log: ", actor);}
			catch (e) {console.error(e);}
		}
	}

	static async modificationLog(...args : Parameters<typeof CityLogger["logToChat"]>) {
		if (!CitySettings.get("loggedActions"))
			return;
		try { return await this.logToChat(...args); }
		catch (e) {
			console.error(e);
		}
	}

	static async rawHTMLLog(actor: CityActor, html: string, gmOnly=true) {
		if (gmOnly) {
			await this.gmMessage(html, actor);
		} else {
			const speaker = ChatMessage.getSpeaker({alias: actor.getDisplayedName()});
			await Logger.sendToChat(html, speaker);
		}
	}

}
