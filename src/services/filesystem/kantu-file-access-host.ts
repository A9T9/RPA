import { NativeMessagingHost } from "../native_host";

export class KantuFileAccessHost extends NativeMessagingHost {
    private static readonly HOST_NAME = "com.a9t9.kantu.file_access";
    constructor() {
        super(KantuFileAccessHost.HOST_NAME);
    }
}
