export namespace KantuFileAccess {
    export const enum MethodType {
      GetVersion,
      GetFileSystemEntries,
      GetDirectories,
      GetFiles,
      DirectoryExists,
      FileExists,
      GetFileSystemEntryInfo,
      GetSpecialFolderPath,
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
      AppendAllBytes,
      GetMaxFileRange,
      GetFileSize,
      ReadFileRange,
      RunProcess
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
