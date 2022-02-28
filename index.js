class VSV extends HTMLElement {
	connectedCallback() {
		const label = this.innerText;
		const text = document.createTextNode(label);
		this.replaceWith(text);
	}
}
customElements.define('ws-v', VSV);


const models_data = {};
const datas = {};
const models = function (model, datakey) {
	if (!(datakey in datas)) models_data[datakey] = [];
	models_data[datakey].push(model);
}

const createComponent = function (componentName, component) {
	const instanceComponent = component?.();
	const { init, dispose, actions } = instanceComponent;

	function render(target) {

		let actionArray = target.querySelectorAll('[action]');
		actionArray?.forEach(act => {
			console.log(act.setActions);
			act.setActions = actions;
		});

	}

	customElements.define(componentName, class extends HTMLElement {
		constructor() {
			super();
		}

		connectedCallback() {
			render(this);
			init?.();
		}

		disconnectedCallback() {
			dispose?.();
		}

	});
}

createComponent('ws-header', () => {

	function dispose() {
		console.log('Disposed')
	}

	function init() {
		console.log('init');
	}

	function onClicked() {
		console.log('Clicked');
	}

	return {
		dispose,
		init,
		actions: {
			onClicked
		}
	}
});


class WSAction extends HTMLElement {
	constructor() {
		super();

		let name;
		let action;
		let actions = {};
		let isLocked = false;

		Object.defineProperties(this, {
			'name': {
				set: (label) => name = label
			},
			'action': {
				set: (label) => {
					if (name && action) {
						this.removeEventListener(name, action);
					}

					const selectEvent = actions?.[label];
					if (name && (action = selectEvent)) {
						this.addEventListener(name, selectEvent, false);
					}
				}
			},
		});

		this.setActions = (values) => {
			console.log(values);
			if (isLocked) return;
			isLocked = true;
			actions = values;
		}
	}


	static get observedAttributes() { return ['action', 'name']; }

	attributeChangedCallback(name, oldValue, newValue) {
		if (name in this) {
			this[name] = newValue;
		}
	}

	connectedCallback() {

	}
}

class WSActionClick extends WSAction {
	constructor() {
		super();
		this.name = 'click';
	}
}

class WSActionMousedown extends WSAction {
	constructor() {
		super();
		this.name = 'mousedown';
	}
}

customElements.define('ws-action', WSAction, { extends: 'div' });
customElements.define('ws-click', WSActionClick, { extends: 'div' });
customElements.define('ws-mousedown', WSActionMousedown, { extends: 'div' });

// setTimeout(() => {
// 	let c = document.querySelector('ws-header');
// 	c.parentNode.removeChild(c);
// }, 3000);