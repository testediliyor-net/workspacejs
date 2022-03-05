const data = {
    name: 'Kerem',
    address: [{
        name: 'Home',
        address: 'Lorem ipsum dolor sit amet'
    }],
    test: {
        school: 'Lorem ipsum'
    },
    email: 'keremix@mail.com',
    cityID: 10028
}

Object.prototype.isObject = function (obj) {
    return Object.prototype.toString.call(obj) == '[object Object]';
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
            if (_oldValue == val) return false;
            _oldValue = _newValue;
            _newValue = defineProperty(val);
            _elements?.forEach(el => el.subscribeUpdate(_oldValue, _newValue));
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

window.globals = defineProperty(data);
