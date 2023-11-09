let wasm;

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8Memory0 = null;

function getUint8Memory0() {
                if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
                    cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
                }
                return cachedUint8Memory0;
            }

function getStringFromWasm0(ptr, len) {
                ptr = ptr >>> 0;
                return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
            }

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

let heap_next = heap.length;

function addHeapObject(obj) {
                if (heap_next === heap.length) heap.push(heap.length + 1);
                const idx = heap_next;
                heap_next = heap[idx];
                
                heap[idx] = obj;
                return idx;
            }

function getObject(idx) { return heap[idx]; }

function isLikeNone(x) {
                return x === undefined || x === null;
            }

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
                if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
                    cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
                }
                return cachedFloat64Memory0;
            }

let cachedInt32Memory0 = null;

function getInt32Memory0() {
                if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
                    cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
                }
                return cachedInt32Memory0;
            }

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
                        ? function (arg, view) {
            return cachedTextEncoder.encodeInto(arg, view);
        }
                        : function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        });

function passStringToWasm0(arg, malloc, realloc) {
                
                if (realloc === undefined) {
                    const buf = cachedTextEncoder.encode(arg);
                    const ptr = malloc(buf.length, 1) >>> 0;
                    getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
                    WASM_VECTOR_LEN = buf.length;
                    return ptr;
                }

                let len = arg.length;
                let ptr = malloc(len, 1) >>> 0;

                const mem = getUint8Memory0();

                let offset = 0;

                for (; offset < len; offset++) {
                    const code = arg.charCodeAt(offset);
                    if (code > 0x7F) break;
                    mem[ptr + offset] = code;
                }
            
                if (offset !== len) {
                    if (offset !== 0) {
                        arg = arg.slice(offset);
                    }
                    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
                    const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
                    const ret = encodeString(arg, view);
                    
                    offset += ret.written;
                }

                WASM_VECTOR_LEN = offset;
                return ptr;
            }

function dropObject(idx) {
                if (idx < 132) return;
                heap[idx] = heap_next;
                heap_next = idx;
            }

function takeObject(idx) {
                const ret = getObject(idx);
                dropObject(idx);
                return ret;
            }

function debugString(val) {
                // primitive types
                const type = typeof val;
                if (type == 'number' || type == 'boolean' || val == null) {
                    return  `${val}`;
                }
                if (type == 'string') {
                    return `"${val}"`;
                }
                if (type == 'symbol') {
                    const description = val.description;
                    if (description == null) {
                        return 'Symbol';
                    } else {
                        return `Symbol(${description})`;
                    }
                }
                if (type == 'function') {
                    const name = val.name;
                    if (typeof name == 'string' && name.length > 0) {
                        return `Function(${name})`;
                    } else {
                        return 'Function';
                    }
                }
                // objects
                if (Array.isArray(val)) {
                    const length = val.length;
                    let debug = '[';
                    if (length > 0) {
                        debug += debugString(val[0]);
                    }
                    for(let i = 1; i < length; i++) {
                        debug += ', ' + debugString(val[i]);
                    }
                    debug += ']';
                    return debug;
                }
                // Test for built-in
                const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
                let className;
                if (builtInMatches.length > 1) {
                    className = builtInMatches[1];
                } else {
                    // Failed to match the standard '[object ClassName]'
                    return toString.call(val);
                }
                if (className == 'Object') {
                    // we're a user defined class or Object
                    // JSON.stringify avoids problems with cycles, and is generally much
                    // easier than looping through ownProperties of `val`.
                    try {
                        return 'Object(' + JSON.stringify(val) + ')';
                    } catch (_) {
                        return 'Object';
                    }
                }
                // errors
                if (val instanceof Error) {
                    return `${val.name}: ${val.message}\n${val.stack}`;
                }
                // TODO we could test for more things here, like `Set`s and `Map`s.
                return className;
            }

function makeMutClosure(arg0, arg1, dtor, f) {
                const state = { a: arg0, b: arg1, cnt: 1, dtor };
                const real = (...args) => {
                    // First up with a closure we increment the internal reference
                    // count. This ensures that the Rust closure environment won't
                    // be deallocated while we're invoking it.
                    state.cnt++;
                    const a = state.a;
                    state.a = 0;
                    try {
                        return f(a, state.b, ...args);
                    } finally {
                        if (--state.cnt === 0) {
                            wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
                            
                        } else {
                            state.a = a;
                        }
                    }
                };
                real.original = state;
                
                return real;
            }
