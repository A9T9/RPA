import { Macro } from './convert_utils'

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

declare const stringifyTestSuite: (testSuite: TestSuite, testCases: Macro[], opts?: Record<string, boolean>) => string
declare const parseTestSuite: (str: string, testCases: Macro[], opts?: Record<string, boolean>) => TestSuite
