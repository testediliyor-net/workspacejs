/**
 * {
    allowUsingActions: false, // Kendisindeki fonksiyonlara erişilip erişilemeyeceği. Varsayılan olarak true
 * }
 */

/**
 * PROTOTYPES
 */

Object.prototype.isObject = function (obj) {
  return Object.prototype.toString.call(obj) == '[object Object]';
}

Element.prototype.attr = function (name) {
  if (!name) return '';

  if (arguments.length === 1)
    return this.getAttribute(name) || '';

  if (arguments.length === 2) this.setAttribute(name, arguments[1]);

  return this;
}

Element.prototype.hAttr = function (name) {
  return this.hasAttribute(name);
}

Element.prototype.rAttr = function (...names) {
  while (names?.length || false) {
    this.removeAttribute(names.shift());
  }
  return this;
}

Element.prototype.selector = function (selector) {
  return this.querySelector(selector);
}

Object.prototype.define = function (target, key, options) {
  this.defineProperty(target, key, options);
}

Object.prototype.defines = function (target, options) {
  this.defineProperties(target, options);
}

function onEvent(name, action, options = false) {
  this.addEventListener(name, action, options);
  return this;
}

function offEvent(name, action, options = false) {
  this.removeEventListener(name, action, options);
  return this;
}

Element.prototype.on = onEvent;
Element.prototype.off = offEvent;


/**
 * LIBRARY CREATOR
 */
