export class VueZerk{
    constructor(options){
        this.__injectors = [];
        this.__provides = new Provides();
        this.__resolveName = options && options.name?options.name:Injector.inject;
     }

     /**
      * inject property name symbol
      */
     static get inject(){
        // return Symbol.for('inject');
        return "depend";
     }

     /**
      * injected event symbol
      */
     static get injected(){
        // return Symbol.for('injected');
        return "injected";
     }

    
    /**
     * injects a dependency
     * @param {any} type it is type or name of dependency  
     * @param {any} value value of dependency
     */
    inject(type,value){
        if(typeof type === "string"){
            this.__provides.add(type,value);
            return this;
        }
        if(type.prototype == null && typeof type ==="object")
           {
               for(let i in type)
                   this.__provides.add(i,type[i]);
             return this;
           }
       this.__injectors.push({value:type,instance:null}); // only instance
       return this;
    }

    anyInjector(value){
        return this.__injectors.some((elem)=>elem.value === value);
    }

    getInjectorOrCreate(type){
       if(type == null) throw this.__throwError('type argument null');
      if(this.__provides.any(type)) return this.__provides.get(type);
      let injector = this.__injectors.find((elem)=>elem.value === type);
      if(injector == null) throw this.__throwError('type could not found for injection');
      if(injector.instance != null) return injector.instance;
      if(injector.value.prototype != null) {// create instance
        let newInstance = new injector.value();
        injector.instance = this.resolve(newInstance);
        return injector.instance;
      }
      //there is only object
      injector.instance = this.resolve(injector.value);
      return injector.instance;
    }

    __throwError(message){
        throw new Error('injector :'+message);
    }

    /**
     * 
     * checks that property name is rezerved
     * @param {String} name, property name of inject type 
     */
    __isOwnerFunc(name){
        return [Injector.injected].some((elem)=>elem == name);
    }

    __callInjectedEvent(obj,applier){
        if(obj[this.__resolveName] != null && typeof obj[this.__resolveName][Injector.injected] === "function"){
            obj[this.__resolveName][Injector.injected].apply(obj);
        }
        if(typeof obj[Injector.injected] == "function")
        obj[Injector.injected].apply(applier);
    }

    __resolveByDefinedProperty(obj,applier){
        if(obj[this.__resolveName] == null) return obj;
        for(let prop in obj[this.__resolveName]){
            let value = obj[this.__resolveName][prop];
            if(this.__isOwnerFunc(prop)) continue;
            if(!this.anyInjector(value)) {
                if(!this.__provides.any(prop)) throw this.__throwError(prop+" property has not a value");
               applier[prop] = this.__provides.get(prop);
            } else{
            let instance = this.getInjectorOrCreate(value);
            applier[prop] = instance;
            }
        }
    }

    __resolveByInjectorRequest(obj,applier){
         Object.keys(obj).forEach((key)=>{
           let value = obj[key];
           if(value instanceof InjectRequest){
               let result  = this.getInjectorOrCreate(value.type);
              if(value.onInjected != null && typeof value.onInjected ==="function"){
                         let newResult = value.onInjected.apply(null,[result]);
                         result = newResult != null?newResult:result;
              }
              applier[key] = result;
            }
                    
        });
    }

    /**
     * resolve dependency
     * @param {Object} obj reflection object
     * @param {*} applier object to be applied 
     */
    resolve(obj,applier = null){
        if(applier == null)
            applier = obj;
        this.__resolveByDefinedProperty(obj,applier);
        this.__resolveByInjectorRequest(obj,applier);
        this.__callInjectedEvent(obj,applier);
        return obj;
    }
}

class Provides{
    constructor(){
        this.__source = [];
    }

    add(name,value){
        this.__source.push({name:name,value:value});
    }
    
    any(name){
      return this.__source.some((elem)=>elem.name == name);
    }
    
    get(name){
       let item = this.__source.find((elem)=>elem.name === name);
       if(item == null) throw new Error(name +" is not found in provides");
       return item.value;
    }
}

export const VueInjector = {
    install:function (vue,options){
       let self = this;
       this.____injectors = new Injector(options);
       vue.mixin({
           created:function(e){
               self.____injectors.resolve(this.$options,this);
           }
       })
    },
      /**
     * injects a dependency
     * @param {any} params it is type or name of dependency  
     */
    inject:function (...params){
       params.forEach((param)=>{
        this.____injectors.inject(param);
       });
       return this;
    },
    /**
     * gets dependency value
     * @param typeOrName type or name
     */
    get:function(typeOrName){
        if(typeof typeOrName === "string") return this.____provides.get(typeOrName);
        return this.____injectors.getInjectorOrCreate(typeOrName);
    },

    /**
     * resolve dependency
     * @param {Object} obj reflection object
     * @param {*} applier object to be applied 
     */
    resolve:function(obj,applier){
      this.____injectors.resolve(obj,applier);
      return obj;
    }
}

export class InjectRequest{
    constructor(type,onInjected){
      this.type = type;
      this.onInjected = onInjected;
    }
}

export function inject(type,onInjected = null){
    return new InjectRequest(type,onInjected);
}