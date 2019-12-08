/// <reference types="chrome"/>

interface InvocationRequest {
  id: number;
  method: string;
  params: any;
}

interface InvocationResponse {
  id: number;
  result?: any;
  error?: any;
}

interface InvocationError {
  message: string;
}

export type InvocationCallback = (result: any, error?: InvocationError) => void;

class InvocationQueueItem {
  private requestObject: InvocationRequest;
  callback: InvocationCallback;

  constructor(id: number, method: string, params: any, callback: InvocationCallback) {
      this.requestObject = {
          id,
          method,
          params
      };
      this.callback = callback;
  }

  get request(): InvocationRequest {
      return this.requestObject;
  }
}

export class NativeMessagingHost {
  private readonly internalHostName: string;
  private nextInvocationId: number;
  private queue: Array<InvocationQueueItem>;
  private port?: chrome.runtime.Port;

  constructor(hostName: string) {
      this.internalHostName = hostName;
      this.nextInvocationId = 1;
      this.queue = new Array<InvocationQueueItem>();

      this.handleMessage = this.handleMessage.bind(this);
      this.handleDisconnect = this.handleDisconnect.bind(this);
  }

  private processResponse(id: number, result: any, error?: InvocationError) {
      let callback: InvocationCallback | undefined = undefined;
      for (let i = 0; i < this.queue.length; ++i) {
          const entry = this.queue[i];
          if (entry.request.id === id) {
              callback = entry.callback;
              this.queue.splice(i, 1);
              break;
          }
      }

      if (callback) {
          callback(result, error);
      }
  }

  private handleMessage(message: any) {
      const response = message as InvocationResponse;
      if (typeof response.id !== "number") {
          return;
      }

      this.processResponse(response.id, response.result, response.error);
  }

  private handleDisconnect() {
      this.disconnect();
  }

  get hostName(): string {
      return this.internalHostName;
  }

  connectAsync(): Promise<string> {
      if (this.port) {
          return this.invokeAsync("get_version", undefined);    
      }

      this.port = chrome.runtime.connectNative(this.hostName);
      this.port.onMessage.addListener(this.handleMessage);
      this.port.onDisconnect.addListener(this.handleDisconnect);

      return this.invokeAsync("get_version", undefined);
  }

  disconnect(): void {
      if (this.port) {
          this.port.disconnect();
          this.port = undefined;
      }

      // Discard all queued invocations
      const invocationIdArray = this.queue.map(x => x.request.id);
      for (const id of invocationIdArray) {
          this.processResponse(id, undefined, {
              message: "Disconnected"
          });
      }

      this.queue = new Array<InvocationQueueItem>();
  }

  invoke(method: string, params: any, callback: InvocationCallback): void {
      if (!this.port) {
          callback(undefined, {
              message: "Disconnected"
          });
          return;
      }

      const id = this.nextInvocationId++;
      const item = new InvocationQueueItem(id, method, params, callback);
      this.queue.push(item);
      this.port.postMessage(item.request);
  }

  invokeAsync(method: string, params: any): Promise<any> {
      return new Promise((resolve, reject) => {
          this.invoke(method, params, (result, error) => {
              if (error) {
                  reject(error);
              } else {
                  resolve(result);
              }
          });
      });
  }
}
