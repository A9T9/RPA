import { NativeMessagingHost } from "../native_host";

export class KantuCVHost extends NativeMessagingHost {
    private static readonly HOST_NAME = "com.a9t9.kantu.cv";
    constructor() {
        super(KantuCVHost.HOST_NAME);
    }
}
