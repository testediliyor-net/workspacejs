/**
 * {
    allowUsingActions: false, // Kendisindeki fonksiyonlara erişilip erişilemeyeceği. Varsayılan olarak true
 * }
 */

/**
 * PROTOTYPES
 */

//#region PROTOTYPES
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

//#endregion PROTOTYPE END


/**
 * LIBRARY CREATOR
 */
const WorkspaceJS = (function () {

  const PREFIX_KEY = 'ws-';
  const GLOBALS = {};
  const DATA_SUBSCRIBERS = {};
  const DATA_SCHEMAS = {};

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

  const getAnyDataFrom = function (target, name, defaultValue) {
    return target[name] || (target[name] = defaultValue);
  }

  const getDataSchemas = function (name, defaultValue) {
    return getAnyDataFrom(DATA_SCHEMAS, name, defaultValue);
  }

  const getDataSubscribers = function (name, defaultValue) {
    return getAnyDataFrom(DATA_SUBSCRIBERS, name, defaultValue);
  }

  const dataTranslations = function (refSubscribersDataObject = {}, refSchema = {}) {

    function addProperty(targetDataPath, key, value, fullpath = []) {

      let dataOldValue = '';
      let dataNewValue = value ?? '';

      const SUBSCRIBED_ELEMENTS = []; // Subscribed elements
      const PROPERTY_ABSOLUTE_PATH = fullpath.join('.');

      function sendDataToSubscribers() {
        // console.log(refSubscribersDataObject, PROPERTY_ABSOLUTE_PATH);
        refSubscribersDataObject?.[PROPERTY_ABSOLUTE_PATH]?.forEach(subscriber => subscriber?.(dataOldValue, dataNewValue));
        refSchema[PROPERTY_ABSOLUTE_PATH] = [dataOldValue, dataNewValue];
      }

      /** Trigger Once */
      sendDataToSubscribers();


      Object.define(targetDataPath, key, {
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

      let allowRendered = true;
      let source = this.innerHTML;
      this.innerHTML = '';

      const renderer = () => {
        const NAME = this.content;
        if (!NAME) return;

        const [FOR_LOOP_KEY, DATA_PROPERTY_KEY] = NAME.split(':');
        const LINKED_DATA_PATH = getDataSchemas(DATA_PROPERTY_KEY, false);

        if (!LINKED_DATA_PATH && allowRendered) {
          window.addEventListener('load', renderer, false);
          allowRendered = false;
          return;
        }

        


      }


      renderer();
    }

    get content() {
      return this.attr('content') || '';
    }
  }

  customElements.define(PREFIX_KEY + 'for', WSFor);


  const createComponent = (function () {
    return function (componentName, component) {

      /** Component Initializer */
      component?.();

      /**
       * Data Translations
       */
      const TRANSLATED_DATA = dataTranslations(DATA_SUBSCRIBERS, DATA_SCHEMAS);
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

      let allowRendered = true;

      /** GUID */
      defineGetProperty(this, 'guid', createGUID());

      /** Render HTML */
      const renderer = () => {
        const NAME = this.content;
        if (!NAME) return;

        const LINKED_DATA_PATH = getDataSchemas(NAME, false);

        /** 
         * Trigger the Renderer function if there is no data and the AllowRendered is true 
         * If there is no data then the page has not yet been loaded. 
         * That's why we define the onLoad property for the process to run when the page is loaded.
         * */
        if (!LINKED_DATA_PATH && allowRendered) {
          window.addEventListener('load', renderer, false);
          allowRendered = false;
          return;
        }

        /** Subscribe for changes */
        const SUBSCRIBERS = getDataSubscribers(NAME, []);

        /** Create the element which to change */
        let textNode = document.createTextNode('');
        this.replaceWith(textNode);

        const update = function (oldValue, newValue) {
          textNode.textContent = newValue;
        }

        SUBSCRIBERS.push(update);

        LINKED_DATA_PATH && update(...LINKED_DATA_PATH);
      }

      renderer();

    }

    get content() {
      return this.attr('content') || '';
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
    products: [
      'Products 1',
      'Products 2',
      'Products 3'
    ],
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
