declare module 'isolated-vm' {
    export class Isolate {
        constructor(options?: { memoryLimit?: number });
        createContext(): Promise<Context>;
        dispose(): void;
    }

    export class Context {
        global: GlobalObject;
        eval(code: string, options?: { timeout?: number }): Promise<any>;
    }

    export class GlobalObject {
        set(key: string, value: any): Promise<void>;
        get(key: string): Promise<any>;
    }

    export class Reference<T = any> {
        constructor(value: T);
        deref(): T;
    }
}