const WorkspaceJS = (function () {

  const PREFIX_KEY = 'ws-';
  const GLOBALS = {};

  const createGUID = function () {
    return Math.floor((Math.random() * 100000000) * 0x10000).toString(16);
  }

  const defineGetProperty = function (target, name, value) {
    Object.define(target, name, { enumerable: false, value: value, writable: false });
  }

  const getValueByPath = function (path = []) {
    let currentValue;

    try {
      while (path?.length || false) {
        currentValue = (currentValue || GLOBALS)[path.shift()];
      }
    } catch (error) {
      currentValue = undefined;
    }

    return currentValue;
  }


  const getActionByPath = function (path = []) {
    let action = getValueByPath(path);
    action = typeof action === 'function' ? action : function (e) { e.preventDefault() };
    return action;
  }

  const dataTranslations = function (refSubscribersDataObject = {}) {

    function addProperty(targetDataPath, key, value, fullpath = []) {

      let dataOldValue = '';
      let dataNewValue = value ?? '';

      const SUBSCRIBED_ELEMENTS = []; // Subscribed elements
      const PROPERTY_ABSOLUTE_PATH = fullpath.join('.');
      function sendDataToSubscribers() {
        // console.log(refSubscribersDataObject, PROPERTY_ABSOLUTE_PATH);
        refSubscribersDataObject?.[PROPERTY_ABSOLUTE_PATH]?.forEach(subscriber => subscriber?.(dataOldValue, dataNewValue));
      }

      /** Trigger Once */
      sendDataToSubscribers();


      Object.define(targetDataPath, key, {
        enumerable: true,
        get: function () {
          return dataNewValue;
        },
        set: function (propertyValue) {
          /** If subscriber element */
          if (propertyValue?.tagName) {
            SUBSCRIBED_ELEMENTS.push(propertyValue);
            return;
          }

          /** If value is not subscriber and two data is equal*/
          if (dataOldValue == propertyValue) return false;

          /** Assign current data to variable old */
          dataOldValue = dataNewValue;

          /** _ = PROPERTY PATH. NOT USED PROPERTY */
          dataNewValue = parseData(propertyValue, fullpath);

          /** Send To */
          sendDataToSubscribers();
        }
      });

      if (targetDataPath.isEnumerable) return;
      if (Array.isArray(value) || Object.isObject(value)) {
        Object.define(targetDataPath, 'isEnumerable', {
          enumerable: false,
          configurable: false,
          writable: false,
          value: true
        });
      }
    }

    function parseData(propertyValue, currentPropertyPath = []) {

      /** Only for Array Data */
      if (Array.isArray(propertyValue) && !propertyValue?.isEnumerable) {

        const PARSED_ARRAY_ITEMS = [];

        for (let itemIndex = 0; itemIndex < propertyValue.length; itemIndex++) {
          /** Like .address.<0>. */
          const CURRENT_PATH = [...currentPropertyPath, itemIndex];

          /** Parse current data in item[x] */
          const PARSED_VALUE = parseData(propertyValue[itemIndex], CURRENT_PATH);

          /** Create changable property to data path */
          addProperty(PARSED_ARRAY_ITEMS, itemIndex, PARSED_VALUE, CURRENT_PATH);
        }

        return PARSED_ARRAY_ITEMS;

      }

      /** Only for Object Data */
      else if (Object.isObject(propertyValue) && !propertyValue?.isEnumerable) {

        const PARSED_OBJECT = {};

        Object.keys(propertyValue).forEach(propertyKey => {

          /** Like .address.0.<home_address>. */
          const CURRENT_PATH = [...currentPropertyPath, propertyKey];

          /** Parse current data in object[x] */
          const PARSED_VALUE = parseData(propertyValue[propertyKey], CURRENT_PATH);

          addProperty(PARSED_OBJECT, propertyKey, PARSED_VALUE, CURRENT_PATH);
        });

        return PARSED_OBJECT;
      }

      /** Else this data type is string, number or boolean */
      else {
        return propertyValue;
      };
    }

    return {
      parseData
    }
  }

  class WSFor extends HTMLElement {
    constructor() {
      super();
      let source = this.innerHTML;
      this.innerHTML = '';
      Object.define(this, 'source', { get: () => source });
    }

    render() {

    }
  }

  customElements.define(PREFIX_KEY + 'for', WSFor);

  let DATA_SUBSCRIBERS = {};

  const createComponent = (function () {
    return function (componentName, component) {

      /** Component Initializer */
      component?.();

      /**
       * Data Translations
       */
      const TRANSLATED_DATA = dataTranslations(DATA_SUBSCRIBERS);
      const COMPONENT_GLOBAL_KEY = '@' + componentName;

      /** _ = PROPERTY PATH. NOT USED PROPERTY */
      const PARSED_VALUE = TRANSLATED_DATA.parseData(
        {
          [COMPONENT_GLOBAL_KEY]: {
            datas: component.datas
          }
        });

      let componentDatas = GLOBALS[COMPONENT_GLOBAL_KEY] = {
        actions: { ...component?.actions },
        datas: PARSED_VALUE[COMPONENT_GLOBAL_KEY].datas,
      };

      Object.define(component, 'datas', {
        get: () => componentDatas.datas,
        set: (val) => {
          componentDatas.datas = Object.assign(componentDatas.datas, TRANSLATED_DATA.parseData({
            [COMPONENT_GLOBAL_KEY]: {
              datas: val
            }
          }, [COMPONENT_GLOBAL_KEY, 'datas']));
        }
      });


      customElements.define(PREFIX_KEY + componentName, class extends HTMLElement {
        constructor() {
          super();

          component.controls = new Proxy({}, {
            /** _ = NOT USED PROPERTY */
            get: (_target, prop, _value) => {
              return this.selector(`[${PREFIX_KEY}control="${prop}"]`) || null;
            }
          });

          this.attr(PREFIX_KEY + 'x', '');

        }

        async getIfActionDefined(actionname) {
          return [true, componentDatas?.actions?.[actionname]];
        }

        get allowUsingActions() {
          return component?.configuration?.allowUsingActions ?? true;
        }

        async render() { }

        async connectedCallback() {
          component?.init?.();
        }

        async disconnectedCallback() {
          component?.dispose?.();
        }

      });
    }
  })();

  /**
   * 
   * 
   * 
   * 
   * 
   * 
   */
  class WSText extends HTMLElement {
    constructor() {
      super();
      defineGetProperty(this, 'guid', createGUID());
      window.addEventListener('load', async () => this.render());
    }

    get name() {
      return this.attr('name');
    }

    async render() {
      const propName = this.name;
      if (!propName) return;

      const SUBSCRIBERS = DATA_SUBSCRIBERS[propName] || (DATA_SUBSCRIBERS[propName] = []);

      let textContainer = document.createTextNode('');
      this.replaceWith(textContainer);


      const update = function (oldValue, newValue) {
        textContainer.textContent = newValue;
      }

      SUBSCRIBERS.push(update);

      let spt = propName?.split('.');
      let propertyLabel = GLOBALS[spt.shift()] || false;

      try {

        while (spt.length || propertyLabel || false) {
          let key = spt.shift();
          if (spt.length == 0) {
            propertyLabel[key] = this;
            update('', propertyLabel[key]);
            break;
          }
          propertyLabel = propertyLabel[key];
        }

      } catch (error) {
        console.log('While error', error);
      }
    }

    async disconnectedCallback() {
      // removeSubscribe(this, this.name);
    }

  }

  customElements.define(PREFIX_KEY + 'text', WSText);


  /**
   * 
   * 
   * 
   * 
   * 
   * 
   * 
   * 
   * 
   */
  class WSAction extends HTMLElement {
    constructor() {

      super();

      let nativeElement = this.hAttr('target') && this.selector(this.attr('target'))
        || this.selector(PREFIX_KEY + 'target') || this;

      Object.defines(this, {
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
      if (!this.hAttr('action')) return;
      const actionContent = this.attr('action');

      /** Remove Attributes */
      this.rAttr('action', 'target');


      const [eventName, actionCallback] = actionContent.split(':');
      const actionPath = actionCallback?.split('.');
      const action = getActionByPath(actionPath);

      this.nativeElement.on(eventName, (e) => action(e));

    }
  }


  /**
   * 
   * 
   * 
   */
  class WSOnEvent extends WSAction { }

  customElements.define('ws-onevent', WSOnEvent);

  return {
    createComponent
  }
})();

/**
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

const { createComponent } = WorkspaceJS;

createComponent('main', function use() {

  use.datas = {
    title: 'hello',
    order: '123001.23.13101312.120123',
    address: [{
      name: 'Timer'
    }]
  };

  use.actions = {
    onChanged: function (e) {
      use.datas.address[0].name = e.target.value;
    }
  }
});
