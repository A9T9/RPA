import { NativeMessagingHost } from "../native_host";

export class KantuXYHost extends NativeMessagingHost {
    private static readonly HOST_NAME = "com.a9t9.kantu.xy";
    constructor() {
        super(KantuXYHost.HOST_NAME);
    }
}
