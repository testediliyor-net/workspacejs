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
  const GLOBALS_ABSOLUTE_PATH = {};
  const DATA_TEMP_SCHEMAS = {};

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

  const getDataFromGlobals = function (name, defaultValue) {
    return name in GLOBALS_ABSOLUTE_PATH ? GLOBALS_ABSOLUTE_PATH[name] : defaultValue;
  }

  const setDataToGlobals = function (name, value) {
    name in GLOBALS_ABSOLUTE_PATH && (GLOBALS_ABSOLUTE_PATH[name] = value);
  }

  const setDataSubscribers = function (name, action) {
    if (!(name in DATA_SUBSCRIBERS)) {
      DATA_SUBSCRIBERS[name] = [action];
      return;
    }

    DATA_SUBSCRIBERS[name].push(action);
  }

  const getTempSchemas = function (name, defaultValue) {
    return name in DATA_TEMP_SCHEMAS ? DATA_TEMP_SCHEMAS[name] : defaultValue;
  }

  const setTempSchemas = function (name, value) {
    DATA_TEMP_SCHEMAS[name] = value;
  }

  const cleanTempSchemas = function (name) {
    delete DATA_TEMP_SCHEMAS[name];
  }

  const dataTranslations = function (refSubscribersDataObject = {}, refSchema = {}) {

    function addProperty(targetDataPath, key, value, fullpath = []) {

      let dataOldValue = '';
      let dataNewValue = value ?? '';

      const PROPERTY_ABSOLUTE_PATH = fullpath.join('.');

      function sendDataToSubscribers() {
        refSubscribersDataObject?.[PROPERTY_ABSOLUTE_PATH]?.forEach(subscriber => {
          subscriber(dataNewValue);
        });

        refSchema[PROPERTY_ABSOLUTE_PATH] = dataNewValue;
      }

      /** Trigger Once */
      sendDataToSubscribers();

      Object.define(targetDataPath, key, {
        enumerable: true,

        get: function () {
          return dataNewValue;
        },
        set: function (propertyValue) {

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


  const createComponent = (function () {
    return function (componentName, component) {

      /** Component Initializer */
      component?.();

      /**
       * Data Translations
       */
      const TRANSLATED_DATA = dataTranslations(DATA_SUBSCRIBERS, GLOBALS_ABSOLUTE_PATH);
      const COMPONENT_GLOBAL_KEY = '@' + componentName;
      /** _ = PROPERTY PATH. NOT USED PROPERTY */
      const PARSED_VALUE = TRANSLATED_DATA.parseData(
        {
          [COMPONENT_GLOBAL_KEY]: {
            datas: component.datas || []
          }
        });

      window.lo = DATA_SUBSCRIBERS;
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
          }));

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
   * 
   */


  class WSFor extends HTMLElement {
    constructor() {
      super();
      const NAME = this.content;
      let source = this.innerHTML;
      this.innerHTML = '';

      /** <ref_item_name>:@?<ref_data_path> */
      /**
       * Like for(let <ref_item_name> in <ref_data_path>)
       */
      const [REF_ITEM_NAME, REF_DATAS_PATH] = NAME.split(':');

      /** Get directly data from GLOBALS if first character is a '@' */
      const IS_GLOBAL_PATH = REF_DATAS_PATH[0] == '@';

      let current_path = '';
      let additional_path = '';

      const update = (value) => {
        this.innerHTML = '';

        value.forEach((n, i) => {
          setTempSchemas(REF_ITEM_NAME, `${current_path}.${i}`);
          this.insertAdjacentHTML('beforeend', source);
          //cleanTempSchemas(SUB_ITEM_KEY);
        });
      }

      /**
       * If it has a global path, get directly data from globals
       */
      if (IS_GLOBAL_PATH) {

        const DATAS = getDataFromGlobals(REF_DATAS_PATH, false);

        if (DATAS) {
          update(DATAS);
        }

        current_path = REF_DATAS_PATH;
        additional_path = '';
        setDataSubscribers(REF_DATAS_PATH, update);


      } else {
        /**
         * NOT ABSOLUTE PATH
         * <current_ref_item>:<parent_ref_name>.<additionals>
         * Like for(product in parentName.products)
         */

        const PARENT_DATAS = REF_DATAS_PATH.split('.'); // => [parentName, products]
        const PARENT_REF_NAME = PARENT_DATAS.shift(); // => parentName
        const REF_ABSOLUTE_PATH = getTempSchemas(PARENT_REF_NAME, []); // => @root.datas.products.0 or []


        current_path = REF_ABSOLUTE_PATH + '.' + PARENT_DATAS.join('.'); // @root.datas.products

        const DATA = getDataFromGlobals(current_path);

        setDataSubscribers(current_path, update);

        Array.isArray(DATA) && update(DATA);

      }


      // if (IS_ABSOLUTE_PATH) {
      //   setTempSchemas(SUB_ITEM_KEY, DATA_PROPERTY_KEY);
      // } else {
      //   setTempSchemas(SUB_ITEM_KEY, getTempSchemas(PARENT_NAME));
      // }

      // const DATA_PATH = getTempSchemas(SUB_ITEM_KEY);
      // const ADDITIONAL = IS_ABSOLUTE_PATH ? '' : '.' + PARENT_KEYS.join('.');



      // const DATA = getDataFromGlobals(DATA_PATH + ADDITIONAL);
      // DATA_PATH && setDataSubscribers(DATA_PATH, update);
      // !IS_ABSOLUTE_PATH && DATA && update(DATA);
      // let DATA = getDataFromGlobals(DATA_PATH, false);

      // const renderer = () => {
      //   const NAME = this.content;
      //   if (!NAME) return;

      //   const [SUB_ITEM_KEY, DATA_PROPERTY_KEY] = NAME.split(':');
      //   const LINKED_DATA = getDataFromGlobals(DATA_PROPERTY_KEY, false);

      //   if (!LINKED_DATA && allowRendered) {
      //     window.addEventListener('load', renderer, false);
      //     allowRendered = false;
      //     return;
      //   }

      //   if (Array.isArray(LINKED_DATA)) {
      //     LINKED_DATA.forEach((n, i) => {
      //       getTempSchemas(SUB_ITEM_KEY, `${NAME}.${i}.`);
      //       this.insertAdjacentHTML('beforeend', source);
      //       cleanTempSchemas(SUB_ITEM_KEY);
      //     });
      //   }

      // }


      // renderer();
    }

    get content() {
      return this.attr('content') || '';
    }
  }

  customElements.define(PREFIX_KEY + 'for', WSFor);


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

      // let allowRendered = true;
      /** GUID */
      defineGetProperty(this, 'guid', createGUID());

      const NAME = this.content;
      const IS_PARENT = NAME[0] == '@';
      const PARSED_NAME = NAME.split('.');

      let data = '';

      /** Create the element which to change */
      let textNode = document.createTextNode('');
      this.replaceWith(textNode);

      /** Subscribe for changes */
      const update = function (value) {
        textNode.textContent = value;
      }

      let label = NAME;

      if (IS_PARENT) {
        data = getDataFromGlobals(NAME, '');
      } else {
        const REF_NAME = PARSED_NAME.shift();
        const ADDITIONAL = PARSED_NAME.length ? '.' + PARSED_NAME.join('.') : '';
        label = getTempSchemas(REF_NAME, '') + ADDITIONAL;
        data = getDataFromGlobals(label, '');
      }

      setDataSubscribers(label, update);

      if (data) {
        data && update(data);
      }

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
      {
        name: 'Lorem 1', orderID: 12313913, ID: 'PRD2838', archives: [{
          title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit',
          numbers: [12, 3, 45, 5901, 4004, 1994]
        }]
      },
    ],
    address: [{
      name: 'adasdasd'
    }]
  };

  use.actions = {
    onChanged: function (e) {
      use.datas.products[0].archives[0].title = e.target.value;
    }
  }
});
