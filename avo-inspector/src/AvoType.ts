/* export declare module AvoType {
    abstract class Type {
        abstract getName(): string;
    }

    class Float extends Type {
        getName(): string;
    }

    class Int extends Type {
        getName(): string;
    }

    class String extends Type {
        getName(): string
    }

    class Boolean extends Type {
        getName(): string
    }
    
    class Null extends Type {
        getName(): string
    }
    
    class List extends Type {
        getName(): string
    }

    class AvoObject extends Type {
        getName(): string
    }

    class Unknown extends Type {
        getName(): string
    }
} */

export module AvoType {

    export abstract class Type {
        abstract getName(): string;
    }

    export class Float extends Type {
        getName(): string {
            return "float";
        }
    }

    export class Int extends Type {
        getName(): string {
            return "int";
        }
    }

    export class String extends Type {
        getName(): string {
            return "string";
        }
    }

    export class Boolean extends Type {
        getName(): string {
            return "boolean";
        }
    }
    
    export class Null extends Type {
        getName(): string {
            return "null";
        }
    }
    
    export class List extends Type {
        getName(): string {
            return "list";
        }
    }

    export class AvoObject extends Type {
        getName(): string {
            return "object";
        }
    }

    export class Unknown extends Type {
        getName(): string {
            return "unknown";
        }
    }
}