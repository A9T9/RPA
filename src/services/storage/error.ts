import { errorClassFactory } from "@/common/ts_utils";

// reference: https://nodejs.org/api/errors.html#errors_common_system_errors

export const EACCES = errorClassFactory('EACCES')

export const EEXIST = errorClassFactory('EEXIST')

export const EISDIR = errorClassFactory('EISDIR')

export const EMFILE = errorClassFactory('EMFILE')

export const ENOENT = errorClassFactory('ENOENT')

export const ENOTDIR = errorClassFactory('ENOTDIR')

export const ENOTEMPTY = errorClassFactory('ENOTEMPTY')
