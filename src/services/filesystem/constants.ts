import { KantuFileAccess } from "./kantu-file-access";

/**
 * Non-external method types which the user can use via UI.
 */
export const PublicMethodTypes: Array<KantuFileAccess.MethodType> = [
    KantuFileAccess.MethodType.GetFileSystemEntries,
    KantuFileAccess.MethodType.GetDirectories,
    KantuFileAccess.MethodType.GetFiles,
    KantuFileAccess.MethodType.DirectoryExists,
    KantuFileAccess.MethodType.FileExists,
    KantuFileAccess.MethodType.CreateDirectory,
    KantuFileAccess.MethodType.RemoveDirectory,
    KantuFileAccess.MethodType.CopyFile,
    KantuFileAccess.MethodType.MoveFile,
    KantuFileAccess.MethodType.DeleteFile,
    KantuFileAccess.MethodType.ReadAllText,
    KantuFileAccess.MethodType.WriteAllText,
    KantuFileAccess.MethodType.AppendAllText,
    KantuFileAccess.MethodType.ReadAllBytes,
    KantuFileAccess.MethodType.WriteAllBytes,
    KantuFileAccess.MethodType.AppendAllBytes
];

export const MethodTypeFriendlyNames: Array<string> = [
    "GetVersion",
    "GetFileSystemEntries",
    "GetDirectories",
    "GetFiles",
    "GetFileSystemEntryInfo",
    "GetSpecialFolderPath",
    "DirectoryExists",
    "FileExists",
    "CreateDirectory",
    "RemoveDirectory",
    "CopyFile",
    "MoveFile",
    "DeleteFile",
    "ReadAllText",
    "WriteAllText",
    "AppendAllText",
    "ReadAllBytes",
    "WriteAllBytes",
    "AppendAllBytes"
];

export const MethodTypeInvocationNames: Array<string> = [
    "get_version",
    "get_file_system_entries",
    "get_directories",
    "get_files",
    "get_file_system_entry_info",
    "get_special_folder_path",
    "directory_exists",
    "file_exists",
    "create_directory",
    "remove_directory",
    "copy_file",
    "move_file",
    "delete_file",
    "read_all_text",
    "write_all_text",
    "append_all_text",
    "read_all_bytes",
    "write_all_bytes",
    "append_all_bytes"
];
