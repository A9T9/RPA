import { TestSuite } from "@/common/convert_suite_utils";

declare function normalizeTestSuite (ts: TestSuite): Pick<Partial<TestSuite>, 'id' | 'name' | 'cases'>
