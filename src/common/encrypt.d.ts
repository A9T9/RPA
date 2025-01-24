export declare const aesEncrypt: (text: string, password: string) => string
export declare const aesDecrypt: (text: string, password: string) => string

export declare const encrypt: (text: string) => Promise<string>
export declare const decrypt: (text: string) => Promise<string>


export declare const encryptIfNeeded: (text: string, dom: any) => Promise<string>
export declare const decryptIfNeeded: (text: string, dom: any) => Promise<string>
