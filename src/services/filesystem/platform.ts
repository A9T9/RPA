export const WIN32 = /^Win/.test(navigator.platform);
export const ROOT_PATH = WIN32 ? "C:\\" : "/";
export const PATH_SEPARATOR = WIN32 ? "\\" : "/";
