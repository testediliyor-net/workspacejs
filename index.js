/**
 * {
    allowUsingActions: false, // Kendisindeki fonksiyonlara erişilip erişilemeyeceği. Varsayılan olarak true
 * }
 */

Object.prototype.isObject = function (obj) {
  return Object.prototype.toString.call(obj) == '[object Object]';
}

const WorkspaceJS = (function () {

  const createGUID = function () {
    return Math.floor((Math.random() * 100000000) * 0x10000).toString(16);
  }

  const defineGetProperty = function (target, name, value) {
    Object.defineProperty(target, name, { enumerable: false, value: value, writable: false });
  }

  function addProperty(cache, key, value) {
    let _elements = [];
    let _oldValue = '';
    let _newValue = value;

    Object.defineProperty(cache, key, {
      enumerable: true,
      get: function () {
        return _newValue;
      },
      set: function (val) {
        if (val?.tagName) {
          _elements.push(val);
          return;
        }

        if (_oldValue == val) return false;
        _oldValue = _newValue;
        _newValue = defineProperty(val);
        _elements?.forEach(el => el?.subscribeUpdate?.(_oldValue, _newValue));
      }
    });

    if (cache.isEnumerable) return;
    if (Array.isArray(value) || Object.isObject(value)) {
      Object.defineProperty(cache, 'isEnumerable', {
        enumerable: false,
        configurable: false,
        writable: false,
        value: true
      });
    }
  }

  function defineProperty(value) {
    if (Array.isArray(value) && !value?.isEnumerable) {
      let cacheArray = [];
      for (let i = 0; i < value.length; i++) {
        let v = defineProperty(value[i]);
        addProperty(cacheArray, i, v);
      }

      return cacheArray;
    } else if (Object.isObject(value) && !value?.isEnumerable) {
      const returnValue = {};
      Object.keys(value).forEach(n => {
        addProperty(returnValue, n, defineProperty(value[n]));
      });

      return returnValue;
    } else {
      return value;
    }

  }


  const createComponent = (function () {
    return function (componentName, component) {

      const instanceComponent = component?.();

      let cacheDatas = defineProperty(component.datas || {});

      Object.defineProperty(component, 'datas', {
        get: () => cacheDatas,
        set: (val) => {
          cacheDatas = Object.assign(cacheDatas, defineProperty(val));
          console.log(cacheDatas);
        }
      });


      customElements.define(componentName, class extends HTMLElement {
        constructor() {
          super();
          component.controls = new Proxy({}, {
            get: (target, prop, value) => {
              return this.querySelector(`[ws-control="${prop}"]`) || null;
            }
          });

          this.setAttribute('ws-x', '');

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

      createPropModel(componentName, cacheDatas);
    }
  })();

  const createPropModel = function (key, cacheDatas) {
    class PropModel extends HTMLElement {
      constructor() {
        super();
        defineGetProperty(this, 'guid', createGUID());
        // window.addEventListener('load', () => this.render());
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


        this.subscribeUpdate = function (oldValue, newValue) {
          textContainer.textContent = newValue;
        }

        let spt = propName.split('.');
        let propertyLabel = cacheDatas;

        while (spt.length || false) {
          let key = spt.shift();
          if (spt.length == 0) {
            propertyLabel[key] = this;
          }

          propertyLabel = propertyLabel[key];
          this.subscribeUpdate('', propertyLabel);
          if (propertyLabel == undefined) break;
        }



      }

      async disconnectedCallback() {
        // removeSubscribe(this, this.name);
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
  app.datas = {
    'title': 'hello',
    address: [{
      name: 'Timer'
    }]
  };

  function onChanged(e) {
    app.datas.address[0].name = e.target.value;
  }

  function clickedMe(e) {
    e.preventDefault();
    console.log(e);
    app.datas = {
      address: [{
        name: 'Deneme'
      }]
    }

    console.log(app.datas);
  }

  return {
    actions: {
      onChanged,
      clickedMe
    }
  }
});
