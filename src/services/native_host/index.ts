/// <reference types="chrome"/>

import config from "@/config";
import debounce from "lodash.debounce";

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
  private ongoingInvocationCount = 0;
  private debouncedDisconnectOnIdle = debounce(() => {
    if (this.ongoingInvocationCount === 0) {
      this.disconnect();
    } else {
      this.debouncedDisconnectOnIdle()
    }
  }, config.nativeMessaging.idleTimeBeforeDisconnect)

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

      this.ongoingInvocationCount = Math.max(0, this.ongoingInvocationCount - 1);
      this.processResponse(response.id, response.result, response.error);

      if (response.error) {
          this.disconnect()
      }
  }

  private handleDisconnect() {
      this.disconnect();
  }

  get hostName(): string {
      return this.internalHostName;
  }

  connectAsync(): Promise<string> {
      // Commented out the following line to keep the connection to native messaging
      // to keep the service worker always alive
      // note that it only applies to Chrome 100+
      // reference: https://github.com/teamdocs/selenium-ide-chrome-light-2017/issues/884#issuecomment-1088739538
      //
      // this.debouncedDisconnectOnIdle();

      if (this.port) {
          return this.invokeAsync("get_version", undefined);
      }

      this.port = chrome.runtime.connectNative(this.hostName);
      this.port.onMessage.addListener(this.handleMessage);
      this.port.onDisconnect.addListener(this.handleDisconnect);
      this.ongoingInvocationCount = 0;

      return this.invokeAsync("get_version", undefined);
  }

  disconnect(): void {
      const message = chrome.runtime.lastError && chrome.runtime.lastError.message || "Disconnected"

      if (this.port) {
          this.port.disconnect();
          this.port = undefined;
      }

      // Discard all queued invocations
      const invocationIdArray = this.queue.map(x => x.request.id);
      for (const id of invocationIdArray) {
          this.processResponse(id, undefined, { message });
      }

      this.queue = new Array<InvocationQueueItem>();
  }

  async invoke(method: string, params: any, callback: InvocationCallback): Promise<void> {
      if (!this.port) {
          await this.connectAsync();
      }

      const id = this.nextInvocationId++;
      const item = new InvocationQueueItem(id, method, params, callback);

      this.ongoingInvocationCount++

      this.queue.push(item);
      this.port!.postMessage(item.request);

      // "Chrome 100: native messaging port keeps service worker alive"
      // reference: https://developer.chrome.com/docs/extensions/whatsnew/#m100-native-msg-lifetime
      //
      // Commented out the following line to keep the connection to native messaging
      // to keep the service worker always alive
      // note that it only applies to Chrome 100+
      // reference: https://github.com/teamdocs/selenium-ide-chrome-light-2017/issues/884#issuecomment-1088739538
      //
      // this.debouncedDisconnectOnIdle();
  }

  invokeAsync(method: string, params: any): Promise<any> {
      return new Promise((resolve, reject) => {
          this.invoke(method, params, (result, error) => {
              if (chrome.runtime.lastError) {
                error = new Error(chrome.runtime.lastError.message)
              }

              if (error) {
                  reject(error);
              } else {
                  resolve(result);
              }
          });
      });
  }
}
