/**
 * {
    allowUsingActions: false, // Kendisindeki fonksiyonlara erişilip erişilemeyeceği. Varsayılan olarak true
 * }
 */

const WorkspaceJS = (function () {
  const createComponent = (function () {
    return function (componentName, component) {
      const instanceComponent = component?.();
      const { init, dispose, actions, configuration } = instanceComponent;

      customElements.define(componentName, class extends HTMLElement {
        constructor() {
          super();
          component.controls = new Proxy({}, {
            get: (target, prop, value) => {
              return this.querySelector(`[ws-control="${prop}"]`) || null;
            }
          });

          component.controlsArray = () => {
            return [...this.querySelectorAll('[ws-control]')].map(control => {
              return control.value;
            });
          }

          component.controlsJSON = () => {
            const returnValue = {};
            this.querySelectorAll('[ws-control]')?.forEach(control => {
              returnValue[control.getAttribute('ws-control')] = control.value;
            });
            return returnValue;
          }
        }

        async getIfActionDefined(actionname) {
          return [true, actions[actionname]];
        }

        get allowUsingActions() {
          return configuration?.allowUsingActions ?? true;
        }

        async render() { }

        async connectedCallback() {
          init?.();
        }

        async disconnectedCallback() {
          dispose?.();
        }

      });
    }
  })();

  class WSAction extends HTMLElement {
    constructor(args = {
      selector: false
    }) {

      // Inherit Base Class
      super();

      // Variables
      let nativeElement = args.selector && this.querySelector(args.selector) || this;
      let name;

      // Prototypes
      Object.defineProperties(this, {
        'name': {
          get: () => args.actionName
        },
        'nativeElement': {
          get: () => nativeElement
        }
      });

      // Add to onLoad
      window.addEventListener('load', async () => this.render());
    }

    async render() {
      const actionAttr = this.getAttribute('action');
      if (!actionAttr) return;

      let parent = this;
      const [eventName, actionCallback] = actionAttr.split(':');
      while (true) {
        parent = parent.parentNode;

        if ([
          !parent, parent.allowUsingActions === false,
          parent?.tagName.toLowerCase() === 'body'
        ].some(v => v == true)) break;

        if (parent.getIfActionDefined) {
          const [isBase, currentAction] = await parent.getIfActionDefined(actionCallback);
          if (isBase && currentAction) {
            this.nativeElement.addEventListener(eventName, (e) => {
              currentAction(e);
            });
            break;
          }
        }
      }
    }
  }

  class WSOnEvent extends WSAction {
    constructor() {
      super({});
    }

    async connectedCallback() {
    }
  }

  class WSOnInput extends WSAction {
    constructor() {
      super({
        selector: 'input'
      });
    }
  }

  customElements.define('ws-onevent', WSOnEvent);
  customElements.define('ws-oninput', WSOnInput);

  return {
    createComponent
  }
})();


const { createComponent } = WorkspaceJS;

createComponent('ws-main', function app() {

  function showme(e) {
    e.preventDefault();
    console.log(app.controlsJSON());
  }

  return {
    actions: {
      showme
    }
  };
})