function __wbg_adapter_42(arg0, arg1, arg2) {
wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h59a23441f1423134(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_45(arg0, arg1, arg2) {
wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h50123cecbfaba2d3(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_48(arg0, arg1) {
wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hadb824f852c31507(arg0, arg1);
}

function __wbg_adapter_51(arg0, arg1, arg2) {
wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h30423ba011ffbc6b(arg0, arg1, addHeapObject(arg2));
}

/**
*/
export function hydrate() {
wasm.hydrate();
}

function getCachedStringFromWasm0(ptr, len) {
                if (ptr === 0) {
                    return getObject(len);
                } else {
                    return getStringFromWasm0(ptr, len);
                }
            }

function handleError(f, args) {
                        try {
                            return f.apply(this, args);
                        } catch (e) {
                            wasm.__wbindgen_exn_store(addHeapObject(e));
                        }
                    }

async function __wbg_load(module, imports) {
                    if (typeof Response === 'function' && module instanceof Response) {
                        if (typeof WebAssembly.instantiateStreaming === 'function') {
                            try {
                                return await WebAssembly.instantiateStreaming(module, imports);

                            } catch (e) {
                                if (module.headers.get('Content-Type') != 'application/wasm') {
                                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                                } else {
                                    throw e;
                                }
                            }
                        }

                        const bytes = await module.arrayBuffer();
                        return await WebAssembly.instantiate(bytes, imports);

                    } else {
                        const instance = await WebAssembly.instantiate(module, imports);

                        if (instance instanceof WebAssembly.Instance) {
                            return { instance, module };

                        } else {
                            return instance;
                        }
                    }
                }

                function __wbg_get_imports() {
                    const imports = {};
                    imports.wbg = {};
imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
const ret = getStringFromWasm0(arg0, arg1);
return addHeapObject(ret);
};
imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
const ret = getObject(arg0);
return addHeapObject(ret);
};
imports.wbg.__wbg_error_f851667af71bcfc6 = function(arg0, arg1) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
if (arg0 !== 0) { wasm.__wbindgen_free(arg0, arg1, 1); }
console.error(v0);
};
imports.wbg.__wbg_new_abda76e883ba8a5f = function() {
const ret = new Error();
return addHeapObject(ret);
};
imports.wbg.__wbg_stack_658279fe44541cf6 = function(arg0, arg1) {
const ret = getObject(arg1).stack;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbindgen_is_undefined = function(arg0) {
const ret = getObject(arg0) === undefined;
return ret;
};
imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
const obj = getObject(arg1);
const ret = typeof(obj) === 'number' ? obj : undefined;
getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
};
imports.wbg.__wbindgen_boolean_get = function(arg0) {
const v = getObject(arg0);
const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
return ret;
};
imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
const obj = getObject(arg1);
const ret = typeof(obj) === 'string' ? obj : undefined;
var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
var len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
const ret = getObject(arg0) === getObject(arg1);
return ret;
};
imports.wbg.__wbindgen_is_null = function(arg0) {
const ret = getObject(arg0) === null;
return ret;
};
imports.wbg.__wbindgen_is_falsy = function(arg0) {
const ret = !getObject(arg0);
return ret;
};
imports.wbg.__wbindgen_cb_drop = function(arg0) {
const obj = takeObject(arg0).original;
if (obj.cnt-- == 1) {
obj.a = 0;
return true;
}
const ret = false;
return ret;
};
imports.wbg.__wbindgen_in = function(arg0, arg1) {
const ret = getObject(arg0) in getObject(arg1);
return ret;
};
imports.wbg.__wbindgen_is_object = function(arg0) {
const val = getObject(arg0);
const ret = typeof(val) === 'object' && val !== null;
return ret;
};
imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
const ret = new Error(getStringFromWasm0(arg0, arg1));
return addHeapObject(ret);
};
imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
const ret = getObject(arg0) == getObject(arg1);
return ret;
};
imports.wbg.__wbg_getwithrefkey_5e6d9547403deab8 = function(arg0, arg1) {
const ret = getObject(arg0)[getObject(arg1)];
return addHeapObject(ret);
};
imports.wbg.__wbg_instanceof_Window_9029196b662bc42a = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof Window;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_document_f7ace2b956f30a4f = function(arg0) {
const ret = getObject(arg0).document;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_location_56243dba507f472d = function(arg0) {
const ret = getObject(arg0).location;
return addHeapObject(ret);
};
imports.wbg.__wbg_history_3c2280e6b2a9316e = function() { return handleError(function (arg0) {
const ret = getObject(arg0).history;
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_scrollTo_3fa406312438ebdf = function(arg0, arg1, arg2) {
getObject(arg0).scrollTo(arg1, arg2);
};
imports.wbg.__wbg_requestAnimationFrame_d082200514b6674d = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
return ret;
}, arguments) };
imports.wbg.__wbg_fetch_336b6f0cb426b46e = function(arg0, arg1) {
const ret = getObject(arg0).fetch(getObject(arg1));
return addHeapObject(ret);
};
imports.wbg.__wbg_body_674aec4c1c0910cd = function(arg0) {
const ret = getObject(arg0).body;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_head_c810037a6c5e0066 = function(arg0) {
const ret = getObject(arg0).head;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_createComment_6b5ea2660a7c961a = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).createComment(v0);
return addHeapObject(ret);
};
imports.wbg.__wbg_createDocumentFragment_2570c0407199fba9 = function(arg0) {
const ret = getObject(arg0).createDocumentFragment();
return addHeapObject(ret);
};
imports.wbg.__wbg_createElement_4891554b28d3388b = function() { return handleError(function (arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).createElement(v0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_createTextNode_2fd22cd7e543f938 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).createTextNode(v0);
return addHeapObject(ret);
};
imports.wbg.__wbg_createTreeWalker_f8e54e77abe9d699 = function() { return handleError(function (arg0, arg1, arg2) {
const ret = getObject(arg0).createTreeWalker(getObject(arg1), arg2 >>> 0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_getElementById_cc0e0d931b0d9a28 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).getElementById(v0);
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_querySelector_52ded52c20e23921 = function() { return handleError(function (arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).querySelector(v0);
return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_querySelectorAll_c03e8664a5a0f0c5 = function() { return handleError(function (arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).querySelectorAll(v0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_namespaceURI_31718ed49b5343a3 = function(arg0, arg1) {
const ret = getObject(arg1).namespaceURI;
var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
var len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_setinnerHTML_b089587252408b67 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).innerHTML = v0;
};
imports.wbg.__wbg_outerHTML_f7749ceff37b5832 = function(arg0, arg1) {
const ret = getObject(arg1).outerHTML;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_getAttribute_3d8fcc9eaea35a17 = function(arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg2, arg3);
const ret = getObject(arg1).getAttribute(v0);
var ptr2 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
var len2 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len2;
getInt32Memory0()[arg0 / 4 + 0] = ptr2;
};
imports.wbg.__wbg_hasAttribute_a7d05690680041c9 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).hasAttribute(v0);
return ret;
};
imports.wbg.__wbg_removeAttribute_d8404da431968808 = function() { return handleError(function (arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).removeAttribute(v0);
}, arguments) };
imports.wbg.__wbg_scrollIntoView_53f9fa1bf8ecc14c = function(arg0) {
getObject(arg0).scrollIntoView();
};
imports.wbg.__wbg_setAttribute_e7e80b478b7b8b2f = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
var v1 = getCachedStringFromWasm0(arg3, arg4);
getObject(arg0).setAttribute(v0, v1);
}, arguments) };
imports.wbg.__wbg_before_208bff4b64d8f1f7 = function() { return handleError(function (arg0, arg1) {
getObject(arg0).before(getObject(arg1));
}, arguments) };
imports.wbg.__wbg_remove_48288e91662163dc = function(arg0) {
getObject(arg0).remove();
};
imports.wbg.__wbg_url_fda63503ced387ff = function(arg0, arg1) {
const ret = getObject(arg1).url;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_newwithstr_3d9bc779603a93c7 = function() { return handleError(function (arg0, arg1) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
const ret = new Request(v0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_newwithstrandinit_cad5cd6038c7ff5d = function() { return handleError(function (arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
const ret = new Request(v0, getObject(arg2));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_new_2a98b9c4a51bdc04 = function() { return handleError(function () {
const ret = new URLSearchParams();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_instanceof_WorkerGlobalScope_d9d741da0fb130ce = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof WorkerGlobalScope;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_fetch_8eaf01857a5bb21f = function(arg0, arg1) {
const ret = getObject(arg0).fetch(getObject(arg1));
return addHeapObject(ret);
};
imports.wbg.__wbg_append_4672bfcd9b84298e = function() { return handleError(function (arg0, arg1, arg2) {
getObject(arg0).append(getObject(arg1), getObject(arg2));
}, arguments) };
imports.wbg.__wbg_error_788ae33f81d3b84b = function(arg0) {
console.error(getObject(arg0));
};
imports.wbg.__wbg_warn_d60e832f9882c1b2 = function(arg0) {
console.warn(getObject(arg0));
};
imports.wbg.__wbg_origin_50aa482fa6784a0a = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg1).origin;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
}, arguments) };
imports.wbg.__wbg_pathname_c8fd5c498079312d = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg1).pathname;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
}, arguments) };
imports.wbg.__wbg_search_6c3c472e076ee010 = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg1).search;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
}, arguments) };
imports.wbg.__wbg_hash_a1a795b89dda8e3d = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg1).hash;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
}, arguments) };
imports.wbg.__wbg_nodeName_52cfd8a325f14a75 = function(arg0, arg1) {
const ret = getObject(arg1).nodeName;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_parentNode_9e53f8b17eb98c9d = function(arg0) {
const ret = getObject(arg0).parentNode;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_childNodes_64dab37cf9d252dd = function(arg0) {
const ret = getObject(arg0).childNodes;
return addHeapObject(ret);
};
imports.wbg.__wbg_previousSibling_7ddf39401682f643 = function(arg0) {
const ret = getObject(arg0).previousSibling;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_nextSibling_304d9aac7c2774ae = function(arg0) {
const ret = getObject(arg0).nextSibling;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_textContent_c5d9e21ee03c63d4 = function(arg0, arg1) {
const ret = getObject(arg1).textContent;
var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
var len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_settextContent_28d80502cf08bde7 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).textContent = v0;
};
imports.wbg.__wbg_appendChild_51339d4cde00ee22 = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg0).appendChild(getObject(arg1));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_cloneNode_1f7cce4ea8b708e2 = function() { return handleError(function (arg0) {
const ret = getObject(arg0).cloneNode();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_removeChild_973429f368206138 = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg0).removeChild(getObject(arg1));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_nextNode_49b7562f375c572d = function() { return handleError(function (arg0) {
const ret = getObject(arg0).nextNode();
return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_dataset_6b4e19567ec0651f = function(arg0) {
const ret = getObject(arg0).dataset;
return addHeapObject(ret);
};
imports.wbg.__wbg_addEventListener_5651108fc3ffeb6e = function() { return handleError(function (arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).addEventListener(v0, getObject(arg3));
}, arguments) };
imports.wbg.__wbg_addEventListener_a5963e26cd7b176b = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).addEventListener(v0, getObject(arg3), getObject(arg4));
}, arguments) };
imports.wbg.__wbg_removeEventListener_5de660c02ed784e4 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).removeEventListener(v0, getObject(arg3));
}, arguments) };
imports.wbg.__wbg_ctrlKey_0a805df688b5bf42 = function(arg0) {
const ret = getObject(arg0).ctrlKey;
return ret;
};
imports.wbg.__wbg_shiftKey_8a070ab6169b5fa4 = function(arg0) {
const ret = getObject(arg0).shiftKey;
return ret;
};
imports.wbg.__wbg_altKey_6fc1761a6b7a406e = function(arg0) {
const ret = getObject(arg0).altKey;
return ret;
};
imports.wbg.__wbg_metaKey_d89287be4389a3c1 = function(arg0) {
const ret = getObject(arg0).metaKey;
return ret;
};
imports.wbg.__wbg_button_7a095234b69de930 = function(arg0) {
const ret = getObject(arg0).button;
return ret;
};
imports.wbg.__wbg_instanceof_Response_fc4327dbfcdf5ced = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof Response;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_status_ac85a3142a84caa2 = function(arg0) {
const ret = getObject(arg0).status;
return ret;
};
imports.wbg.__wbg_statusText_1dd32f6c94d79ef0 = function(arg0, arg1) {
const ret = getObject(arg1).statusText;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_arrayBuffer_288fb3538806e85c = function() { return handleError(function (arg0) {
const ret = getObject(arg0).arrayBuffer();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_text_a667ac1770538491 = function() { return handleError(function (arg0) {
const ret = getObject(arg0).text();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_get_3c8b4af713d11e93 = function(arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg2, arg3);
const ret = getObject(arg1)[v0];
var ptr2 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
var len2 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len2;
getInt32Memory0()[arg0 / 4 + 0] = ptr2;
};
imports.wbg.__wbg_instanceof_HtmlAnchorElement_a293f072b6174b83 = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof HTMLAnchorElement;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_target_30dbd64e4d167ef8 = function(arg0, arg1) {
const ret = getObject(arg1).target;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_href_d4ca789f9d2389f6 = function(arg0, arg1) {
const ret = getObject(arg1).href;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_setdata_8eae47221c7bc167 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).data = v0;
};
imports.wbg.__wbg_before_ab39b727f5c3752a = function() { return handleError(function (arg0, arg1) {
getObject(arg0).before(getObject(arg1));
}, arguments) };
imports.wbg.__wbg_remove_179d3d8cd04e3f10 = function(arg0) {
getObject(arg0).remove();
};
imports.wbg.__wbg_pushState_1145414a47c0b629 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
var v0 = getCachedStringFromWasm0(arg2, arg3);
var v1 = getCachedStringFromWasm0(arg4, arg5);
getObject(arg0).pushState(getObject(arg1), v0, v1);
}, arguments) };
imports.wbg.__wbg_replaceState_2e530b05e604adc4 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5) {
var v0 = getCachedStringFromWasm0(arg2, arg3);
var v1 = getCachedStringFromWasm0(arg4, arg5);
getObject(arg0).replaceState(getObject(arg1), v0, v1);
}, arguments) };
imports.wbg.__wbg_length_7aeee1534dbcb390 = function(arg0) {
const ret = getObject(arg0).length;
return ret;
};
imports.wbg.__wbg_item_b62bdb2beca1393f = function(arg0, arg1) {
const ret = getObject(arg0).item(arg1 >>> 0);
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_origin_077fb2b471e27edc = function(arg0, arg1) {
const ret = getObject(arg1).origin;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_pathname_57290e07c6bc0683 = function(arg0, arg1) {
const ret = getObject(arg1).pathname;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_search_2ff3bb9114e0ca34 = function(arg0, arg1) {
const ret = getObject(arg1).search;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_setsearch_16b87f04ea0e6b80 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
getObject(arg0).search = v0;
};
imports.wbg.__wbg_searchParams_f64cb84025011613 = function(arg0) {
const ret = getObject(arg0).searchParams;
return addHeapObject(ret);
};
imports.wbg.__wbg_hash_2b57e787945b2db0 = function(arg0, arg1) {
const ret = getObject(arg1).hash;
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbg_new_a76f6bcb38f791ea = function() { return handleError(function (arg0, arg1) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
const ret = new URL(v0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_newwithbase_79b8cac27ce631ac = function() { return handleError(function (arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
var v1 = getCachedStringFromWasm0(arg2, arg3);
const ret = new URL(v0, v1);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_target_f171e89c61e2bccf = function(arg0) {
const ret = getObject(arg0).target;
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_defaultPrevented_1f845e37fc7c0e1d = function(arg0) {
const ret = getObject(arg0).defaultPrevented;
return ret;
};
imports.wbg.__wbg_cancelBubble_90d1c3aa2a76cbeb = function(arg0) {
const ret = getObject(arg0).cancelBubble;
return ret;
};
imports.wbg.__wbg_composedPath_cf1bb5b8bcff496f = function(arg0) {
const ret = getObject(arg0).composedPath();
return addHeapObject(ret);
};
imports.wbg.__wbg_preventDefault_24104f3f0a54546a = function(arg0) {
getObject(arg0).preventDefault();
};
imports.wbg.__wbg_new_1eead62f64ca15ce = function() { return handleError(function () {
const ret = new Headers();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_set_b34caba58723c454 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
var v1 = getCachedStringFromWasm0(arg3, arg4);
getObject(arg0).set(v0, v1);
}, arguments) };
imports.wbg.__wbg_instanceof_ShadowRoot_b64337370f59fe2d = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof ShadowRoot;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_host_e1c47c33975060d3 = function(arg0) {
const ret = getObject(arg0).host;
return addHeapObject(ret);
};
imports.wbg.__wbg_decodeURI_66e5ecae283e4c53 = function() { return handleError(function (arg0, arg1) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
const ret = decodeURI(v0);
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_get_44be0491f933a435 = function(arg0, arg1) {
const ret = getObject(arg0)[arg1 >>> 0];
return addHeapObject(ret);
};
imports.wbg.__wbg_isArray_4c24b343cb13cfb1 = function(arg0) {
const ret = Array.isArray(getObject(arg0));
return ret;
};
imports.wbg.__wbg_length_fff51ee6522a1a18 = function(arg0) {
const ret = getObject(arg0).length;
return ret;
};
imports.wbg.__wbg_instanceof_ArrayBuffer_39ac22089b74fddb = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof ArrayBuffer;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_instanceof_Error_ab19e20608ea43c7 = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof Error;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_message_48bacc5ea57d74ee = function(arg0) {
const ret = getObject(arg0).message;
return addHeapObject(ret);
};
imports.wbg.__wbg_name_8f734cbbd6194153 = function(arg0) {
const ret = getObject(arg0).name;
return addHeapObject(ret);
};
imports.wbg.__wbg_toString_1c056108b87ba68b = function(arg0) {
const ret = getObject(arg0).toString();
return addHeapObject(ret);
};
imports.wbg.__wbg_newnoargs_581967eacc0e2604 = function(arg0, arg1) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
const ret = new Function(v0);
return addHeapObject(ret);
};
imports.wbg.__wbg_call_cb65541d95d71282 = function() { return handleError(function (arg0, arg1) {
const ret = getObject(arg0).call(getObject(arg1));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_call_01734de55d61e11d = function() { return handleError(function (arg0, arg1, arg2) {
const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_next_ddb3312ca1c4e32a = function() { return handleError(function (arg0) {
const ret = getObject(arg0).next();
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_next_526fc47e980da008 = function(arg0) {
const ret = getObject(arg0).next;
return addHeapObject(ret);
};
imports.wbg.__wbg_done_5c1f01fb660d73b5 = function(arg0) {
const ret = getObject(arg0).done;
return ret;
};
imports.wbg.__wbg_value_1695675138684bd5 = function(arg0) {
const ret = getObject(arg0).value;
return addHeapObject(ret);
};
imports.wbg.__wbg_isSafeInteger_bb8e18dd21c97288 = function(arg0) {
const ret = Number.isSafeInteger(getObject(arg0));
return ret;
};
imports.wbg.__wbg_entries_e51f29c7bba0c054 = function(arg0) {
const ret = Object.entries(getObject(arg0));
return addHeapObject(ret);
};
imports.wbg.__wbg_is_205d914af04a8faa = function(arg0, arg1) {
const ret = Object.is(getObject(arg0), getObject(arg1));
return ret;
};
imports.wbg.__wbg_new_b51585de1b234aff = function() {
const ret = new Object();
return addHeapObject(ret);
};
imports.wbg.__wbg_toString_a8e343996af880e9 = function(arg0) {
const ret = getObject(arg0).toString();
return addHeapObject(ret);
};
imports.wbg.__wbg_exec_5158c9875d8d7e19 = function(arg0, arg1, arg2) {
var v0 = getCachedStringFromWasm0(arg1, arg2);
const ret = getObject(arg0).exec(v0);
return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_new_a88e559d4c2159a0 = function(arg0, arg1, arg2, arg3) {
var v0 = getCachedStringFromWasm0(arg0, arg1);
var v1 = getCachedStringFromWasm0(arg2, arg3);
const ret = new RegExp(v0, v1);
return addHeapObject(ret);
};
imports.wbg.__wbg_iterator_97f0c81209c6c35a = function() {
const ret = Symbol.iterator;
return addHeapObject(ret);
};
imports.wbg.__wbg_resolve_53698b95aaf7fcf8 = function(arg0) {
const ret = Promise.resolve(getObject(arg0));
return addHeapObject(ret);
};
imports.wbg.__wbg_then_f7e06ee3c11698eb = function(arg0, arg1) {
const ret = getObject(arg0).then(getObject(arg1));
return addHeapObject(ret);
};
imports.wbg.__wbg_then_b2267541e2a73865 = function(arg0, arg1, arg2) {
const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
return addHeapObject(ret);
};
imports.wbg.__wbg_globalThis_1d39714405582d3c = function() { return handleError(function () {
const ret = globalThis.globalThis;
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_self_1ff1d729e9aae938 = function() { return handleError(function () {
const ret = self.self;
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_window_5f4faef6c12b79ec = function() { return handleError(function () {
const ret = window.window;
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_global_651f05c6a0944d1c = function() { return handleError(function () {
const ret = global.global;
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_instanceof_Uint8Array_d8d9cb2b8e8ac1d4 = function(arg0) {
let result;
                    try {
                        result = getObject(arg0) instanceof Uint8Array;
                    } catch (_) {
                        result = false;
                    }
                    const ret = result;
return ret;
};
imports.wbg.__wbg_new_8125e318e6245eed = function(arg0) {
const ret = new Uint8Array(getObject(arg0));
return addHeapObject(ret);
};
imports.wbg.__wbg_newwithbyteoffsetandlength_6da8e527659b86aa = function(arg0, arg1, arg2) {
const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
return addHeapObject(ret);
};
imports.wbg.__wbg_buffer_f5b7059c439f330d = function(arg0) {
const ret = getObject(arg0).buffer;
return addHeapObject(ret);
};
imports.wbg.__wbg_length_72e2208bbc0efc61 = function(arg0) {
const ret = getObject(arg0).length;
return ret;
};
imports.wbg.__wbg_set_5cf90238115182c3 = function(arg0, arg1, arg2) {
getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};
imports.wbg.__wbindgen_is_function = function(arg0) {
const ret = typeof(getObject(arg0)) === 'function';
return ret;
};
imports.wbg.__wbindgen_is_string = function(arg0) {
const ret = typeof(getObject(arg0)) === 'string';
return ret;
};
imports.wbg.__wbg_buffer_085ec1f694018c4f = function(arg0) {
const ret = getObject(arg0).buffer;
return addHeapObject(ret);
};
imports.wbg.__wbg_get_97b561fb56f034b5 = function() { return handleError(function (arg0, arg1) {
const ret = Reflect.get(getObject(arg0), getObject(arg1));
return addHeapObject(ret);
}, arguments) };
imports.wbg.__wbg_set_092e06b0f9d71865 = function() { return handleError(function (arg0, arg1, arg2) {
const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
return ret;
}, arguments) };
imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
const ret = debugString(getObject(arg1));
const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
const len1 = WASM_VECTOR_LEN;
getInt32Memory0()[arg0 / 4 + 1] = len1;
getInt32Memory0()[arg0 / 4 + 0] = ptr1;
};
imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
takeObject(arg0);
};
imports.wbg.__wbindgen_throw = function(arg0, arg1) {
throw new Error(getStringFromWasm0(arg0, arg1));
};
imports.wbg.__wbindgen_memory = function() {
const ret = wasm.memory;
return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper353 = function(arg0, arg1, arg2) {
const ret = makeMutClosure(arg0, arg1, 67, __wbg_adapter_42);
return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper5148 = function(arg0, arg1, arg2) {
const ret = makeMutClosure(arg0, arg1, 456, __wbg_adapter_45);
return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper6637 = function(arg0, arg1, arg2) {
const ret = makeMutClosure(arg0, arg1, 545, __wbg_adapter_48);
return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper7285 = function(arg0, arg1, arg2) {
const ret = makeMutClosure(arg0, arg1, 591, __wbg_adapter_51);
return addHeapObject(ret);
};

                    return imports;
                }

                function __wbg_init_memory(imports, maybe_memory) {
                    
                }

                function __wbg_finalize_init(instance, module) {
                    wasm = instance.exports;
                    __wbg_init.__wbindgen_wasm_module = module;
                    cachedFloat64Memory0 = null;
cachedInt32Memory0 = null;
cachedUint8Memory0 = null;

                    
                    return wasm;
                }

                function initSync(module) {
                    if (wasm !== undefined) return wasm;

                    const imports = __wbg_get_imports();

                    __wbg_init_memory(imports);

                    if (!(module instanceof WebAssembly.Module)) {
                        module = new WebAssembly.Module(module);
                    }

                    const instance = new WebAssembly.Instance(module, imports);

                    return __wbg_finalize_init(instance, module);
                }

                async function __wbg_init(input) {
                    if (wasm !== undefined) return wasm;

                    
                    const imports = __wbg_get_imports();

                    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
                        input = fetch(input);
                    }

                    __wbg_init_memory(imports);

                    const { instance, module } = await __wbg_load(await input, imports);

                    return __wbg_finalize_init(instance, module);
                }
            
export { initSync }
export default __wbg_init;
