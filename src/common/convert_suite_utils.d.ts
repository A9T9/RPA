import { Macro } from './convert_utils'
import { EntryNode } from '@/services/storage/std/standard_storage'

export type TestSuiteCase = {
  testCaseId: string;
  loops: string | number;
}

export type TestSuiteStatus = {
  doneIndices?: number[];
  errorIndices?: number[];
  currentIndex?: number;
  isPlaying?: boolean;
}

export type TestSuite  = {
  name: string;
  id?: string;
  fold?: boolean;
  cases: TestSuiteCase[];
  playStatus: TestSuiteStatus;
}

declare const stringifyTestSuite: (testSuite: TestSuite, opts?: Record<string, boolean>) => string
declare const parseTestSuite: (str: string, opts?: Record<string, any>) => TestSuite
