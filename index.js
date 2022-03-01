/**
 * {
    allowUsingActions: false, // Kendisindeki fonksiyonlara erişilip erişilemeyeceği. Varsayılan olarak true
 * }
 */

const WorkspaceJS = (function () {
  const createComponent = (function () {
    return function (componentName, component) {
      let cacheDatas = Object.assign({}, component.datas);
      let subscribes = {};

      component.datas = new Proxy(cacheDatas, {
        get(_target, _propname) {
          return _target?.[_propname] || '';
        },
        set(_target, _propname, _value) {
          let oldValue = _target[_propname];
          _target[_propname] = _value;
          subscribes[_propname]?.forEach(n => {
            n?.(oldValue, _value);
          });
        }
      });

      const instanceComponent = component?.();

      function addSubscribe(key, callback) {
        if (!(key in subscribes)) {
          // SUBSCRIBE IDLERİ PID ID GIBI ÖZEL GUID NUMARALARLA TUTABİLİRİZ
          subscribes[key] = [];
        }

        subscribes[key].push(callback);

        callback('', component.datas[key] || '', subscribes[key].length - 1);
      }


      customElements.define(componentName, class extends HTMLElement {
        constructor() {
          super();
          component.controls = new Proxy({}, {
            get: (target, prop, value) => {
              return this.querySelector(`[ws-control="${prop}"]`) || null;
            }
          });

          this.setAttribute('ws-x', '');

          // component.controlsArray = () => {
          //   return [...this.querySelectorAll('[ws-control]')].map(control => {
          //     return control.value;
          //   });
          // }

          // component.controlsJSON = () => {
          //   const returnValue = {};
          //   this.querySelectorAll('[ws-control]')?.forEach(control => {
          //     returnValue[control.getAttribute('ws-control')] = control.value;
          //   });
          //   return returnValue;
          // }
        }

        async getIfActionDefined(actionname) {
          return [true, instanceComponent?.actions[actionname]];
        }

        get allowUsingActions() {
          return instanceComponent?.configuration?.allowUsingActions ?? true;
        }

        async render() { }

        async connectedCallback() {
          instanceComponent?.init?.();
        }

        async disconnectedCallback() {
          instanceComponent?.dispose?.();
        }

      });

      createPropModel(componentName, addSubscribe);
    }
  })();

  const createPropModel = function (key, addSubscribe) {

    class PropModel extends HTMLElement {
      constructor() {
        super();
      }

      get name() {
        return this.getAttribute('name');
      }

      async connectedCallback() {
        this.render();
      }

      async render() {
        const propName = this.name;
        let textContainer = document.createTextNode('');
        this.replaceWith(textContainer);
        addSubscribe(propName, (oldValue, newValue, pidID) => {
          textContainer.textContent = newValue;
        });
      }
    }

    customElements.define(`${key}-prop`, PropModel);
  }

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
      this.removeAttribute('action');
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

  app.datas.username = 'Olur yaa';
  app.datas.whoIsIt = 'Lorem ipsum dolor sit amet';
});


createComponent('ws-header', function app() {

  app.datas.title = 'WS HEADER TITLE';

  function clickedMe(e) {
    e.preventDefault();
    app.datas.title = 'sehll';
  }

  function onChanged(e) {
    app.datas.title = e.target.value || '';
  }

  return {
    actions: {
      clickedMe,
      onChanged
    }
  }
});