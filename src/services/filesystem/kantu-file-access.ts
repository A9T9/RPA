export namespace KantuFileAccess {
    export const enum MethodType {
        GetVersion,
        GetFileSystemEntries,
        GetDirectories,
        GetFiles,
        DirectoryExists,
        FileExists,
        CreateDirectory,
        RemoveDirectory,
        CopyFile,
        MoveFile,
        DeleteFile,
        ReadAllText,
        WriteAllText,
        AppendAllText,
        ReadAllBytes,
        WriteAllBytes,
        AppendAllBytes
    }

    export const enum ErrorCode {
        Succeeded,
        Failed,
        Truncated
    }

    export interface InvocationResult<T> {
        errorCode: KantuFileAccess.ErrorCode;
        data: T;
    }
}
