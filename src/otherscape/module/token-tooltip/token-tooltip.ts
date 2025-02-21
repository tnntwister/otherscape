import { CityHelpers } from "../city-helpers.js";
import { CityActor } from "../city-actor.js";
import {HTMLHandlers} from "../universal-html-handlers.js";
import {HTMLTools} from "../tools/HTMLTools.js";

const KEY = 'city-of-mist';
const CSS_PREFIX = `${KEY}--`;
const CSS_TOOLTIP = `${CSS_PREFIX}tooltip`;
const CSS_SHOW = `${CSS_PREFIX}show`;
const CSS_NAME = `${CSS_PREFIX}name`;

export class TokenTooltip {
	_tokenHover: boolean;
	_boxHover: boolean;
	element: HTMLDivElement;
	nameElement: HTMLElement;
	currentToken: null | Token<CityActor>;

	static init() {
		Hooks.once('ready', async () => {
			new TokenTooltip();
		});
	}

	constructor() {
		Hooks.on("canvasReady", () => {
			this._tokenHover = false;
			this._boxHover = false;
			this.updateVisibility();
		});
		this._tokenHover = false;
		this._boxHover = false;
		this.element = HTMLTools.div(CSS_TOOLTIP);
		this.nameElement = HTMLTools.div(CSS_NAME);
		this.element.appendChild(this.nameElement);
		$(this.nameElement).addClass("item-selection-context");
		this.currentToken = null;
		document.body.appendChild(this.element);
		Hooks.on('hoverToken', (token: Token<CityActor>, hovered: boolean) => {
			this.onHover(token, hovered);
			return true;
		});
		Hooks.on('deleteToken',(token: TokenDocument<CityActor>) => {
			if (token.id == this.currentToken?.id)
				this.hide();
			return true;
		});
	}

	async onHover(token: Token<CityActor>, hovered: boolean) {
		if (hovered) {
			try {
				if (!game.settings.get("city-of-mist", "tokenToolTip"))
					return true;
			} catch (e) {
				console.warn(e);
				return true;
			}
			setTimeout( async () => {
				if (! await this.updateData(token))
					return true;
				if (this._boxHover)
					return;
				this.currentToken = token;
				this._tokenHover = true;
				this.updatePosition(token);
				this.updateVisibility();
			}, 100);
		} else {
			const curr_token = this.currentToken;
			setTimeout( () => {
				if (this.currentToken != curr_token) return;
				this._tokenHover = false;
				this.updateVisibility();
			}, 500);
		}
		return true;
	}

	updateVisibility() {
		// console.log(`Updating Visibility ${this._tokenHover} ${this._boxHover}`);
		if (this._tokenHover || this._boxHover)
			this.show();
		else {
			this.currentToken = null;
			this.hide();
		}
	}

	onBoxHover() {
		// console.log("Box hover");
		if ($(this.element).hasClass(CSS_SHOW)) {
			this._boxHover = true;
			this.updateVisibility();
		}
	}

	onBoxUnHover() {
		// console.log("Box unhover");
		if ($(this.element).hasClass(CSS_SHOW)) {
			this._boxHover = false;
			this.updateVisibility();
		}
	}

	updatePosition(token: Token<CityActor>) {
		const top = Math.floor(token.worldTransform.ty - 8);
		const tokenWidth = token.w * canvas.stage.scale.x;
		const left = Math.ceil(token.worldTransform.tx + tokenWidth - 2);
		this.element.style.left = `${left}px`;
		this.element.style.top = `${top}px`;
	}

	show() {
		this.element.classList.add(CSS_SHOW);
	}

	hide() {
		this.element.classList.remove(CSS_SHOW);
	}

	async updateData(token: Token<CityActor>) {
		this.nameElement.style.display = '';
		const templateHTML = await renderTemplate("systems/city-of-mist/module/token-tooltip/tooltip.html", {token, actor: token.actor, sheetowner:null });
		this.nameElement.innerHTML = templateHTML;
		HTMLHandlers.applyBasicHandlers($(this.element));
		$(this.element).find(".toggle-combat").on("click", ev => CityHelpers.toggleCombat(ev))
		$(this.element).on( "mouseenter", this.onBoxHover.bind(this));
		$(this.element).on( "mouseleave", this.onBoxUnHover.bind(this));

		//TODO: refersh window on delete tag or status
		return true;
	}


} // end of class


